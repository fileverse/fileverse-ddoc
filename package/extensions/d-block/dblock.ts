/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { DBlockNodeView } from './dblock-node-view';
export interface DBlockOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dBlock: {
      setDBlock: (position?: number) => ReturnType;
    };
  }
}

export const DBlock = Node.create<DBlockOptions>({
  name: 'dBlock',

  priority: 1000,

  group: 'dBlock',

  content: '(block|columns)',

  draggable: true,

  selectable: false,

  inline: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="d-block"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: any }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'd-block' }),
      0,
    ];
  },

  addCommands() {
    return {
      setDBlock:
        position =>
        ({ state, chain }) => {
          const {
            selection: { from },
          } = state;

          const pos =
            position !== undefined || position !== null ? from : position;

          return chain()
            .insertContentAt(pos, {
              type: this.name,
              content: [
                {
                  type: 'paragraph',
                },
              ],
            })
            .focus(pos + 2)
            .run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-0': () => this.editor.commands.setDBlock(),
      Enter: ({ editor }) => {
        const {
          selection: { $head, from, to },
          doc,
        } = editor.state;

        const parent = $head.node($head.depth - 1);
        const currentNode = $head.node($head.depth);
        const headString = $head.toString();
        const nodePaths = headString.split('/');
        const atTheStartOfText = from + 4;

        // Check if inside table
        const isInsideTable = nodePaths.some(path => path.includes('table'));

        const isListOrTaskItem =
          parent?.type.name === 'listItem' || parent?.type.name === 'taskItem';

        const isTaskList = parent?.type.name === 'taskItem';

        if (parent?.type.name !== 'dBlock') {
          const isItemSelected = from !== to && isListOrTaskItem;
          // If a list item or task item is selected, delete it
          if (isItemSelected) {
            return editor.chain().deleteSelection().focus().run();
          }

          // If inside table, do nothing
          if (isInsideTable) {
            return false;
          }

          const isCurrentItemEmpty =
            currentNode.textContent === '' &&
            currentNode.type.name === 'paragraph' &&
            isListOrTaskItem;

          const grandParent = $head.node($head.depth - 2);

          const isLastItemOfList =
            $head.index($head.depth - 2) === grandParent.childCount - 1;
          const isInList = ['bulletList', 'orderedList', 'taskList'].includes(
            $head.node($head.depth - 2).type.name,
          );

          const isLastItemOfListWithoutContent = isLastItemOfList && isInList;
          const isMiddleItemOfListWithoutContent =
            !isLastItemOfList && isInList;
          const isMultipleListItems =
            $head.node($head.depth - 2).childCount > 1;

          if (isCurrentItemEmpty && isMultipleListItems) {
            if (isLastItemOfListWithoutContent) {
              // Handle the case when it's the last empty item in the list
              return editor
                .chain()
                .deleteNode(isTaskList ? 'taskItem' : 'listItem')
                .insertContentAt(from, {
                  type: 'dBlock',
                  content: [
                    {
                      type: 'paragraph',
                    },
                  ],
                })
                .focus()
                .run();
            } else if (isMiddleItemOfListWithoutContent) {
              // Handle the case when it's an empty middle item in the list
              return editor
                .chain()
                .deleteCurrentNode()
                .insertContentAt(from, {
                  type: isTaskList ? 'taskItem' : 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                    },
                  ],
                })
                .focus(atTheStartOfText)
                .run();
            } else {
              // Handle the case for the first empty item in the list
              return editor
                .chain()
                .liftListItem(isTaskList ? 'taskItem' : 'listItem')
                .focus()
                .run();
            }
          } else {
            return false;
          }
        }

        let currentActiveNodeTo = -1;
        let currentActiveNodeType = '';

        doc.descendants((node, pos) => {
          if (currentActiveNodeTo !== -1) return false;
          if (node.type.name === this.name) return;

          const [nodeFrom, nodeTo] = [pos, pos + node.nodeSize];

          if (nodeFrom <= from && to <= nodeTo) {
            currentActiveNodeTo = nodeTo;
            currentActiveNodeType = node.type.name;
          }

          return false;
        });

        const content = doc.slice(from, currentActiveNodeTo)?.toJSON().content;

        try {
          if (currentActiveNodeType === 'codeBlock') {
            return editor.chain().newlineInCode().focus().run();
          }

          if (['columns', 'heading'].includes(currentActiveNodeType)) {
            return editor
              .chain()
              .insertContent({
                type: 'dBlock',
                content: [
                  {
                    type: 'paragraph',
                  },
                ],
              })
              .focus(atTheStartOfText)
              .run();
          }
          return editor
            .chain()
            .insertContentAt(
              { from, to: currentActiveNodeTo },
              {
                type: this.name,
                content,
              },
            )
            .focus(atTheStartOfText)
            .run();
        } catch (error) {
          console.error(`Error inserting content into dBlock node: ${error}`);
          return false;
        }
      },
      Backspace: ({ editor }) => {
        const {
          selection: { $head, from },
        } = editor.state;

        const parent = $head.node($head.depth - 1);

        const headString = $head.toString();
        const nodePaths = headString.split('/');

        const isList = nodePaths.some(
          path =>
            path.includes('bulletList_0') ||
            path.includes('orderedList_0') ||
            path.includes('taskList_0'),
        );

        if (parent?.type.name !== 'dBlock') {
          const isFirstListItem = nodePaths.some(
            path => path.includes('listItem_0') || path.includes('taskItem_0'),
          );

          const isAtBeginFirstListItem =
            isFirstListItem &&
            nodePaths.some(path => path.includes('paragraph_0:0'));

          const isFirstDBlock = nodePaths.some(path =>
            path.includes('dBlock_0'),
          );

          const isFirstDBlockListItem =
            isFirstDBlock && isAtBeginFirstListItem && isList;

          const isFirstListItemWithoutContent =
            $head.parent.content.size === 0 &&
            nodePaths.some(path => path.includes('paragraph_0:0')) &&
            nodePaths.some(
              path =>
                path.includes('listItem_0') || path.includes('taskItem_0'),
            ) &&
            isList &&
            nodePaths.length === 4;

          const isMultipleListItems =
            $head.node($head.depth - 2).childCount > 1;

          if (isFirstListItemWithoutContent) {
            const listPos = $head.before($head.depth - 2);

            if (!isMultipleListItems) {
              return editor.chain().liftListItem('listItem').focus().run();
            } else {
              return editor
                .chain()
                .deleteRange({
                  from: listPos + 1,
                  to: listPos + 1 + parent.nodeSize,
                })
                .insertContentAt(from - 4, {
                  type: 'dBlock',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: '' }],
                    },
                  ],
                })
                .focus()
                .run();
            }
          }

          if (isFirstDBlockListItem && nodePaths.length === 4) {
            return editor
              .chain()
              .liftListItem('listItem')
              .insertContentAt(from - 4, {
                type: 'dBlock',
                content: [
                  {
                    type: 'paragraph',
                  },
                ],
              })
              .focus()
              .run();
          }
        }

        const isFirstEmptyDBlock =
          $head.toString().includes('dBlock_0') &&
          $head.parent.content.size === 0;

        if (isFirstEmptyDBlock && !isList) {
          return editor.chain().deleteNode('dBlock').focus().run();
        }

        return false;
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(DBlockNodeView);
  },
});
