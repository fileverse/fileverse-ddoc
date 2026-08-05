import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { Editor } from '@tiptap/react';
import { makeEditor } from '../../utils/make-editor';

const YT = 'https://youtu.be/abc12345';
const LINK_PARAGRAPH = `<p><a href="${YT}">${YT}</a></p>`;

const hasIframe = (editor: Editor) => {
  let found = false;
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'iframe') found = true;
  });
  return found;
};

describe('dblock media conversion plugin', () => {
  let editor: Editor;

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    editor?.destroy();
    vi.useRealTimers();
  });

  it('does NOT convert a link paragraph while the caret is inside it', () => {
    editor = makeEditor(LINK_PARAGRAPH);
    // caret inside the link text — the user is still working on this line
    editor.commands.setTextSelection(5);

    vi.advanceTimersByTime(1500);

    expect(hasIframe(editor)).toBe(false);
    // and the caret must not have been yanked
    expect(editor.state.selection.from).toBe(5);
  });

  it('converts once the caret is elsewhere', () => {
    editor = makeEditor(LINK_PARAGRAPH);
    // add a second block and put the caret there; the insert re-arms the
    // conversion timer
    editor
      .chain()
      .insertContentAt(editor.state.doc.content.size, {
        type: 'dBlock',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }],
      })
      .run();
    editor.commands.setTextSelection(editor.state.doc.content.size - 2);

    vi.advanceTimersByTime(1500);

    expect(hasIframe(editor)).toBe(true);
  });
});
