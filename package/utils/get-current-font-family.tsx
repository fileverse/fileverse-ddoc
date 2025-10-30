import { Editor } from '@tiptap/core';

export const getCurrentFontFamily = (editor: Editor | null) => {
  if (!editor) return 'Default';

  const { state } = editor;
  const { from, empty } = state.selection;

  // 1) If caret & there are stored marks, show the "pending" font
  if (empty && state.storedMarks?.length) {
    const m = state.storedMarks.find((m) => m.type.name === 'textStyle');
    if (m?.attrs?.fontFamily) return m.attrs.fontFamily;
  }

  // 2) If caret, inspect marks at the actual cursor position
  if (empty) {
    const $pos = state.doc.resolve(from);
    const m = $pos.marks().find((m) => m.type.name === 'textStyle');
    if (m?.attrs?.fontFamily) return m.attrs.fontFamily;
    return 'Default';
  }

  // 3) If range, use merged attributes across selection
  return editor.getAttributes('textStyle')?.fontFamily;
};
