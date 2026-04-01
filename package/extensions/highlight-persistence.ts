import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    highlightPersistence: {
      setHighlight: (attributes?: { color: string }) => ReturnType;
      toggleHighlight: (attributes?: { color: string }) => ReturnType;
      unsetHighlight: () => ReturnType;
    };
  }
}

export const HighlightPersistence = Extension.create({
  name: 'highlightPersistence',

  addCommands() {
    return {
      setHighlight:
        (attributes) =>
        ({ chain, state, tr }) => {
          const { selection } = state;
          const $pos = selection.$from;
          const node = $pos.node($pos.depth);
          if (node?.type.name === 'paragraph' && node.textContent === '') {
            tr.setNodeMarkup($pos.before($pos.depth), undefined, {
              ...node.attrs,
              highlightColor: attributes?.color || null,
            });
          }
          return chain().setMark('highlight', attributes).run();
        },
      toggleHighlight:
        (attributes) =>
        ({ chain, state, tr }) => {
          const { selection } = state;
          const $pos = selection.$from;
          const node = $pos.node($pos.depth);
          if (node?.type.name === 'paragraph' && node.textContent === '') {
            const currentHighlight = node.attrs.highlightColor;
            const newHighlight =
              currentHighlight === attributes?.color ? null : attributes?.color;
            tr.setNodeMarkup($pos.before($pos.depth), undefined, {
              ...node.attrs,
              highlightColor: newHighlight || null,
            });
          }
          return chain().toggleMark('highlight', attributes).run();
        },
      unsetHighlight:
        () =>
        ({ chain, state, tr }) => {
          const { selection } = state;
          const $pos = selection.$from;
          const node = $pos.node($pos.depth);
          if (node?.type.name === 'paragraph' && node.textContent === '') {
            tr.setNodeMarkup($pos.before($pos.depth), undefined, {
              ...node.attrs,
              highlightColor: null,
            });
          }
          return chain().unsetMark('highlight').run();
        },
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          highlightColor: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute('data-color') ||
              element.style.backgroundColor ||
              null,
            renderHTML: (attributes) => {
              if (!attributes.highlightColor) {
                return {};
              }
              return {
                style: `background-color: ${attributes.highlightColor}`,
                'data-color': attributes.highlightColor,
              };
            },
          },
        },
      },
    ];
  },
});
