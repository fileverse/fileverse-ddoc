import { EditorSelection, ChangeSpec } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { undo as cmUndo, redo as cmRedo } from '@codemirror/commands';

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

/**
 * Insert a markdown link inline (HackMD-style): the selection becomes the link
 * text and the cursor lands on the URL placeholder so the user just types it.
 */
export const insertLink = (view: EditorView, url?: string) => {
  const { state } = view;
  const tr = state.changeByRange((range) => {
    const text = state.sliceDoc(range.from, range.to) || 'text';
    const href = url ?? 'url';
    const insert = `[${text}](${href})`;
    // Select the href so typing replaces the placeholder.
    const hrefStart = range.from + 1 + text.length + 2;
    return {
      changes: { from: range.from, to: range.to, insert },
      range: EditorSelection.range(hrefStart, hrefStart + href.length),
    };
  });
  view.dispatch(state.update(tr, { scrollIntoView: true }));
  view.focus();
};

/**
 * Insert an uploaded secure image as inline HTML. Mirrors the attributes the
 * markdown paste flow sets (media-type="secure-img" + IPFS/encryption attrs),
 * so it parses back into a real secure-image node and round-trips.
 */
export const insertSecureImage = (
  view: EditorView,
  attrs: {
    src: string;
    ipfsUrl: string;
    encryptionKey: string;
    nonce: string;
    ipfsHash: string;
    authTag: string;
    mimeType: string;
  },
) => {
  const img =
    `<img src="${attrs.src}" media-type="secure-img" ` +
    `encryptionKey="${attrs.encryptionKey}" nonce="${attrs.nonce}" ` +
    `ipfsUrl="${attrs.ipfsUrl}" ipfsHash="${attrs.ipfsHash}" version="2" ` +
    `authTag="${attrs.authTag}" mimeType="${attrs.mimeType}" />`;
  insertBlock(view, img);
};

/**
 * Insert a base64-embedded image (media-type="img"). Mirrors the editor's
 * no-uploader fallback in startImageUpload, so it renders + round-trips.
 */
export const insertEmbeddedImage = (view: EditorView, dataUrl: string) =>
  insertBlock(view, `<img src="${dataUrl}" media-type="img" />`);

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
  bulletList: (v: EditorView) => toggleLinePrefix(v, '- '),
  orderedList: (v: EditorView) => toggleLinePrefix(v, '1. '),
  taskList: (v: EditorView) => toggleLinePrefix(v, '- [ ] '),
  blockquote: (v: EditorView) => toggleLinePrefix(v, '> '),
  codeBlock: (v: EditorView) => insertBlock(v, '```\n\n```'),
  horizontalRule: (v: EditorView) => insertBlock(v, '---'),
  table: (v: EditorView) => insertBlock(v, MARKDOWN_TABLE),
  link: (v: EditorView, url?: string) => insertLink(v, url),
  undo: (v: EditorView) => {
    cmUndo(v);
    v.focus();
  },
  redo: (v: EditorView) => {
    cmRedo(v);
    v.focus();
  },
  // Highlight → inline HTML (round-trips via our turndown/DOMPurify rules).
  highlight: (v: EditorView, color?: string) =>
    color
      ? wrapSelection(v, `<mark style="background-color: ${color}">`, '</mark>')
      : wrapSelection(v, '<mark>', '</mark>'),
};
