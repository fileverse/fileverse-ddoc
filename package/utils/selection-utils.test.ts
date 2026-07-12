import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/react';
import { findWordRangeAtCursor, selectWordAtCursor } from './selection-utils';
import { makeEditor } from './make-editor';

describe('findWordRangeAtCursor', () => {
  let editor: Editor;
  afterEach(() => {
    editor.destroy();
  });

  it('returns the word range with the cursor mid-word', () => {
    editor = makeEditor();
    editor.commands.insertContent('hello world');
    const base = editor.state.selection.$from.start();
    editor.commands.setTextSelection(base + 2); // inside "hello", between "he" and "llo"
    const range = findWordRangeAtCursor(editor)!;
    expect(editor.state.doc.textBetween(range.from, range.to)).toBe('hello');
  });

  it('returns the word range with the cursor at a word end before a space', () => {
    editor = makeEditor();
    editor.commands.insertContent('hello world');
    const base = editor.state.selection.$from.start();
    // position the cursor right after "hello" (adjacent to the space)
    editor.commands.setTextSelection(base + 'hello'.length);
    const range = findWordRangeAtCursor(editor);
    expect(range).not.toBeNull();
    expect(editor.state.doc.textBetween(range!.from, range!.to)).toBe('hello');
  });

  it('returns null with the cursor inside a whitespace run', () => {
    editor = makeEditor();
    editor.commands.insertContent('hello  world'); // two spaces, insertContent preserves them
    const base = editor.state.selection.$from.start();
    editor.commands.setTextSelection(base + 6); // between the two spaces
    expect(findWordRangeAtCursor(editor)).toBeNull();
  });

  it('returns null on an empty block', () => {
    editor = makeEditor();
    expect(findWordRangeAtCursor(editor)).toBeNull();
  });
});

describe('selectWordAtCursor', () => {
  let editor: Editor;
  afterEach(() => {
    editor.destroy();
  });

  it('keeps an existing non-empty selection untouched', () => {
    editor = makeEditor();
    editor.commands.insertContent('hello world');
    const base = editor.state.selection.$from.start();
    editor.commands.setTextSelection({ from: base, to: base + 5 }); // "hello"
    expect(selectWordAtCursor(editor)).toBe(true);
    expect(editor.state.selection.to - editor.state.selection.from).toBe(5);
  });

  it('selects the word under a collapsed cursor', () => {
    editor = makeEditor();
    editor.commands.insertContent('hello world');
    const base = editor.state.selection.$from.start();
    editor.commands.setTextSelection(base + 2);
    expect(selectWordAtCursor(editor)).toBe(true);
    const { from, to } = editor.state.selection;
    expect(editor.state.doc.textBetween(from, to)).toBe('hello');
  });

  it('returns false in a whitespace run (parity with findWordRangeAtCursor)', () => {
    editor = makeEditor();
    editor.commands.insertContent('hello  world');
    const base = editor.state.selection.$from.start();
    editor.commands.setTextSelection(base + 6);
    expect(selectWordAtCursor(editor)).toBe(false);
  });
});
