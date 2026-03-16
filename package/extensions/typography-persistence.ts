import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * TypographyPersistence consolidates fontFamily and fontSize persistence logic
 * into a single extension with 3 plugins, replacing the 6 individual plugins
 * that were split across FontFamilyPersistence and FontSize.
 *
 * Plugins:
 * 1. typographyInheritance — when a new paragraph is inserted next to a styled
 *    one, inherit fontFamily and fontSize in a single setNodeMarkup pass.
 *    Skips trailing-node paragraphs (they inherit from the previous sibling
 *    at creation time, but should not be overridden when the user clears them).
 * 2. typographyStoredMarks — when selection moves into an empty styled
 *    paragraph, restore storedMarks for both fontFamily and fontSize at once.
 * 3. typographySyncNodeAttr — when storedMarks change on an empty paragraph,
 *    update both node attributes in one setNodeMarkup call.
 *    Clearing only happens when the textStyle mark itself explicitly has a null
 *    value for the property — NOT when non-textStyle marks (bold, italic, etc.)
 *    are stored, which was previously causing font attrs to be wiped on
 *    bold/italic toggle.
 */
export const TypographyPersistence = Extension.create({
  name: 'typographyPersistence',

  addProseMirrorPlugins() {
    return [
      // Plugin 1: Inheritance
      // When a paragraph is newly inserted next to a styled paragraph, copy
      // fontFamily and fontSize from the previous sibling in one pass.
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
                  // Skip trailing node — user should be able to clear it
                  if (node.attrs.class === 'trailing-node') return;
                  // Already has both — nothing to inherit
                  if (node.attrs.fontFamily && node.attrs.fontSize) return;

                  const $pos = newState.doc.resolve(pos);
                  const indexBefore = $pos.index($pos.depth);
                  if (indexBefore === 0) return;

                  const prevNode = $pos.node($pos.depth).child(indexBefore - 1);
                  if (!prevNode || prevNode.type.name !== 'paragraph') return;

                  const inheritFamily =
                    !node.attrs.fontFamily && prevNode.attrs.fontFamily
                      ? prevNode.attrs.fontFamily
                      : node.attrs.fontFamily;
                  const inheritSize =
                    !node.attrs.fontSize && prevNode.attrs.fontSize
                      ? prevNode.attrs.fontSize
                      : node.attrs.fontSize;

                  if (
                    inheritFamily !== node.attrs.fontFamily ||
                    inheritSize !== node.attrs.fontSize
                  ) {
                    tr.setNodeMarkup(pos, undefined, {
                      ...node.attrs,
                      fontFamily: inheritFamily,
                      fontSize: inheritSize,
                    });
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
      // When cursor moves into an empty paragraph that has fontFamily or
      // fontSize node attrs, restore both as storedMarks in one pass so the
      // next typed character picks up the correct styling.
      new Plugin({
        key: new PluginKey('typographyStoredMarks'),
        appendTransaction: (transactions, _oldState, newState) => {
          const selectionChanged = transactions.some((tr) => tr.selectionSet);
          if (!selectionChanged) return null;

          const { selection } = newState;
          if (!selection.empty) return null;

          const $pos = selection.$from;
          const node = $pos.node($pos.depth);

          if (
            node?.type.name === 'paragraph' &&
            node.textContent === '' &&
            (node.attrs.fontFamily || node.attrs.fontSize)
          ) {
            const markType = newState.schema.marks.textStyle;
            if (!markType) return null;

            const tr = newState.tr;
            const existingMark =
              tr.storedMarks?.find((m) => m.type === markType) ||
              newState.storedMarks?.find((m) => m.type === markType);

            // Already up to date — skip
            if (
              existingMark &&
              existingMark.attrs.fontFamily === node.attrs.fontFamily &&
              existingMark.attrs.fontSize === node.attrs.fontSize
            ) {
              return null;
            }

            const attrs = existingMark
              ? {
                  ...existingMark.attrs,
                  fontFamily: node.attrs.fontFamily,
                  fontSize: node.attrs.fontSize,
                }
              : {
                  fontFamily: node.attrs.fontFamily,
                  fontSize: node.attrs.fontSize,
                };

            tr.addStoredMark(markType.create(attrs));
            return tr;
          }

          return null;
        },
      }),

      // Plugin 3: Sync node attrs ↔ storedMarks
      // When storedMarks change on an empty paragraph, reflect the new
      // fontFamily/fontSize back to the node attrs so they persist when the
      // user navigates away.
      //
      // IMPORTANT: Only clear a node attr when the textStyle mark itself
      // exists but has an explicit null for that property. If storedMarks
      // contains only non-textStyle marks (bold, italic, etc.), do NOT clear
      // font attrs — that was the cause of bold/italic wiping fontSize.
      new Plugin({
        key: new PluginKey('typographySyncNodeAttr'),
        appendTransaction: (transactions, _oldState, newState) => {
          const hasStoredMarksChange = transactions.some(
            (tr) => tr.storedMarksSet,
          );
          if (!hasStoredMarksChange) return null;

          const { selection } = newState;
          if (!selection.empty) return null;

          const $pos = selection.$from;
          const node = $pos.node($pos.depth);

          if (node?.type.name !== 'paragraph' || node.textContent !== '')
            return null;

          const storedTextStyle = newState.storedMarks?.find(
            (m) => m.type.name === 'textStyle',
          );
          const storedFontFamily = storedTextStyle?.attrs?.fontFamily ?? null;
          const storedFontSize = storedTextStyle?.attrs?.fontSize ?? null;

          const newFontFamily = storedTextStyle
            ? storedFontFamily // use stored value (may be null = user unset)
            : node.attrs.fontFamily; // no textStyle stored → don't change

          const newFontSize = storedTextStyle
            ? storedFontSize // use stored value (may be null = user unset)
            : node.attrs.fontSize; // no textStyle stored → don't change

          if (
            newFontFamily !== node.attrs.fontFamily ||
            newFontSize !== node.attrs.fontSize
          ) {
            const tr = newState.tr;
            tr.setNodeMarkup($pos.before($pos.depth), undefined, {
              ...node.attrs,
              fontFamily: newFontFamily,
              fontSize: newFontSize,
            });
            return tr;
          }

          return null;
        },
      }),
    ];
  },
});
