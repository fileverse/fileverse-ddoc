/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { DBlockNodeView } from './dblock-node-view';
export interface DBlockOptions {
  HTMLAttributes: Record<string, any>;
  secureImageUploadUrl?: string;
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
      secureImageUploadUrl: '',
    };
  },

  addAttributes() {
    return {
      isCorrupted: {
        default: false,
      },
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
        (position) =>
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
        const isInsideTable = nodePaths.some((path) => path.includes('table'));

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
          selection: { $head, from, to },
          doc,
        } = editor.state;

        // Handle selection deletion first
        if (from !== to) {
          if (from <= 2) {
            return false;
          }
          return editor.chain().deleteSelection().focus().run();
        }

        const parent = $head.node($head.depth - 1);
        const node = $head.node($head.depth);
        const nodeStartPos = $head.start();
        const isAtStartOfNode = nodeStartPos === from;
        const isAtTheStartOfDocument = from === 2;

        // Handle start of document
        if (isAtTheStartOfDocument && from === to) {
          return editor.chain().deleteNode(this.name).focus().run();
        }

        const isListOrTaskList =
          parent?.type.name === 'listItem' || parent?.type.name === 'taskItem';
        const isTaskList = parent?.type.name === 'taskItem';
        const isNodeEmpty = node?.textContent === '';

        // If not in a dBlock, handle special cases
        if (parent?.type.name !== 'dBlock') {
          // Handle page break
          let isPrevNodePageBreak = false;
          let currentNodePos = -1;

          doc.descendants((node, pos) => {
            if (currentNodePos !== -1) return false;
            if (node.type.name === 'pageBreak' && pos < from) {
              isPrevNodePageBreak = true;
              currentNodePos = pos;
            }
          });

          if (
            isPrevNodePageBreak &&
            isNodeEmpty &&
            from === currentNodePos + 2
          ) {
            return true;
          }

          // Handle list items
          if (isAtStartOfNode && isListOrTaskList) {
            const isNearestDBlock =
              from > 4 ? doc.nodeAt(from - 4)?.type.name === 'dBlock' : false;
            const grandParent = $head.node($head.depth - 2);
            const isFirstItem = $head.index($head.depth - 2) === 0;
            const hasNestedList = node.content.content.length > 1;
            const isOnlyItem = grandParent.childCount === 1;

            // Helper function to merge nested content with parent list
            const mergeNestedContent = (listNode: any) => {
              const json = listNode.toJSON();
              if (!json.content || !json.content.length) return json;

              const firstItem = json.content[0];
              if (!firstItem.content || firstItem.content.length <= 1)
                return json;

              // Get the nested list from the first item
              const nestedLists = firstItem.content.filter((content: any) =>
                ['bulletList', 'orderedList', 'taskList'].includes(
                  content.type,
                ),
              );

              if (nestedLists.length === 0) return json;

              // Merge the nested list items with the parent list
              const nestedItems = nestedLists[0].content || [];
              return {
                type: json.type,
                attrs: json.attrs,
                content: [
                  // Keep any non-empty content from the first item
                  ...(firstItem.content[0].content
                    ? [
                        {
                          type: 'listItem',
                          content: [firstItem.content[0]],
                        },
                      ]
                    : []),
                  ...nestedItems,
                  ...json.content.slice(1),
                ],
              };
            };

            // Case 1: Empty item with nested content
            if (isNodeEmpty && hasNestedList) {
              const listNode = $head.node($head.depth - 2);
              const restructuredContent = mergeNestedContent(listNode);

              return editor
                .chain()
                .command(({ tr, dispatch }) => {
                  if (dispatch) {
                    const pos = $head.before($head.depth - 2);
                    const end = pos + listNode.nodeSize;
                    tr.replaceWith(
                      pos,
                      end,
                      editor.schema.nodeFromJSON(restructuredContent),
                    );
                  }
                  return true;
                })
                .focus()
                .run();
            }

            // Case 2: Empty first item without nested content
            if (isNodeEmpty && isFirstItem) {
              if (isOnlyItem) {
                // If it's the only item and we're next to a dBlock
                if (isNearestDBlock) {
                  return editor.commands.deleteNode(this.name);
                }
                // Otherwise just remove the list but preserve any nested content
                return editor
                  .chain()
                  .command(({ tr, dispatch }) => {
                    if (dispatch) {
                      const pos = $head.before($head.depth - 2);
                      const end = pos + grandParent.nodeSize;
                      tr.delete(pos, end);
                    }
                    return true;
                  })
                  .focus()
                  .run();
              }
              // If there are other items, just delete this one and maintain list
              return editor
                .chain()
                .deleteNode(isTaskList ? 'taskItem' : 'listItem')
                .focus()
                .run();
            }

            // Case 3: Empty non-first item
            if (isNodeEmpty && !isFirstItem) {
              if (hasNestedList) {
                // Preserve nested content when lifting
                const listNode = $head.node($head.depth - 2);
                const restructuredContent = mergeNestedContent(listNode);

                return editor
                  .chain()
                  .command(({ tr, dispatch }) => {
                    if (dispatch) {
                      const pos = $head.before($head.depth - 2);
                      const end = pos + listNode.nodeSize;
                      tr.replaceWith(
                        pos,
                        end,
                        editor.schema.nodeFromJSON(restructuredContent),
                      );
                    }
                    return true;
                  })
                  .focus()
                  .run();
              }
              return editor
                .chain()
                .liftListItem(isTaskList ? 'taskItem' : 'listItem')
                .focus()
                .run();
            }

            // Case 4: Non-empty item at start
            if (isAtStartOfNode) {
              if (isFirstItem && isNearestDBlock) {
                // Join with previous block if possible
                return editor.commands.joinTextblockBackward();
              } else {
                // Handle normal list item joining while preserving nested structure
                return editor.commands.liftListItem(
                  isTaskList ? 'taskItem' : 'listItem',
                );
              }
            }
          }
        }

        return false;
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(DBlockNodeView as any);
  },
});
