/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
import cn from 'classnames';
import { DynamicDropdown, LucideIcon } from '@fileverse/ui';
import { BubbleMenuItem, NodeSelectorProps } from './types';
import { EditorState, Transaction } from 'prosemirror-state';
import { Dispatch } from '@tiptap/react';
import { Node } from 'prosemirror-model';
import { checkActiveListsAndDBlocks } from '../editor-utils';

// Types
interface ListConfig {
  type: 'bulletList' | 'orderedList' | 'taskList';
  itemType: 'listItem' | 'taskItem';
  hasAttrs?: boolean;
}

type ListConversionProps = {
  tr: Transaction;
  dispatch: Dispatch;
  state: EditorState;
  from: number;
  to: number;
  listConfig?: ListConfig;
};

// Utility functions
const processListContent = (node: any, isInsideCallout = false): any[] => {
  // Base case: if node has no content or is not a list item
  if (!node.content || !Array.isArray(node.content)) {
    return [];
  }

  // Helper function to create indented paragraph or plain paragraph if inside a callout
  const createIndentedParagraph = (content: any, level: number) => {
    const paragraphNode = {
      type: 'paragraph',
      ...(isInsideCallout ? {} : { attrs: { indent: level } }), // Add indent only if not in callout
      content: content,
    };

    // If inside a callout, return plain paragraph
    if (isInsideCallout) {
      return paragraphNode;
    }

    // Otherwise, wrap paragraph in a dBlock
    return {
      type: 'dBlock',
      content: [paragraphNode],
    };
  };

  // Helper function to process list items recursively
  const processListItem = (item: any, level: number = 0): any[] => {
    const result = [];

    // Process the main paragraph content with indentation
    if (item.content?.[0]?.content) {
      result.push(createIndentedParagraph(item.content[0].content, level));
    }

    // Process nested lists recursively with increased indentation
    item.content?.slice(1)?.forEach((nestedNode: any) => {
      if (['bulletList', 'orderedList', 'taskList'].includes(nestedNode.type)) {
        nestedNode.content.forEach((nestedItem: any) => {
          result.push(...processListItem(nestedItem, level + 1));
        });
      }
    });

    return result;
  };

  // Process each list item with initial indentation level
  return node.content.flatMap((item: any) => processListItem(item, 0));
};

export const convertListToParagraphs = ({
  tr,
  dispatch,
  state,
  from,
  to,
}: ListConversionProps) => {
  if (!dispatch) return true;

  let containerPos = -1;
  let listContent: Node | null = null as unknown as Node;
  let isInsideCallout = false;
  let calloutNode: Node | null = null as unknown as Node;

  // Traverse the doc to find the list and its container (either callout or dBlock)
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name === 'callout') {
      isInsideCallout = true;
      containerPos = pos;
      calloutNode = node;
    }

    if (!isInsideCallout && node.type.name === 'dBlock') {
      containerPos = pos;
    }

    if (
      node.type.name === 'bulletList' ||
      node.type.name === 'orderedList' ||
      node.type.name === 'taskList'
    ) {
      listContent = node;
      return false; // stop traversal after finding list
    }
  });

  if (containerPos === -1 || !listContent) return false;

  const newContent = processListContent(listContent.toJSON(), isInsideCallout);

  if (isInsideCallout && calloutNode) {
    // Replace list *inside* callout with new paragraphs
    const updatedCallout = state.schema.nodes.callout.create(
      calloutNode.attrs,
      newContent.map((json) => state.schema.nodeFromJSON(json)),
    );

    tr.replaceWith(
      containerPos,
      containerPos + calloutNode.nodeSize,
      updatedCallout,
    );
  } else {
    // Normal dBlock replacement
    const fragment = state.schema.nodeFromJSON({
      type: 'doc',
      content: newContent,
    }).content;

    tr.replaceWith(
      containerPos,
      containerPos + state.doc.nodeAt(containerPos)!.nodeSize,
      fragment,
    );
  }

  return true;
};

export const convertToList = ({
  tr,
  dispatch,
  state,
  from,
  to,
  listConfig,
}: ListConversionProps) => {
  if (!dispatch) return true;

  // Track the position and node of the parent container (either dBlock or callout)
  let containerPos = -1;
  let containerNode: Node | null = null as unknown as Node;

  // Track the list node (if already present) and whether we're inside a callout
  let listContent: Node | null = null as unknown as Node;
  let isInsideCallout = false;

  // Collect paragraphs/headings that need to be turned into list items
  const paragraphs: Node[] = [];

  // Traverse the selected range to identify context and relevant nodes
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name === 'callout') {
      isInsideCallout = true;
      containerPos = pos;
      containerNode = node;
    }

    if (!isInsideCallout && node.type.name === 'dBlock') {
      containerPos = pos;
      containerNode = node;
    }

    if (
      node.type.name === 'bulletList' ||
      node.type.name === 'orderedList' ||
      node.type.name === 'taskList'
    ) {
      listContent = node;
      return false;
    }

    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      const para =
        node.type.name === 'heading'
          ? state.schema.nodes.paragraph.create(null, node.content)
          : node;
      paragraphs.push(para);
    }
  });

  if (containerPos === -1 || !containerNode) return false;
  if (!listConfig?.type || !listConfig?.itemType) return false;

  let newListContent;

  if (listContent) {
    const listJSON = listContent.toJSON();

    // Recursively convert nested list items to the new list type
    const convertListItems = (items: any[]): any[] =>
      items.map((item) => {
        const newItem: {
          type: string;
          attrs?: { checked: boolean };
          content: any[];
        } = {
          type: listConfig.itemType,
          ...(listConfig.hasAttrs ? { attrs: { checked: false } } : {}),
          content: [],
        };

        item.content.forEach((contentItem: any) => {
          if (contentItem.type === 'paragraph') {
            newItem.content.push(contentItem);
          } else if (
            ['bulletList', 'orderedList', 'taskList'].includes(contentItem.type)
          ) {
            // Recursively convert nested lists
            newItem.content.push({
              type: listConfig.type,
              content: convertListItems(contentItem.content),
            });
          } else {
            newItem.content.push(contentItem);
          }
        });

        return newItem;
      });

    newListContent = {
      type: listConfig.type,
      content: convertListItems(listJSON.content),
    };
  } else if (paragraphs.length > 0) {
    // Convert plain paragraphs/headings into list items
    newListContent = {
      type: listConfig.type,
      content: paragraphs.map((para) => ({
        type: listConfig.itemType,
        ...(listConfig.hasAttrs ? { attrs: { checked: false } } : {}),
        content: [para.toJSON()],
      })),
    };
  } else {
    return false;
  }

  // Replace the container content with new list
  if (isInsideCallout && containerNode.type.name === 'callout') {
    // If we are inside a callout block, replace its content with the list (no dBlock wrapping)
    const updatedCallout = state.schema.nodes.callout.create(
      containerNode.attrs,
      [state.schema.nodeFromJSON(newListContent)],
    );

    tr.replaceWith(
      containerPos,
      containerPos + containerNode.nodeSize,
      updatedCallout,
    );
  } else if (containerNode.type.name === 'dBlock') {
    // If inside a dBlock, recreate the dBlock wrapping the new list
    const updatedDblock = state.schema.nodes.dBlock.create(
      containerNode.attrs,
      [state.schema.nodeFromJSON(newListContent)],
    );

    tr.replaceWith(
      containerPos,
      containerPos + containerNode.nodeSize,
      updatedDblock,
    );
  } else {
    // Fallback
    tr.replaceWith(
      containerPos,
      containerPos + containerNode.nodeSize,
      state.schema.nodeFromJSON(newListContent),
    );
  }

  return true;
};

export const NodeSelector = ({ editor, elementRef }: NodeSelectorProps) => {
  const items: BubbleMenuItem[] = [
    {
      name: 'Text',
      icon: 'Type',
      command: () => {
        const { from, to, state, hasMultipleLists } =
          checkActiveListsAndDBlocks(editor);

        if (hasMultipleLists) {
          return;
        }

        // If it's already a list type, convert to paragraphs
        if (
          editor.isActive('bulletList') ||
          editor.isActive('orderedList') ||
          editor.isActive('taskList')
        ) {
          return editor
            .chain()
            .focus()
            .command((props) =>
              convertListToParagraphs({ ...props, state, from, to }),
            )
            .setTextSelection({ from, to })
            .focus()
            .run();
        }

        // Otherwise use the default paragraph toggle
        return editor
          .chain()
          .focus()
          .toggleNode('paragraph', 'paragraph')
          .setTextSelection({ from, to })
          .focus()
          .run();
      },
      isActive: () =>
        editor.isActive('paragraph') &&
        !editor.isActive('bulletList') &&
        !editor.isActive('orderedList') &&
        !editor.isActive('taskList'),
    },
    {
      name: 'Heading 1',
      icon: 'Heading1',
      command: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive('heading', { level: 1 }),
    },
    {
      name: 'Heading 2',
      icon: 'Heading2',
      command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
    {
      name: 'Heading 3',
      icon: 'Heading3',
      command: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive('heading', { level: 3 }),
    },
    {
      name: 'To-do List',
      icon: 'ListChecks',
      command: () => {
        const { from, to, state, hasMultipleLists } =
          checkActiveListsAndDBlocks(editor);

        if (hasMultipleLists) {
          return;
        }

        if (editor.isActive('taskList')) {
          return editor
            .chain()
            .focus()
            .command((props) =>
              convertListToParagraphs({ ...props, state, from, to }),
            )
            .setTextSelection({ from, to })
            .focus()
            .run();
        }

        return editor
          .chain()
          .focus()
          .command((props) =>
            convertToList({
              ...props,
              state,
              from,
              to,
              listConfig: {
                type: 'taskList',
                itemType: 'taskItem',
                hasAttrs: true,
              },
            }),
          )
          .setTextSelection({ from, to })
          .focus()
          .run();
      },
      isActive: () => editor.isActive('taskItem'),
    },
    {
      name: 'Bullet List',
      icon: 'ListOrdered',
      command: () => {
        const { from, to, state, hasMultipleLists } =
          checkActiveListsAndDBlocks(editor);

        if (hasMultipleLists) {
          return;
        }

        if (editor.isActive('bulletList')) {
          return editor
            .chain()
            .focus()
            .command((props) =>
              convertListToParagraphs({ ...props, state, from, to }),
            )
            .setTextSelection({ from, to })
            .focus()
            .run();
        }

        return editor
          .chain()
          .focus()
          .command((props) =>
            convertToList({
              ...props,
              state,
              from,
              to,
              listConfig: {
                type: 'bulletList',
                itemType: 'listItem',
              },
            }),
          )
          .setTextSelection({ from, to })
          .focus()
          .run();
      },
      isActive: () => editor.isActive('bulletList'),
    },
    {
      name: 'Numbered List',
      icon: 'ListOrdered',
      command: () => {
        const { from, to, state, hasMultipleLists } =
          checkActiveListsAndDBlocks(editor);

        if (hasMultipleLists) {
          return;
        }

        if (editor.isActive('orderedList')) {
          return editor
            .chain()
            .focus()
            .command((props) =>
              convertListToParagraphs({ ...props, state, from, to }),
            )
            .setTextSelection({ from, to })
            .focus()
            .run();
        }

        return editor
          .chain()
          .focus()
          .command((props) =>
            convertToList({
              ...props,
              state,
              from,
              to,
              listConfig: {
                type: 'orderedList',
                itemType: 'listItem',
              },
            }),
          )
          .setTextSelection({ from, to })
          .focus()
          .run();
      },
      isActive: () => editor.isActive('orderedList'),
    },
    {
      name: 'Quote',
      icon: 'TextQuote',
      command: () =>
        editor
          .chain()
          .focus()
          .toggleNode('paragraph', 'paragraph')
          .toggleBlockquote()
          .run(),
      isActive: () => editor.isActive('blockquote'),
    },
    {
      name: 'Code Block',
      icon: 'Braces',
      command: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive('codeBlock'),
    },
  ];

  const activeItem = items.filter((item) => item.isActive()).pop() ?? {
    name: 'Multiple',
  };

  return (
    <DynamicDropdown
      key="NodeSelector"
      sideOffset={15}
      anchorTrigger={
        <button className="bg-transparent hover:!color-bg-default-hover color-text-default rounded p-1 flex items-center justify-between gap-2 w-fit max-w-36">
          <span className="text-body-sm truncate">{activeItem.name}</span>
          <LucideIcon name="ChevronDown" size="sm" className="mt-1" />
        </button>
      }
      className="shadow-elevation-3"
      content={
        <div
          ref={elementRef}
          className="h-auto flex w-48 flex-col gap-1 overflow-hidden rounded color-bg-default p-1 color-text-default transition-all"
        >
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.command();
              }}
              className={cn(
                'flex items-center justify-between rounded-sm px-2 py-1 text-body-sm hover:color-bg-default-hover transition-all',
                {
                  'color-bg-brand hover:color-bg-brand-hover dark:text-[#363B3F]':
                    item.isActive(),
                },
              )}
            >
              <div className="flex items-center space-x-2">
                <div className="rounded color-bg-default color-text-default p-1">
                  <LucideIcon name={item.icon} size="sm" />
                </div>
                <span>{item.name}</span>
              </div>
              {activeItem.name === item.name && (
                <LucideIcon name="Check" size="sm" />
              )}
            </button>
          ))}
        </div>
      }
    />
  );
};
