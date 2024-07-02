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

          const isTaskList = nodePaths.some(path => path.includes('taskList'));
          const isList = nodePaths.some(
            path => path.includes('bulletList') || path.includes('orderedList'),
          );

          if (isTaskList) {
            return editor
              .chain()
              .insertContent({
                type: 'taskItem',
                attrs: {
                  checked: false,
                },
                content: [
                  {
                    type: 'paragraph',
                  },
                ],
              })
              .focus()
              .run();
          } else if (isList) {
            return editor
              .chain()
              .insertContent({
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                  },
                ],
              })
              .focus()
              .run();
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
            .focus(from + 4)
            .run();
        } catch (error) {
          console.error(`Error inserting content into dBlock node: ${error}`);
          return false;
        }
      },
      // Backspace: ({ editor }) => {
      //   const { selection } = editor.state;
      //   const { $from } = selection;
      //   const pos = $from.pos;
      //   const nodeBefore = $from.nodeBefore;

      //   if ($from.parent.content.size === 0) {
      //     if (nodeBefore) {
      //       const deleteFrom = pos - nodeBefore.nodeSize;
      //       const deleteTo = pos;

      //       const result = editor
      //         .chain()
      //         .focus()
      //         .deleteRange({ from: deleteFrom, to: deleteTo })
      //         .run();

      //       if (result) {
      //         return true;
      //       }
      //     } else if ($from.depth > 1) {
      //       // Handle nested nodes, like being at the start of a list item
      //       const parentPos = $from.before($from.depth);
      //       const result = editor
      //         .chain()
      //         .focus()
      //         .deleteRange({ from: parentPos - 1, to: pos })
      //         .run();

      //       if (result) {
      //         return true;
      //       }
      //     }
      //   }

      //   return false;
      // },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(DBlockNodeView);
  },
});
