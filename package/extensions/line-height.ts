import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineHeight: {
      /**
       * Set the line height
       */
      setLineHeight: (lineHeight: string) => ReturnType;
      /**
       * Unset the line height
       */
      unsetLineHeight: () => ReturnType;
    };
  }
}

export const LineHeight = Extension.create({
  name: 'lineHeight',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'listItem'],
      defaultLineHeight: '138%', // 1.15 in UI = 138%
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: this.options.defaultLineHeight,
            parseHTML: (element) =>
              element.style.lineHeight?.replace(/['"]+/g, '') ||
              this.options.defaultLineHeight,
            renderHTML: (attributes) => {
              const lineHeight =
                attributes.lineHeight || this.options.defaultLineHeight;
              return {
                style: `line-height: ${lineHeight}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { from, to } = selection;

          // Check if there's a selection
          const hasSelection = from !== to;

          if (hasSelection) {
            // Apply to selected nodes only
            state.doc.nodesBetween(from, to, (node, pos) => {
              if (this.options.types.includes(node.type.name)) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  lineHeight,
                });
              }
            });
          } else {
            // No selection - apply to all nodes in the document
            state.doc.descendants((node, pos) => {
              if (this.options.types.includes(node.type.name)) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  lineHeight,
                });
              }
            });
          }

          if (dispatch) dispatch(tr);
          return true;
        },
      unsetLineHeight:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { from, to } = selection;

          // Check if there's a selection
          const hasSelection = from !== to;

          if (hasSelection) {
            // Remove from selected nodes only
            state.doc.nodesBetween(from, to, (node, pos) => {
              if (this.options.types.includes(node.type.name)) {
                const newAttrs = { ...node.attrs };
                delete newAttrs.lineHeight;
                tr.setNodeMarkup(pos, undefined, newAttrs);
              }
            });
          } else {
            // No selection - remove from all nodes in the document
            state.doc.descendants((node, pos) => {
              if (this.options.types.includes(node.type.name)) {
                const newAttrs = { ...node.attrs };
                delete newAttrs.lineHeight;
                tr.setNodeMarkup(pos, undefined, newAttrs);
              }
            });
          }

          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('lineHeightInheritance');

    return [
      new Plugin({
        key: pluginKey,
        appendTransaction: (transactions, _oldState, newState) => {
          const tr = newState.tr;
          let modified = false;

          transactions.forEach((transaction) => {
            if (!transaction.docChanged) return;

            transaction.steps.forEach((step) => {
              const stepMap = step.getMap();
              stepMap.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
                // Check if new content was inserted
                if (newEnd > newStart) {
                  const docSize = newState.doc.content.size;
                  const safeStart = Math.max(0, Math.min(newStart, docSize));
                  const safeEnd = Math.max(0, Math.min(newEnd, docSize));

                  if (safeEnd <= safeStart) return;

                  newState.doc.nodesBetween(safeStart, safeEnd, (node, pos) => {
                    // Only process our target node types
                    if (!this.options.types.includes(node.type.name)) return;

                    // If node already has lineHeight, skip
                    if (node.attrs.lineHeight) return;

                    // Try to find previous sibling with lineHeight
                    const $pos = newState.doc.resolve(pos);
                    const indexBefore = $pos.index($pos.depth);

                    if (indexBefore > 0) {
                      const prevNode = $pos
                        .node($pos.depth)
                        .child(indexBefore - 1);
                      if (
                        prevNode &&
                        this.options.types.includes(prevNode.type.name) &&
                        prevNode.attrs.lineHeight
                      ) {
                        // Copy lineHeight from previous node
                        tr.setNodeMarkup(pos, undefined, {
                          ...node.attrs,
                          lineHeight: prevNode.attrs.lineHeight,
                        });
                        modified = true;
                      }
                    }
                  });
                }
              });
            });
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});
