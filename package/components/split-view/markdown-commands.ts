import { EditorSelection, ChangeSpec } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/**
 * Markdown text operations for the Split View CodeMirror pane — the toolbar
 * routes formatting actions here when Split View is active (HackMD-style).
 */

/** Wrap each selected range with `before`/`after`; toggles off if already wrapped. */
export const wrapSelection = (
  view: EditorView,
  before: string,
  after = before,
) => {
  const { state } = view;
  const tr = state.changeByRange((range) => {
    const selected = state.sliceDoc(range.from, range.to);
    const pre = state.sliceDoc(
      Math.max(0, range.from - before.length),
      range.from,
    );
    const post = state.sliceDoc(
      range.to,
      Math.min(state.doc.length, range.to + after.length),
    );

    // Toggle off when the markers already surround the selection.
    if (pre === before && post === after) {
      return {
        changes: [
          { from: range.from - before.length, to: range.from, insert: '' },
          { from: range.to, to: range.to + after.length, insert: '' },
        ],
        range: EditorSelection.range(
          range.from - before.length,
          range.to - before.length,
        ),
      };
    }

    const insert = before + selected + after;
    return {
      changes: { from: range.from, to: range.to, insert },
      range: EditorSelection.range(
        range.from + before.length,
        range.from + before.length + selected.length,
      ),
    };
  });
  view.dispatch(state.update(tr, { scrollIntoView: true }));
  view.focus();
};

const eachSelectedLine = (
  view: EditorView,
  fn: (lineText: string, lineFrom: number) => ChangeSpec | null,
) => {
  const { state } = view;
  const changes: ChangeSpec[] = [];
  const seen = new Set<number>();
  for (const range of state.selection.ranges) {
    let pos = range.from;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const line = state.doc.lineAt(pos);
      if (!seen.has(line.number)) {
        seen.add(line.number);
        const change = fn(line.text, line.from);
        if (change) changes.push(change);
      }
      if (line.to >= range.to) break;
      pos = line.to + 1;
    }
  }
  if (changes.length) {
    view.dispatch(state.update({ changes, scrollIntoView: true }));
  }
  view.focus();
};

/** Toggle a line prefix (e.g. "- ", "1. ", "> ", "- [ ] ") on each selected line. */
export const toggleLinePrefix = (view: EditorView, prefix: string) =>
  eachSelectedLine(view, (text, from) =>
    text.startsWith(prefix)
      ? { from, to: from + prefix.length, insert: '' }
      : { from, insert: prefix },
  );

/** Toggle / set an ATX heading of `level` on each selected line. */
export const setHeading = (view: EditorView, level: number) => {
  const hashes = '#'.repeat(level) + ' ';
  return eachSelectedLine(view, (text, from) => {
    const match = text.match(/^(#{1,6})\s/);
    if (match && match[1].length === level) {
      return { from, to: from + match[0].length, insert: '' }; // toggle off
    }
    if (match) {
      return { from, to: from + match[0].length, insert: hashes }; // change level
    }
    return { from, insert: hashes };
  });
};

/** Strip any ATX heading marker from each selected line (→ normal text). */
export const clearHeading = (view: EditorView) =>
  eachSelectedLine(view, (text, from) => {
    const match = /^#{1,6}\s/.exec(text);
    return match ? { from, to: from + match[0].length, insert: '' } : null;
  });

/** Insert a block (code fence, hr, table) on its own paragraph at the cursor. */
export const insertBlock = (view: EditorView, block: string) => {
  const { state } = view;
  const range = state.selection.main;
  const line = state.doc.lineAt(range.from);
  const onEmptyLine = line.text.trim() === '';
  const lead = onEmptyLine ? '' : '\n\n';
  const insert = `${lead}${block}\n`;
  view.dispatch(
    state.update({
      changes: { from: range.from, insert },
      selection: { anchor: range.from + insert.length },
      scrollIntoView: true,
    }),
  );
  view.focus();
};

/** Insert a markdown link using the current selection as the link text. */
export const insertLink = (view: EditorView, url: string) => {
  const { state } = view;
  const tr = state.changeByRange((range) => {
    const text = state.sliceDoc(range.from, range.to) || 'link';
    const insert = `[${text}](${url})`;
    return {
      changes: { from: range.from, to: range.to, insert },
      range: EditorSelection.range(range.from, range.from + insert.length),
    };
  });
  view.dispatch(state.update(tr, { scrollIntoView: true }));
  view.focus();
};

const MARKDOWN_TABLE =
  '| Column 1 | Column 2 |\n| -------- | -------- |\n|          |          |';

// Convenience wrappers used by the toolbar router.
export const mdCommands = {
  bold: (v: EditorView) => wrapSelection(v, '**'),
  italic: (v: EditorView) => wrapSelection(v, '*'),
  strike: (v: EditorView) => wrapSelection(v, '~~'),
  inlineCode: (v: EditorView) => wrapSelection(v, '`'),
  underline: (v: EditorView) => wrapSelection(v, '<u>', '</u>'),
  heading: (v: EditorView, level: number) => setHeading(v, level),
  paragraph: (v: EditorView) => clearHeading(v),
  bulletList: (v: EditorView) => toggleLinePrefix(v, '- '),
  orderedList: (v: EditorView) => toggleLinePrefix(v, '1. '),
  taskList: (v: EditorView) => toggleLinePrefix(v, '- [ ] '),
  blockquote: (v: EditorView) => toggleLinePrefix(v, '> '),
  codeBlock: (v: EditorView) => insertBlock(v, '```\n\n```'),
  horizontalRule: (v: EditorView) => insertBlock(v, '---'),
  table: (v: EditorView) => insertBlock(v, MARKDOWN_TABLE),
  link: (v: EditorView, url: string) => insertLink(v, url),
  // Inline styling → inline HTML (round-trips via our turndown/DOMPurify rules).
  textColor: (v: EditorView, color: string) =>
    wrapSelection(v, `<span style="color: ${color}">`, '</span>'),
  highlight: (v: EditorView, color?: string) =>
    color
      ? wrapSelection(v, `<mark style="background-color: ${color}">`, '</mark>')
      : wrapSelection(v, '<mark>', '</mark>'),
  fontFamily: (v: EditorView, family: string) =>
    wrapSelection(v, `<span style="font-family: ${family}">`, '</span>'),
  fontSize: (v: EditorView, size: string) =>
    wrapSelection(v, `<span style="font-size: ${size}">`, '</span>'),
};
