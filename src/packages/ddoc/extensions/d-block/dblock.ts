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

        if (parent?.type.name !== 'dBlock') {
          const headString = $head.toString();
          const nodePaths = headString.split('/');

          const isList = nodePaths.some(
            path =>
              path.includes('bulletList_0') ||
              path.includes('orderedList_0') ||
              path.includes('taskList_0'),
          );

          const isEmptyParagraph = nodePaths.some(path =>
            path.includes('paragraph_0:0'),
          );
          const isLastEmptyListItem = $head.parent.content.size === 0;
          const isOnlyListItemAndEmpty =
            nodePaths.length === 4 && isEmptyParagraph;

          const isNestedEmptyListItem =
            nodePaths.some(path => path.includes('paragraph_0:0')) &&
            nodePaths.length !== 4;

          const isFirstListItemWithoutContent =
            $head.parent.content.size === 0 &&
            nodePaths.some(path => path.includes('listItem_0'));

          const isListItemUnstyledAndEmpty =
            nodePaths.some(path => path.includes('paragraph_1:0')) &&
            $head.parent.content.size === 0;

          const isListItemUnstyledWithContent = $head.parent.content.size > 0;
          const isAtBeginOfUnstyledListItem = nodePaths.some(path =>
            /paragraph_\d+:0/.test(path),
          );

          if (isOnlyListItemAndEmpty) {
            return editor.chain().liftListItem('listItem').focus().run();
          }

          if (isListItemUnstyledWithContent && isAtBeginOfUnstyledListItem) {
            const listItemPos = $head.before($head.depth - 1);
            const getParagraphNode = () => {
              const paragraphNode = $head.node($head.depth - 1);
              const content = paragraphNode?.lastChild?.textContent;

              return content;
            };

            return editor
              .chain()
              .deleteRange({
                from,
                to: listItemPos + 1 + parent.nodeSize,
              })
              .insertContent({
                type: 'dBlock',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: getParagraphNode(),
                      },
                    ],
                  },
                ],
              })
              .run();
          }

          if (isListItemUnstyledAndEmpty) {
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
              .focus()
              .run();
          }

          if (
            (isNestedEmptyListItem && isList) ||
            isFirstListItemWithoutContent
          ) {
            return editor.chain().liftListItem('listItem').focus().run();
          }

          if (isLastEmptyListItem && isList) {
            // Find the list node and its position
            const listPos = $head.before($head.depth - 1);
            return editor
              .chain()
              .deleteRange({
                from: listPos,
                to: listPos + parent.nodeSize,
              })
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
          }

          return false;
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
              .focus()
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
            .focus()
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
