/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { DBlockNodeView } from './dblock-node-view';
import { TextSelection } from '@tiptap/pm/state';

export interface DBlockOptions {
  HTMLAttributes: Record<string, any>;
  secureImageUploadUrl?: string;
  onCopyHeadingLink?: (link: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dBlock: {
      setDBlock: (position?: number) => ReturnType;
    };
  }
}

interface ListContent {
  type: string;
  content?: any[];
  attrs?: Record<string, any>;
}

interface DBlockContent {
  type: 'dBlock';
  content: ListContent[];
}

interface NestedList {
  type: string;
  content: any[];
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
      onCopyHeadingLink: undefined,
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
            // Check if there's a dBlock before this position
            const isNearestDBlock =
              from > 4 ? doc.nodeAt(from - 4)?.type.name === 'dBlock' : false;

            const grandParent = $head.node($head.depth - 2);
            const isFirstItem = $head.index($head.depth - 2) === 0;
            const isOnlyItem = grandParent.childCount === 1;

            // Check for nested list content inside this item
            const hasNestedList = node.content.content.some(
              (content: any) =>
                content.type.name === 'bulletList' ||
                content.type.name === 'orderedList' ||
                content.type.name === 'taskList',
            );

            // Check if this is the first list in the first dBlock
            const isFirstDBlock = from <= 4;
            const isFirstList = isFirstItem && isFirstDBlock;

            // Helper function to restructure the list with nested content
            const restructureWithNestedContent = () => {
              // Get the list node and its content
              const listNode = $head.node($head.depth - 2);
              const listPos = $head.before($head.depth - 2);
              const listEnd = listPos + listNode.nodeSize;

              // Process remaining list items
              if (listNode.content && listNode.content.size > 0) {
                const firstItem = listNode.content.firstChild;
                const remainingContent: DBlockContent[] = [];

                // If first item has nested lists, lift them up
                if (firstItem) {
                  const firstItemContent = firstItem.content?.toJSON() || [];

                  // Extract text content from the first item
                  const nonListContent = firstItemContent.filter(
                    (content: any) =>
                      !['bulletList', 'orderedList', 'taskList'].includes(
                        content.type,
                      ),
                  );

                  // Create new dBlock with first item's text content
                  remainingContent.push({
                    type: 'dBlock',
                    content:
                      nonListContent.length > 0
                        ? nonListContent
                        : [
                            {
                              type: 'paragraph',
                            },
                          ],
                  });

                  const nestedLists = firstItemContent.filter(
                    (content: NestedList) =>
                      ['bulletList', 'orderedList', 'taskList'].includes(
                        content.type,
                      ),
                  );

                  if (nestedLists && nestedLists.length > 0) {
                    // Add lifted nested lists
                    nestedLists.forEach((nestedList: NestedList) => {
                      remainingContent.push({
                        type: 'dBlock',
                        content: [nestedList],
                      });
                    });
                  }

                  // Add remaining list items if they exist
                  if (listNode.content.size > 1) {
                    const remainingListContent = listNode.content
                      .toJSON()
                      .slice(1);
                    // Only add if there are actual remaining items
                    if (remainingListContent.length > 0) {
                      remainingContent.push({
                        type: 'dBlock',
                        content: [
                          {
                            type: listNode.type.name,
                            content: remainingListContent,
                          },
                        ],
                      });
                    }
                  }
                }

                // Replace the content and move cursor to new dBlock
                return editor
                  .chain()
                  .command(({ tr, dispatch }) => {
                    if (dispatch) {
                      // Replace the list with remaining content
                      tr.replaceWith(
                        listPos,
                        listEnd,
                        editor.schema.nodeFromJSON({
                          type: 'doc',
                          content: remainingContent,
                        }),
                      );

                      // Move cursor to end of first paragraph
                      const paragraphPos = listPos + 4;
                      tr.setSelection(
                        TextSelection.create(tr.doc, paragraphPos),
                      );
                    }
                    return false;
                  })
                  .run();
              }

              return false;
            };

            // Helper function to find previous table
            // const isPreviousNodeTable = () => {
            //   // Get the position of the list
            //   const listPos = $head.before($head.depth - 2);
            //   let tablePos = -1;

            //   // Find the last table before our list position
            //   doc.nodesBetween(0, listPos, (node, pos) => {
            //     if (node.type.name === 'table') {
            //       tablePos = pos;
            //     }
            //     return true;
            //   });

            //   // Check if the table is directly before our list
            //   if (tablePos === -1) return false;

            //   const tableNode = doc.nodeAt(tablePos);
            //   return tablePos + (tableNode?.nodeSize ?? 0) + 2 === listPos;
            // };

            // If we're at the first list in the first dBlock, create empty dBlock and lift nested lists
            if (isFirstList && from === 4) {
              return restructureWithNestedContent();
            }

            // CASE 1: Empty node with nested list
            if (isNodeEmpty && hasNestedList) {
              return restructureWithNestedContent();
            }

            // CASE 2: Empty first item (no nested list)
            if (isNodeEmpty && isFirstItem && !hasNestedList) {
              if (isOnlyItem) {
                // If it's the only item in the list and we're near a dBlock
                if (isNearestDBlock) {
                  return restructureWithNestedContent();
                }
                // Just lift the list item to remove the list
                return editor
                  .chain()
                  .liftListItem(isTaskList ? 'taskItem' : 'listItem')
                  .focus()
                  .run();
              }

              // Not the only item, delete this item and reorder the list
              return editor
                .chain()
                .deleteNode(isTaskList ? 'taskItem' : 'listItem')
                .focus()
                .run();
            }

            // CASE 3: Empty non-first item
            if (isNodeEmpty && !isFirstItem) {
              if (hasNestedList) {
                return restructureWithNestedContent();
              }

              // Just join text backward for empty non-first items
              return editor
                .chain()
                .liftListItem(isTaskList ? 'taskItem' : 'listItem')
                .focus()
                .run();
            }

            // CASE 4: At start of non-empty item
            if (isAtStartOfNode) {
              if (isFirstItem) {
                // // Check for table before the list
                // if (isPreviousNodeTable()) {
                //   // Prevent joining with table
                //   return true;
                // }

                if (isNearestDBlock) {
                  return restructureWithNestedContent();
                }
              }

              // Default handling for other cases
              return false;
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
