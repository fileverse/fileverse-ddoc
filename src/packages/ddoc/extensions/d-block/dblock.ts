/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

import { DBlockNodeView } from './dblock-node-view';
import { Node as ProsemirrorNode } from 'prosemirror-model';
export interface DBlockOptions {
  HTMLAttributes: Record<string, any>;
}

export type ListTypes = 'bulletList' | 'orderedList' | 'taskList';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dBlock: {
      /**
       * Toggle a dBlock
       */
      setDBlock: (position?: number) => ReturnType;
      mergeDBlocksIntoList: (listType: ListTypes) => ReturnType;
      splitListToDBlocks: (listType: ListTypes) => ReturnType;
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

      // TODO: WIP
      mergeDBlocksIntoList:
        (listType: ListTypes) =>
        ({ state, dispatch }) => {
          if (!dispatch) {
            throw new Error('Dispatch function is not provided.');
          }

          const { from, to } = state.selection;

          let tr = state.tr;

          const listItemNodes: ProsemirrorNode[] = [];

          state.doc.nodesBetween(from, to, (node) => {
            if (node.type.name === this.name) {
              const listItemNode = state.schema.nodes.listItem.create(
                null,
                node.content
              );
              if (listItemNode) {
                listItemNodes.push(listItemNode);
              }
            }
          });

          if (listItemNodes.length === 0) return false;

          const listNode = state.schema.nodes[listType].create(
            null,
            listItemNodes
          );

          if (!listNode) return false;

          tr = tr.replaceRangeWith(from, to, listNode);

          dispatch(tr);

          return true;
        },

      // TODO: WIP
      splitListToDBlocks:
        (listType: ListTypes) =>
        ({ state, dispatch }) => {
          if (!dispatch) {
            throw new Error('Dispatch function is not provided.');
          }

          const { from, to } = state.selection;
          let tr = state.tr;

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === listType) {
              const dBlockNode = state.schema.nodes[this.name].create(
                null,
                node.content
              );
              tr = tr.insert(pos, dBlockNode);
            }
          });

          dispatch(tr);
          return true;
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(DBlockNodeView);
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

        if (parent?.type.name !== 'dBlock') return false;

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
          // If the current active node's type is "codeBlock", continue as a break line within the code block
          if (currentActiveNodeType === 'codeBlock') {
            return editor
              .chain()
              .insertContentAt({ from, to: currentActiveNodeTo }, '\n')
              .focus(currentActiveNodeTo + 1)
              .run();
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
              }
            )
            .focus(from + 4)
            .run();
        } catch (error) {
          console.error(`Error inserting content into dBlock node: ${error}`);
          return false;
        }
      },
    };
  },
});
