import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * TypographyPersistence consolidates text styling persistence logic
 * into a single extension with 2 plugins.
 *
 * It covers: fontFamily, fontSize, color, highlightColor, textAlign,
 * lineHeight, isBold, isItalic, isUnderline, isStrike.
 *
 * Plugins:
 * 1. typographyInheritance — when a new paragraph is inserted next to a styled
 *    one, inherit all styles in a single setNodeMarkup pass.
 * 2. typographyStoredMarks — when selection moves into an empty styled
 *    paragraph, restore storedMarks for all mark-based styles.
 */
export const TypographyPersistence = Extension.create({
  name: 'typographyPersistence',

  addProseMirrorPlugins() {
    return [
      // Plugin 1: Inheritance
      new Plugin({
        key: new PluginKey('typographyInheritance'),
        appendTransaction: (transactions, _oldState, newState) => {
          const hasStructuralChange = transactions.some((transaction) => {
            if (!transaction.docChanged) return false;
            let structural = false;
            transaction.steps.forEach((step) => {
              const stepMap = step.getMap();
              stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
                if (newEnd - newStart - (oldEnd - oldStart) > 4)
                  structural = true;
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
                if (newEnd <= newStart) return;

                const docSize = newState.doc.content.size;
                const safeStart = Math.max(0, Math.min(newStart, docSize));
                const safeEnd = Math.max(0, Math.min(newEnd, docSize));
                if (safeEnd <= safeStart) return;

                newState.doc.nodesBetween(safeStart, safeEnd, (node, pos) => {
                  if (node.type.name !== 'paragraph') return;
                  if (node.attrs.class === 'trailing-node') return;

                  const $pos = newState.doc.resolve(pos);
                  const indexBefore = $pos.index($pos.depth);
                  if (indexBefore === 0) return;

                  const prevNode = $pos.node($pos.depth).child(indexBefore - 1);
                  if (!prevNode || prevNode.type.name !== 'paragraph') return;

                  const nextAttrs = { ...node.attrs };
                  let nodeModified = false;

                  const inheritableAttrs = [
                    { name: 'fontFamily', default: null },
                    { name: 'fontSize', default: null },
                    { name: 'color', default: null },
                    { name: 'highlightColor', default: null },
                    { name: 'textAlign', default: 'left' },
                    { name: 'lineHeight', default: '138%' },
                    { name: 'isBold', default: false },
                    { name: 'isItalic', default: false },
                    { name: 'isUnderline', default: false },
                    { name: 'isStrike', default: false },
                  ];

                  inheritableAttrs.forEach((attr) => {
                    const currentValue = node.attrs[attr.name];
                    const prevValue = prevNode.attrs[attr.name];

                    // Inherit if current is default and prev is non-default
                    if (
                      (currentValue === attr.default || !currentValue) &&
                      prevValue !== attr.default &&
                      prevValue !== null &&
                      prevValue !== undefined
                    ) {
                      nextAttrs[attr.name] = prevValue;
                      nodeModified = true;
                    }
                  });

                  if (nodeModified) {
                    tr.setNodeMarkup(pos, undefined, nextAttrs);
                    modified = true;
                  }
                });
              });
            });
          });

          return modified ? tr : null;
        },
      }),

      // Plugin 2: StoredMarks restoration
      new Plugin({
        key: new PluginKey('typographyStoredMarks'),
        appendTransaction: (transactions, _oldState, newState) => {
          const selectionChanged = transactions.some((tr) => tr.selectionSet);
          if (!selectionChanged) return null;

          const { selection } = newState;
          if (!selection.empty) return null;

          const $pos = selection.$from;
          const node = $pos.node($pos.depth);

          if (node?.type.name === 'paragraph' && node.textContent === '') {
            const tr = newState.tr;
            let modified = false;

            // Trigger restoration if any persisted style exists
            const hasPersistedStyle =
              node.attrs.fontFamily ||
              node.attrs.fontSize ||
              node.attrs.color ||
              node.attrs.highlightColor ||
              node.attrs.isBold ||
              node.attrs.isItalic ||
              node.attrs.isUnderline ||
              node.attrs.isStrike;

            if (!hasPersistedStyle) return null;

            // 1. Handle textStyle mark (fontFamily, fontSize, color)
            const textStyleMarkType = newState.schema.marks.textStyle;
            if (textStyleMarkType) {
              const currentStoredTextStyle = (
                newState.storedMarks || $pos.marks()
              ).find((m) => m.type === textStyleMarkType);
              const baseAttrs = currentStoredTextStyle?.attrs ?? {};
              const nextTextStyleAttrs = {
                ...baseAttrs,
                fontFamily:
                  node.attrs.fontFamily || baseAttrs.fontFamily || null,
                fontSize: node.attrs.fontSize || baseAttrs.fontSize || null,
                color: node.attrs.color || baseAttrs.color || null,
              };

              if (
                JSON.stringify(nextTextStyleAttrs) !== JSON.stringify(baseAttrs)
              ) {
                tr.addStoredMark(textStyleMarkType.create(nextTextStyleAttrs));
                modified = true;
              }
            }

            // 2. Handle highlight mark
            const highlightMarkType = newState.schema.marks.highlight;
            if (highlightMarkType) {
              const isHighlightActive = (
                newState.storedMarks || $pos.marks()
              ).find((m) => m.type === highlightMarkType);
              if (node.attrs.highlightColor) {
                if (
                  isHighlightActive?.attrs.color !== node.attrs.highlightColor
                ) {
                  tr.addStoredMark(
                    highlightMarkType.create({
                      color: node.attrs.highlightColor,
                    }),
                  );
                  modified = true;
                }
              } else if (isHighlightActive) {
                tr.removeStoredMark(highlightMarkType);
                modified = true;
              }
            }

            // 3. Handle boolean marks (bold, italic, underline, strike)
            const booleanMarks = [
              { attr: 'isBold', type: 'bold' },
              { attr: 'isItalic', type: 'italic' },
              { attr: 'isUnderline', type: 'underline' },
              { attr: 'isStrike', type: 'strike' },
            ];

            booleanMarks.forEach((bm) => {
              const markType = newState.schema.marks[bm.type];
              if (markType) {
                const isMarkActive = (
                  newState.storedMarks || $pos.marks()
                ).some((m) => m.type === markType);
                if (node.attrs[bm.attr] && !isMarkActive) {
                  tr.addStoredMark(markType.create());
                  modified = true;
                } else if (!node.attrs[bm.attr] && isMarkActive) {
                  tr.removeStoredMark(markType);
                  modified = true;
                }
              }
            });

            return modified ? tr : null;
          }

          return null;
        },
      }),
    ];
  },
});
