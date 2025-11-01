import { Extension } from '@tiptap/core';

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
      defaultLineHeight: '1.5',
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
});
