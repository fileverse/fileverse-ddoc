import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontFamilyPersistence: {
      setFontFamily: (fontFamily: string) => ReturnType;
      unsetFontFamily: () => ReturnType;
    };
  }
}

export const FontFamilyPersistence = Extension.create({
  name: 'fontFamilyPersistence',

  addCommands() {
    const getExistingTextStyleAttrs = (editor: typeof this.editor) => {
      const attrs = editor.getAttributes('textStyle');
      // Also check the paragraph node attribute as fallback for empty paragraphs
      if (!attrs.fontSize && editor.isActive('paragraph')) {
        const paragraphAttrs = editor.getAttributes('paragraph');
        if (paragraphAttrs.fontSize) {
          attrs.fontSize = paragraphAttrs.fontSize;
        }
      }
      return attrs;
    };

    return {
      setFontFamily:
        (fontFamily: string) =>
        ({ chain }) => {
          const existing = getExistingTextStyleAttrs(this.editor);
          return chain()
            .setMark('textStyle', { ...existing, fontFamily })
            .run();
        },
      unsetFontFamily:
        () =>
        ({ chain }) => {
          const existing = getExistingTextStyleAttrs(this.editor);
          return chain()
            .setMark('textStyle', { ...existing, fontFamily: null })
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
          fontFamily: {
            default: null,
            parseHTML: (element) => element.style.fontFamily?.replace(/['"]+/g, '') || null,
            renderHTML: (attributes) => {
              if (!attributes.fontFamily) {
                return {};
              }
              return {
                style: `font-family: ${attributes.fontFamily}`,
              };
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      // Inheritance plugin
      new Plugin({
        key: new PluginKey('fontFamilyInheritance'),
        appendTransaction: (transactions, _oldState, newState) => {
          const hasStructuralChange = transactions.some((transaction) => {
            if (!transaction.docChanged) return false;
            let structural = false;
            transaction.steps.forEach((step) => {
              const stepMap = step.getMap();
              stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
                if (newEnd - newStart - (oldEnd - oldStart) > 4) structural = true;
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
                    if (node.attrs.fontFamily) return;

                    const $pos = newState.doc.resolve(pos);
                    const indexBefore = $pos.index($pos.depth);

                    if (indexBefore > 0) {
                      const prevNode = $pos.node($pos.depth).child(indexBefore - 1);
                      if (prevNode && prevNode.type.name === 'paragraph' && prevNode.attrs.fontFamily) {
                        tr.setNodeMarkup(pos, undefined, {
                          ...node.attrs,
                          fontFamily: prevNode.attrs.fontFamily,
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

      // StoredMarks restoration plugin
      new Plugin({
        key: new PluginKey('fontFamilyStoredMarks'),
        appendTransaction: (transactions, _oldState, newState) => {
          const selectionChanged = transactions.some(tr => tr.selectionSet);
          if (!selectionChanged) return null;

          const { selection } = newState;
          if (!selection.empty) return null;

          const $pos = selection.$from;
          const node = $pos.node($pos.depth);

          if (node?.type.name === 'paragraph' && node.textContent === '' && node.attrs.fontFamily) {
            const markType = newState.schema.marks.textStyle;
            if (!markType) return null;
            
            const tr = newState.tr;
            const existingMark = tr.storedMarks?.find(m => m.type === markType) || newState.storedMarks?.find(m => m.type === markType);
            
            if (existingMark && existingMark.attrs.fontFamily === node.attrs.fontFamily) return null;

            const attrs = existingMark ? { ...existingMark.attrs, fontFamily: node.attrs.fontFamily } : { fontFamily: node.attrs.fontFamily };
            tr.addStoredMark(markType.create(attrs));
            return tr;
          }

          return null;
        },
      }),

      // Sync plugin: when storedMarks change on empty paragraph, update node attribute
      new Plugin({
        key: new PluginKey('fontFamilySyncNodeAttr'),
        appendTransaction: (transactions, _oldState, newState) => {
          const hasStoredMarksChange = transactions.some(tr => tr.storedMarksSet);
          if (!hasStoredMarksChange) return null;

          const { selection } = newState;
          if (!selection.empty) return null;

          const $pos = selection.$from;
          const node = $pos.node($pos.depth);

          if (node?.type.name === 'paragraph' && node.textContent === '') {
            const storedTextStyle = newState.storedMarks?.find(m => m.type.name === 'textStyle');
            const storedFontFamily = storedTextStyle?.attrs?.fontFamily || null;

            if (storedFontFamily && node.attrs.fontFamily !== storedFontFamily) {
              // Explicit font family set → sync to node attr
              const tr = newState.tr;
              tr.setNodeMarkup($pos.before($pos.depth), undefined, {
                ...node.attrs,
                fontFamily: storedFontFamily,
              });
              return tr;
            } else if (!storedTextStyle && node.attrs.fontFamily) {
              // All textStyle marks removed (unset) → clear node attr
              const tr = newState.tr;
              tr.setNodeMarkup($pos.before($pos.depth), undefined, {
                ...node.attrs,
                fontFamily: null,
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
