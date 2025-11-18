import { Attributes, Extension } from '@tiptap/core';
import { FONT_SIZES } from '../../components/editor-utils';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customFontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
      increaseFontSize: () => ReturnType;
      decreaseFontSize: () => ReturnType;
    };
  }
}

export const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          class: {},
        },
      },
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => {
              return element.style.fontSize?.replace(/['"]+/g, '') || null;
            },
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        } as Attributes,
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain()
            .setMark('textStyle', { fontSize: null })
            .removeEmptyTextStyle()
            .run(),
      increaseFontSize:
        () =>
        ({ chain }) => {
          const attrs = this.editor.getAttributes('textStyle');
          let currentSizeNum = parseInt(attrs.fontSize || '16');
          if (isNaN(currentSizeNum)) currentSizeNum = 16;

          const nextSize = FONT_SIZES.find((size) => size > currentSizeNum);
          if (!nextSize) return false;

          return chain()
            .setMark('textStyle', { fontSize: `${nextSize}px` })
            .run();
        },
      decreaseFontSize:
        () =>
        ({ chain }) => {
          const attrs = this.editor.getAttributes('textStyle');
          let currentSizeNum = parseInt(attrs.fontSize || '16');
          if (isNaN(currentSizeNum)) currentSizeNum = 16;

          const nextSize = [...FONT_SIZES]
            .reverse()
            .find((size) => size < currentSizeNum);
          if (!nextSize) return false;

          return chain()
            .setMark('textStyle', { fontSize: `${nextSize}px` })
            .run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-.': () => this.editor.commands.increaseFontSize(),
      'Mod-Shift-,': () => this.editor.commands.decreaseFontSize(),
    };
  },
});
