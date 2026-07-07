import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/react';
import { insertCommands } from './insert-commands';
// Use the same extension assembly the headless editor uses so custom nodes
// (callout, pageBreak, columns, dBlock) are registered:
import { getHeadlessExtensions } from '../hooks/use-headless-editor';

describe('insertCommands', () => {
  let editor: Editor;
  beforeEach(() => {
    editor = new Editor({ extensions: getHeadlessExtensions() });
    // Collaboration owns the doc, so constructor `content` is ignored —
    // set it the way useHeadlessEditor's setContent does.
    editor.commands.setContent('<p>hello</p>');
  });
  afterEach(() => {
    editor.destroy();
  });

  it('quote wraps the current block in a blockquote', () => {
    editor.commands.setTextSelection(3); // cursor inside "hello", like the slash flow
    insertCommands.quote(editor);
    expect(editor.getHTML()).toContain('<blockquote');
  });

  it('divider inserts a horizontal rule', () => {
    insertCommands.divider(editor);
    expect(editor.getHTML()).toContain('<hr');
  });

  it('codeBlock toggles a code block', () => {
    insertCommands.codeBlock(editor);
    expect(editor.isActive('codeBlock')).toBe(true);
  });

  it('callout inserts the callout node', () => {
    insertCommands.callout(editor);
    expect(editor.getHTML()).toContain('callout');
  });
});
