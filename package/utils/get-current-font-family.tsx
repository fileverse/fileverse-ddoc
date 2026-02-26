import { Editor } from '@tiptap/core';
import { fontStacks } from '../components/editor-utils';

const normalizeFont = (font: string | undefined): string | undefined => {
  if (!font) return undefined;
  // If it's already a title (one of the keys in fontStacks), return it
  if (fontStacks[font]) return font;
  // Otherwise, find the title that matches this stack
  const title = Object.keys(fontStacks).find((key) => fontStacks[key] === font);
  return title || font;
};

export const getCurrentFontFamily = (editor: Editor | null) => {
  if (!editor) return 'Default';

  const { state } = editor;
  const { from, empty } = state.selection;

  // 1) If caret & there are stored marks, show the "pending" font
  if (empty && state.storedMarks?.length) {
    const m = state.storedMarks.find((m) => m.type.name === 'textStyle');
    if (m?.attrs?.fontFamily)
      return normalizeFont(m.attrs.fontFamily) || 'Default';
  }

  // 2) If caret, inspect marks at the actual cursor position
  if (empty) {
    const $pos = state.doc.resolve(from);
    const m = $pos.marks().find((m) => m.type.name === 'textStyle');
    if (m?.attrs?.fontFamily)
      return normalizeFont(m.attrs.fontFamily) || 'Default';

    // Check for fontFamily attribute on the current block node (e.g., paragraph)
    const node = $pos.node($pos.depth);
    if (node?.attrs?.fontFamily)
      return normalizeFont(node.attrs.fontFamily) || 'Default';

    return 'Default';
  }

  // 3) If range, use merged attributes across selection
  const markFont = editor.getAttributes('textStyle')?.fontFamily;
  if (markFont) return normalizeFont(markFont) || 'Default';

  const nodeFont = editor.getAttributes('paragraph')?.fontFamily;
  if (nodeFont) return normalizeFont(nodeFont) || 'Default';

  return 'Default';
};
