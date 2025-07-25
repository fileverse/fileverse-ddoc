/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dispatch, Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { DBlockNodeView } from './dblock-node-view';
import { TextSelection, Transaction } from '@tiptap/pm/state';
import { IpfsImageUploadResponse } from '../../types';
import { Plugin, PluginKey } from 'prosemirror-state';

export interface DBlockOptions {
  HTMLAttributes: Record<string, any>;
  ipfsImageUploadFn?: (file: File) => Promise<IpfsImageUploadResponse>;
  onCopyHeadingLink?: (link: string) => void;
  hasAvailableModels: boolean;
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
      onCopyHeadingLink: undefined,
      hasAvailableModels: false,
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
        const attrs = editor.getAttributes('textStyle');

        // Get the current node and its parent
        const currentNode = $head.node($head.depth);
        const parent = $head.node($head.depth - 1);
        const headString = $head.toString();
        const nodePaths = headString.split('/');
        const isAtEndOfTheNode = $head.end() === from;
        const isAtStartOfTheNode = $head.start() === from;

        // Check if inside table
        const isInsideTable = nodePaths.some((path) => path.includes('table'));

        // Handle lists press enter action
        if (
          parent?.type.name === 'listItem' ||
          parent?.type.name === 'taskItem'
        ) {
          const isCurrentItemEmpty = currentNode.textContent === '';
          const grandParent = $head.node($head.depth - 2);
          const currentIndex = $head.index($head.depth - 2);
          const isLastItem = currentIndex === grandParent.childCount - 1;

          // 🛡️ Check nesting depth: only allow this on top-level lists
          let listDepth = 0;
          for (let d = $head.depth - 1; d >= 0; d--) {
            const node = $head.node(d);
            if (
              node?.type.name === 'listItem' ||
              node?.type.name === 'taskItem'
            ) {
              listDepth++;
            }
          }

          const isTopLevelList = listDepth === 1;

          // Handle deleting the last item of the first list if it's empty
          if (isCurrentItemEmpty && isLastItem && isTopLevelList) {
            const listNode = $head.node($head.depth - 2);
            const currentItem = listNode.child(currentIndex);
            const currentItemStart = $head.before($head.depth - 1);
            const currentItemEnd = currentItemStart + currentItem.nodeSize;

            return editor
              .chain()
              .deleteRange({ from: currentItemStart, to: currentItemEnd })
              .setDBlock()
              .focus(currentItemStart + 4)
              .setMark('textStyle', attrs)
              .run();
          }
          //Handle splitting the list in the middle
          if (
            isCurrentItemEmpty &&
            isTopLevelList &&
            grandParent.childCount > 1 &&
            !isLastItem
          ) {
            const listNode = $head.node($head.depth - 2);
            const listPos = $head.before($head.depth - 2);
            const listEnd = listPos + listNode.nodeSize;

            const remainingItems = listNode.content
              .toJSON()
              .slice(currentIndex + 1);

            const remainingContent: DBlockContent[] = [];

            // Insert empty dBlock
            remainingContent.push({
              type: 'dBlock',
              content: [
                {
                  type: 'paragraph',
                },
              ],
            });

            if (remainingItems.length > 0) {
              remainingContent.push({
                type: 'dBlock',
                content: [
                  {
                    type: grandParent.type.name,
                    content: remainingItems,
                  },
                ],
              });
            }

            return editor
              .chain()
              .command(({ tr, dispatch }) => {
                if (dispatch) {
                  // Replace everything from current item to end of list
                  const currentItemStart = $head.before($head.depth - 1);
                  tr.replaceWith(
                    currentItemStart,
                    listEnd,
                    editor.schema.nodeFromJSON({
                      type: 'doc',
                      content: remainingContent,
                    }),
                  );

                  const paragraphPos = currentItemStart + 4;
                  tr.setSelection(TextSelection.create(tr.doc, paragraphPos));
                }
                return false;
              })
              .focus()
              .setMark('textStyle', attrs)
              .run();
          }
          //nested lists are handled by tiptap's default list behavior
        }

        // Handle blockquote
        if (
          parent?.type.name === 'blockquote' &&
          currentNode.type.name === 'paragraph'
        ) {
          if (currentNode.textContent === '') {
            return editor
              .chain()
              .setDBlock()
              .focus(from + 4)
              .setMark('textStyle', attrs)
              .run();
          }
        }

        if (parent?.type.name !== 'dBlock') {
          // If inside table, do nothing
          if (isInsideTable) {
            return false;
          }
        }

        // Handle dBlock content
        if (parent?.type.name === 'dBlock') {
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

          const content = doc
            .slice(from, currentActiveNodeTo)
            ?.toJSON().content;

          try {
            if (currentActiveNodeType === 'codeBlock') {
              return editor
                .chain()
                .newlineInCode()
                .setMark('textStyle', attrs)
                .focus()
                .run();
            }

            if (
              ['columns', 'heading'].includes(currentActiveNodeType) &&
              isAtEndOfTheNode
            ) {
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
                .focus(from + 4)
                .setMark('textStyle', attrs)
                .run();
            } else if (
              currentActiveNodeType === 'columns' ||
              (currentActiveNodeType === 'heading' && !isAtStartOfTheNode)
            ) {
              return editor
                .chain()
                .command(
                  ({
                    tr,
                    dispatch,
                  }: {
                    tr: Transaction;
                    dispatch: Dispatch;
                  }) => {
                    if (dispatch) {
                      tr.insertText('\n');
                    }
                    return true;
                  },
                )
                .focus(from)
                .setMark('textStyle', attrs)
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
              .focus(from + 4)
              .setMark('textStyle', attrs)
              .run();
          } catch (error) {
            console.error(`Error inserting content into dBlock node: ${error}`);
            return false;
          }
        }

        return false;
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

        const isListOrTaskList =
          parent?.type.name === 'listItem' || parent?.type.name === 'taskItem';
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
            const isLastItem =
              $head.index($head.depth - 2) === grandParent.childCount - 1;

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

                return false;
              }

              return false;
            }

            // CASE 3: Empty non-first item
            if (isNodeEmpty && !isFirstItem) {
              if (hasNestedList) {
                return restructureWithNestedContent();
              }

              // Just join text backward for empty non-first items
              return false;
            }

            // CASE 4: At start of non-empty item
            if (isAtStartOfNode) {
              if (isFirstItem) {
                if (isNearestDBlock) {
                  return restructureWithNestedContent();
                }
              }

              // Default handling for other cases
              return false;
            }

            // CASE 5: At end of list with empty content and no nested lists
            if (isLastItem && isNodeEmpty && !hasNestedList) {
              return restructureWithNestedContent();
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

  addProseMirrorPlugins() {
    if (!this.options.hasAvailableModels) {
      return [];
    }
    return [
      new Plugin({
        key: new PluginKey('dblock-aiwriter-space'),
        props: {
          handleTextInput: (view, from, _to, text) => {
            // Only interested in single space
            if (text !== ' ') return false;

            // Check if there's already an active AI Writer
            let hasActiveAIWriter = false;
            view.state.doc.descendants((node) => {
              if (node.type.name === 'aiWriter') {
                hasActiveAIWriter = true;
                return false;
              }
              return true;
            });

            if (hasActiveAIWriter) {
              return false;
            }

            const { state, dispatch } = view;
            const { $from } = state.selection;
            const parent = $from.node($from.depth - 1);
            const node = $from.node($from.depth);
            // Only trigger in dBlock > paragraph, and only if paragraph is empty
            if (
              parent?.type?.name === 'dBlock' &&
              node?.type?.name === 'paragraph' &&
              node.textContent === ''
            ) {
              // Check if previous char is also a space (double space)
              const prevChar = state.doc.textBetween(from - 1, from, '\0');
              if (prevChar === ' ') {
                // Allow double space as normal
                return false;
              }
              // Replace the empty paragraph with aiWriter node
              const aiWriterNode = state.schema.nodes.aiWriter.create({
                prompt: '',
                content: '',
                tone: 'neutral',
              });
              const tr = state.tr.replaceRangeWith(
                $from.before(),
                $from.after(),
                aiWriterNode,
              );
              dispatch(tr);
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});
