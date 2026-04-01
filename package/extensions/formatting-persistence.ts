import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    formattingPersistence: {
      toggleBold: () => ReturnType;
      setBold: () => ReturnType;
      unsetBold: () => ReturnType;
      toggleItalic: () => ReturnType;
      setItalic: () => ReturnType;
      unsetItalic: () => ReturnType;
      toggleUnderline: () => ReturnType;
      setUnderline: () => ReturnType;
      unsetUnderline: () => ReturnType;
      toggleStrike: () => ReturnType;
      setStrike: () => ReturnType;
      unsetStrike: () => ReturnType;
    };
  }
}

export const FormattingPersistence = Extension.create({
  name: 'formattingPersistence',

  addCommands() {
    const syncFormattingToNode = (
      type: 'isBold' | 'isItalic' | 'isUnderline' | 'isStrike',
      value: boolean | null,
    ) => {
      const { selection } = this.editor.state;
      const $pos = selection.$from;
      const node = $pos.node($pos.depth);
      if (node?.type.name === 'paragraph' && node.textContent === '') {
        this.editor.commands.command(({ tr }) => {
          tr.setNodeMarkup($pos.before($pos.depth), undefined, {
            ...node.attrs,
            [type]: value,
          });
          return true;
        });
      }
    };

    return {
      toggleBold:
        () =>
        ({ chain, state }) => {
          const { selection } = state;
          const $pos = selection.$from;
          const node = $pos.node($pos.depth);
          if (node?.type.name === 'paragraph' && node.textContent === '') {
            syncFormattingToNode('isBold', !node.attrs.isBold);
          }
          return chain().toggleMark('bold').run();
        },
      setBold:
        () =>
        ({ chain }) => {
          syncFormattingToNode('isBold', true);
          return chain().setMark('bold').run();
        },
      unsetBold:
        () =>
        ({ chain }) => {
          syncFormattingToNode('isBold', false);
          return chain().unsetMark('bold').run();
        },
      toggleItalic:
        () =>
        ({ chain, state }) => {
          const { selection } = state;
          const $pos = selection.$from;
          const node = $pos.node($pos.depth);
          if (node?.type.name === 'paragraph' && node.textContent === '') {
            syncFormattingToNode('isItalic', !node.attrs.isItalic);
          }
          return chain().toggleMark('italic').run();
        },
      setItalic:
        () =>
        ({ chain }) => {
          syncFormattingToNode('isItalic', true);
          return chain().setMark('italic').run();
        },
      unsetItalic:
        () =>
        ({ chain }) => {
          syncFormattingToNode('isItalic', false);
          return chain().unsetMark('italic').run();
        },
      toggleUnderline:
        () =>
        ({ chain, state }) => {
          const { selection } = state;
          const $pos = selection.$from;
          const node = $pos.node($pos.depth);
          if (node?.type.name === 'paragraph' && node.textContent === '') {
            syncFormattingToNode('isUnderline', !node.attrs.isUnderline);
          }
          return chain().toggleMark('underline').run();
        },
      setUnderline:
        () =>
        ({ chain }) => {
          syncFormattingToNode('isUnderline', true);
          return chain().setMark('underline').run();
        },
      unsetUnderline:
        () =>
        ({ chain }) => {
          syncFormattingToNode('isUnderline', false);
          return chain().unsetMark('underline').run();
        },
      toggleStrike:
        () =>
        ({ chain, state }) => {
          const { selection } = state;
          const $pos = selection.$from;
          const node = $pos.node($pos.depth);
          if (node?.type.name === 'paragraph' && node.textContent === '') {
            syncFormattingToNode('isStrike', !node.attrs.isStrike);
          }
          return chain().toggleMark('strike').run();
        },
      setStrike:
        () =>
        ({ chain }) => {
          syncFormattingToNode('isStrike', true);
          return chain().setMark('strike').run();
        },
      unsetStrike:
        () =>
        ({ chain }) => {
          syncFormattingToNode('isStrike', false);
          return chain().unsetMark('strike').run();
        },
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          isBold: {
            default: false,
            parseHTML: (element) =>
              element.style.fontWeight === 'bold' ||
              parseInt(element.style.fontWeight) >= 700,
            renderHTML: (attributes) => {
              return attributes.isBold ? { style: 'font-weight: bold' } : {};
            },
          },
          isItalic: {
            default: false,
            parseHTML: (element) => element.style.fontStyle === 'italic',
            renderHTML: (attributes) => {
              return attributes.isItalic ? { style: 'font-style: italic' } : {};
            },
          },
          isUnderline: {
            default: false,
            parseHTML: (element) =>
              element.style.textDecoration.includes('underline'),
            renderHTML: (attributes) => {
              if (attributes.isUnderline && attributes.isStrike) {
                return { style: 'text-decoration: underline line-through' };
              }
              return attributes.isUnderline
                ? { style: 'text-decoration: underline' }
                : {};
            },
          },
          isStrike: {
            default: false,
            parseHTML: (element) =>
              element.style.textDecoration.includes('line-through'),
            renderHTML: (attributes) => {
              if (attributes.isUnderline && attributes.isStrike) {
                return { style: 'text-decoration: underline line-through' };
              }
              return attributes.isStrike
                ? { style: 'text-decoration: line-through' }
                : {};
            },
          },
        },
      },
    ];
  },
});
