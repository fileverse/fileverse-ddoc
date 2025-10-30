import { Editor } from '@tiptap/core';

export const getCurrentFontFamily = (editor: Editor | null) => {
  if (!editor) return 'Default';

  const { state } = editor;
  const { from, empty } = state.selection;

  // If a range is selected, Tiptap merges attrs across it:
  if (!empty) {
    return editor.getAttributes('textStyle')?.fontFamily;
  }

  // Caret: inspect marks at the position (ignore storedMarks)
  const $pos = state.doc.resolve(from);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mark = $pos.marks().find((m: any) => m.type.name === 'textStyle');
  return mark?.attrs?.fontFamily || 'Default';
};
