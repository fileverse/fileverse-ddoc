import { Attributes, Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
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
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, '') || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
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
    const getExistingTextStyleAttrs = (editor: typeof this.editor) => {
      const attrs = editor.getAttributes('textStyle');
      // Also check the paragraph node attribute as fallback for empty paragraphs
      if (!attrs.fontFamily && editor.isActive('paragraph')) {
        const paragraphAttrs = editor.getAttributes('paragraph');
        if (paragraphAttrs.fontFamily) {
          attrs.fontFamily = paragraphAttrs.fontFamily;
        }
      }
      return attrs;
    };

    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) => {
          const existing = getExistingTextStyleAttrs(this.editor);
          return chain()
            .setMark('textStyle', { ...existing, fontSize })
            .run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          const existing = getExistingTextStyleAttrs(this.editor);
          return chain()
            .setMark('textStyle', { ...existing, fontSize: null })
            .removeEmptyTextStyle()
            .run();
        },
      increaseFontSize:
        () =>
        ({ chain }) => {
          const attrs = getExistingTextStyleAttrs(this.editor);
          let currentSizeNum = parseInt(attrs.fontSize || '16');
          if (isNaN(currentSizeNum)) currentSizeNum = 16;

          const nextSize = FONT_SIZES.find((size) => size > currentSizeNum);
          if (!nextSize) return false;

          return chain()
            .setMark('textStyle', { ...attrs, fontSize: `${nextSize}px` })
            .run();
        },
      decreaseFontSize:
        () =>
        ({ chain }) => {
          const attrs = getExistingTextStyleAttrs(this.editor);
          let currentSizeNum = parseInt(attrs.fontSize || '16');
          if (isNaN(currentSizeNum)) currentSizeNum = 16;

          const nextSize = [...FONT_SIZES]
            .reverse()
            .find((size) => size < currentSizeNum);
          if (!nextSize) return false;

          return chain()
            .setMark('textStyle', { ...attrs, fontSize: `${nextSize}px` })
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

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('fontSizeInheritance'),
        appendTransaction: (transactions, _oldState, newState) => {
          const hasStructuralChange = transactions.some((transaction) => {
            if (!transaction.docChanged) return false;
            let structural = false;
            transaction.steps.forEach((step) => {
              const stepMap = step.getMap();
              stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
                if (newEnd - newStart > oldEnd - oldStart) {
                  structural = true;
                }
              });
            });
            return structural;
          });

          if (!hasStructuralChange) return null;

          const tr = newState.tr;
          let modified = false;

          transactions.forEach((transaction) => {
            if (!transaction.docChanged) return;
            transaction.steps.forEach((step) => {
              const stepMap = step.getMap();
              stepMap.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
                if (newEnd > newStart) {
                  const docSize = newState.doc.content.size;
                  const safeStart = Math.max(0, Math.min(newStart, docSize));
                  const safeEnd = Math.max(0, Math.min(newEnd, docSize));

                  if (safeEnd <= safeStart) return;

                  newState.doc.nodesBetween(safeStart, safeEnd, (node, pos) => {
                    if (node.type.name !== 'paragraph') return;
                    if (node.attrs.fontSize) return;

                    const $pos = newState.doc.resolve(pos);
                    const indexBefore = $pos.index($pos.depth);

                    if (indexBefore > 0) {
                      const prevNode = $pos.node($pos.depth).child(indexBefore - 1);
                      if (prevNode && prevNode.type.name === 'paragraph' && prevNode.attrs.fontSize) {
                        tr.setNodeMarkup(pos, undefined, {
                          ...node.attrs,
                          fontSize: prevNode.attrs.fontSize,
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

      new Plugin({
        key: new PluginKey('fontSizeStoredMarks'),
        appendTransaction: (transactions, _oldState, newState) => {
          const selectionChanged = transactions.some((tr) => tr.selectionSet);
          if (!selectionChanged) return null;

          const { selection } = newState;
          if (!selection.empty) return null;

          const $pos = selection.$from;
          const node = $pos.node($pos.depth);

          if (node?.type.name === 'paragraph' && node.textContent === '' && node.attrs.fontSize) {
            const markType = newState.schema.marks.textStyle;
            if (!markType) return null;

            const tr = newState.tr;
            const existingMark =
              tr.storedMarks?.find((m) => m.type === markType) ||
              newState.storedMarks?.find((m) => m.type === markType);

            if (existingMark && existingMark.attrs.fontSize === node.attrs.fontSize) return null;

            const attrs = existingMark
              ? { ...existingMark.attrs, fontSize: node.attrs.fontSize }
              : { fontSize: node.attrs.fontSize };
            tr.addStoredMark(markType.create(attrs));
            return tr;
          }

          return null;
        },
      }),

      new Plugin({
        key: new PluginKey('fontSizeSyncNodeAttr'),
        appendTransaction: (transactions, _oldState, newState) => {
          const hasStoredMarksChange = transactions.some((tr) => tr.storedMarksSet);
          if (!hasStoredMarksChange) return null;

          const { selection } = newState;
          if (!selection.empty) return null;

          const $pos = selection.$from;
          const node = $pos.node($pos.depth);

          if (node?.type.name === 'paragraph' && node.textContent === '') {
            const storedTextStyle = newState.storedMarks?.find((m) => m.type.name === 'textStyle');
            const storedFontSize = storedTextStyle?.attrs?.fontSize || null;

            if (storedFontSize && node.attrs.fontSize !== storedFontSize) {
              // Explicit font size set → sync to node attr
              const tr = newState.tr;
              tr.setNodeMarkup($pos.before($pos.depth), undefined, {
                ...node.attrs,
                fontSize: storedFontSize,
              });
              return tr;
            } else if (!storedTextStyle && node.attrs.fontSize) {
              // All textStyle marks removed (unset) → clear node attr
              const tr = newState.tr;
              tr.setNodeMarkup($pos.before($pos.depth), undefined, {
                ...node.attrs,
                fontSize: null,
              });
              return tr;
            }
          }

          return null;
        },
      }),
    ];
  },
});
