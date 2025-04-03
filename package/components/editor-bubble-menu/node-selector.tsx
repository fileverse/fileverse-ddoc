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
const processListContent = (node: any): any[] => {
  // Base case: if node has no content or is not a list item
  if (!node.content || !Array.isArray(node.content)) {
    return [];
  }

  // Helper function to create indented paragraph
  const createIndentedParagraph = (content: any, level: number) => ({
    type: 'dBlock',
    content: [
      {
        type: 'paragraph',
        attrs: { indent: level }, // Add indentation level
        content: content,
      },
    ],
  });

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

  let dBlockPos = -1;
  let listContent = null;

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name === 'dBlock') {
      dBlockPos = pos;
    }
    if (
      node.type.name === 'bulletList' ||
      node.type.name === 'orderedList' ||
      node.type.name === 'taskList'
    ) {
      listContent = node;
      return false;
    }
  });

  if (dBlockPos === -1 || !listContent) return false;

  const dBlocks = processListContent((listContent as Node).toJSON());

  const fragment = state.schema.nodeFromJSON({
    type: 'doc',
    content: dBlocks,
  }).content;

  tr.replaceWith(
    dBlockPos,
    dBlockPos + state.doc.nodeAt(dBlockPos)!.nodeSize,
    fragment,
  );
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

  let firstDBlockPos = -1;
  let lastDBlockPos = -1;
  let listContent = null;
  const paragraphs: any[] = [];

  state.doc.nodesBetween(from, to, (node: Node, pos: number) => {
    if (node.type.name === 'dBlock') {
      if (firstDBlockPos === -1) firstDBlockPos = pos;
      lastDBlockPos = pos + node.nodeSize;
    }
    if (
      node.type.name === 'taskList' ||
      node.type.name === 'bulletList' ||
      node.type.name === 'orderedList'
    ) {
      listContent = node;
      return false;
    }
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      // Convert heading to paragraph if it's a heading
      if (node.type.name === 'heading') {
        const paragraph = state.schema.nodes.paragraph.create(
          null,
          node.content,
        );
        paragraphs.push(paragraph);
      } else {
        paragraphs.push(node);
      }
    }
  });

  if (firstDBlockPos === -1) return false;

  let newList;
  if (listContent) {
    // Converting from one list type to another
    const listJSON = (listContent as Node).toJSON();

    if (!listConfig?.type || !listConfig?.itemType) return false;

    // Helper function to recursively convert list items and their nested lists
    const convertListItems = (items: any[]): any[] => {
      return items.map((item) => {
        const newItem: {
          type: string;
          attrs?: { checked: boolean };
          content: any[];
        } = {
          type: listConfig.itemType,
          ...(listConfig.hasAttrs ? { attrs: { checked: false } } : {}),
          content: [],
        };

        // Process each content item
        item.content.forEach((contentItem: any) => {
          if (contentItem.type === 'paragraph') {
            newItem.content.push(contentItem);
          } else if (
            ['bulletList', 'orderedList', 'taskList'].includes(contentItem.type)
          ) {
            // Convert nested list
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
    };

    newList = {
      type: 'dBlock',
      content: [
        {
          type: listConfig.type,
          content: convertListItems(listJSON.content),
        },
      ],
    };
  } else if (paragraphs.length > 0) {
    // Converting from paragraphs to list
    newList = {
      type: 'dBlock',
      content: [
        {
          type: listConfig?.type,
          content: paragraphs.map((para) => ({
            type: listConfig?.itemType,
            ...(listConfig?.hasAttrs ? { attrs: { checked: false } } : {}),
            content: [para.toJSON()],
          })),
        },
      ],
    };
  } else {
    return false;
  }

  tr.replaceWith(
    firstDBlockPos,
    lastDBlockPos,
    state.schema.nodeFromJSON(newList),
  );
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
