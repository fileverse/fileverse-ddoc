import type { Editor } from '@tiptap/core';

const isWordChar = (ch: string) => /\S/.test(ch);

/**
 * Cursor-relative word range in the current textblock, or null when the
 * cursor is not adjacent to a word character (whitespace runs, empty
 * blocks). Position math is relative ($from.start() + parentOffset), so it
 * is schema-agnostic (works under dBlock wrappers).
 */
export const findWordRangeAtCursor = (
  editor: Editor,
): { from: number; to: number } | null => {
  const $from = editor.state.selection.$from;
  const text = $from.parent.textContent;
  const offset = $from.parentOffset;
  let start = offset;
  let end = offset;
  while (start > 0 && isWordChar(text[start - 1])) start--;
  while (end < text.length && isWordChar(text[end])) end++;
  if (start === end) return null;
  const base = $from.start();
  return { from: base + start, to: base + end };
};

/**
 * Ensure a text target for anchored actions (inline comments): keep any
 * existing selection; otherwise select the word under the collapsed cursor.
 * Shares findWordRangeAtCursor with enablement so "enabled" always implies
 * "dispatch does something".
 */
export const selectWordAtCursor = (editor: Editor): boolean => {
  if (!editor.state.selection.empty) return true;
  const range = findWordRangeAtCursor(editor);
  if (!range) return false;
  return editor.chain().setTextSelection(range).run();
};
