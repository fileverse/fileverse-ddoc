/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { DBlockNodeView } from './dblock-node-view';
import React from 'react';
export interface DBlockOptions {
  zoomLevel: string;
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
      zoomLevel: '',
      HTMLAttributes: {},
      secureImageUploadUrl: '',
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="d-block"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: any }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'd-block', 'data-zoom-level': this.options.zoomLevel }),
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
          // Check if we're at the start of the document
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

        if (isAtTheStartOfDocument && from === to) {
          return editor.chain().deleteNode(this.name).focus().run();
        }

        const isListOrTaskList =
          parent?.type.name === 'listItem' || parent?.type.name === 'taskItem';

        const isTaskList = parent?.type.name === 'taskItem';

        const isNodeEmpty = node?.textContent === '';

        if (parent?.type.name !== 'dBlock') {
          let isPrevNodePageBreak = false;
          let currentNodePos = -1;

          doc.descendants((node, pos) => {
            if (currentNodePos !== -1) return false;
            if (node.type.name === 'pageBreak') {
              isPrevNodePageBreak = true;
              currentNodePos = pos;
            }
          });

          if (isPrevNodePageBreak) {
            return true;
          }
        }

        // Only check for nearest nodes if we're not at the start of the document
        const isNearestDBlock =
          from > 4 ? doc.nodeAt(from - 4)?.type.name === 'dBlock' : false;

        const isNearestListItem =
          from > 2
            ? doc.nodeAt(from - 2)?.type.name === 'listItem' ||
              doc.nodeAt(from - 2)?.type.name === 'taskItem'
            : false;

        const isMultipleListItems =
          $head.node($head.depth - 2)?.childCount > 1 ||
          $head.node($head.depth - 1)?.childCount > 1;

        // Fix for deleting the first item in a list that breaks the list
        if (isAtStartOfNode && isListOrTaskList) {
          if (isNodeEmpty && isNearestDBlock) {
            if (!isMultipleListItems) {
              return editor.commands.deleteNode(this.name);
            } else {
              return true;
            }
          } else {
            if (isNearestListItem) {
              return editor.commands.liftListItem(
                isTaskList ? 'taskItem' : 'listItem',
              );
            } else {
              return editor.commands.joinTextblockBackward();
            }
          }
        }

        return false;
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer((props) => {
      props.updateAttributes({ zoomLevel: this.options.zoomLevel });
  
      return React.createElement(DBlockNodeView, { ...props, zoomLevel: this.options.zoomLevel });
    });
  }
});
