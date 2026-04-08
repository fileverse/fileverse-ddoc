import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    colorPersistence: {
      setColor: (color: string) => ReturnType;
      unsetColor: () => ReturnType;
    };
  }
}

export const ColorPersistence = Extension.create({
  name: 'colorPersistence',

  addCommands() {
    const getExistingTextStyleAttrs = (editor: typeof this.editor) => {
      const attrs = editor.getAttributes('textStyle');
      const { selection } = editor.state;
      const $pos = selection.$from;
      const node = $pos.node($pos.depth);
      if (node?.type.name === 'paragraph') {
        if (!attrs.color && node.attrs.color) {
          attrs.color = node.attrs.color;
        }
      }
      return attrs;
    };

    return {
      setColor:
        (color: string) =>
        ({ chain, state, tr }) => {
          const existing = getExistingTextStyleAttrs(this.editor);
          const { selection } = state;
          const $pos = selection.$from;
          const node = $pos.node($pos.depth);
          if (node?.type.name === 'paragraph' && node.textContent === '') {
            tr.setNodeMarkup($pos.before($pos.depth), undefined, {
              ...node.attrs,
              color,
            });
          }
          return chain()
            .setMark('textStyle', { ...existing, color })
            .run();
        },
      unsetColor:
        () =>
        ({ chain, state, tr }) => {
          const existing = getExistingTextStyleAttrs(this.editor);
          const { selection } = state;
          const $pos = selection.$from;
          const node = $pos.node($pos.depth);
          if (node?.type.name === 'paragraph' && node.textContent === '') {
            tr.setNodeMarkup($pos.before($pos.depth), undefined, {
              ...node.attrs,
              color: null,
            });
          }
          return chain()
            .setMark('textStyle', { ...existing, color: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          color: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute('data-color') || element.style.color || null,
            renderHTML: (attributes) => {
              if (!attributes.color) {
                return {};
              }
              return { 'data-color': attributes.color };
            },
          },
        },
      },
    ];
  },
});
