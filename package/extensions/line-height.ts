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
      types: ['textStyle'],
      defaultLineHeight: '1.15',
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) =>
              element.style.lineHeight?.replace(/['"]+/g, '') || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) {
                return {};
              }
              return {
                style: `line-height: ${attributes.lineHeight}`,
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
        ({ commands, state, chain }) => {
          const { selection } = state;
          const { from, to } = selection;

          // If there's no selection (cursor only), select all content
          if (from === to) {
            return chain()
              .selectAll()
              .setMark('textStyle', { lineHeight })
              .setTextSelection({ from, to })
              .run();
          }

          // If there's a selection, just apply to the selection
          return chain().setMark('textStyle', { lineHeight }).run();
        },
      unsetLineHeight:
        () =>
        ({ commands, state, chain }) => {
          const { selection } = state;
          const { from, to } = selection;

          // If there's no selection (cursor only), select all content
          if (from === to) {
            return chain()
              .selectAll()
              .setMark('textStyle', { lineHeight: null })
              .setTextSelection({ from, to })
              .run();
          }

          // If there's a selection, just apply to the selection
          return chain().setMark('textStyle', { lineHeight: null }).run();
        },
    };
  },
});
