import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Editor } from '@tiptap/react';
import { useEditorCommands } from './use-editor-commands';
import { getHeadlessExtensions } from './use-headless-editor';

describe('useEditorCommands', () => {
  let editor: Editor;
  beforeEach(() => {
    editor = new Editor({ extensions: getHeadlessExtensions() });
    // Collaboration owns the doc — set content post-construction.
    editor.commands.setContent('<p>hello world</p>');
    editor.commands.selectAll();
  });
  afterEach(() => {
    editor.destroy();
  });

  it('format.bold toggles bold and reports isActive', () => {
    const { result } = renderHook(() => useEditorCommands(editor));
    expect(result.current['format.bold'].isActive).toBe(false);
    act(() => result.current['format.bold'].run());
    expect(editor.isActive('bold')).toBe(true);
    expect(result.current['format.bold'].isActive).toBe(true);
  });

  it('format.heading sets and reports the current level', () => {
    editor.commands.setTextSelection(3); // block commands need a cursor inside the block
    const { result } = renderHook(() => useEditorCommands(editor));
    act(() => result.current['format.heading'].run('2'));
    expect(editor.isActive('heading', { level: 2 })).toBe(true);
    expect(result.current['format.heading'].current).toBe('2');
  });

  it('edit.undo isEnabled mirrors undo depth', () => {
    const { result } = renderHook(() => useEditorCommands(editor));
    expect(result.current['edit.undo'].isEnabled).toBe(editor.can().undo());
    act(() => {
      editor.chain().focus().toggleBold().run();
    });
    expect(editor.can().undo()).toBe(true);
    expect(result.current['edit.undo'].isEnabled).toBe(true);
  });

  it('two hook instances on one editor never diverge (invariant I1/I2)', () => {
    const a = renderHook(() => useEditorCommands(editor));
    const b = renderHook(() => useEditorCommands(editor));
    act(() => a.result.current['format.bold'].run()); // mutate via instance A
    expect(b.result.current['format.bold'].isActive).toBe(true); // B observes it
    expect(a.result.current['format.bold'].isActive).toBe(
      b.result.current['format.bold'].isActive,
    );
  });

  it('returns disabled no-op commands for a null editor', () => {
    const { result } = renderHook(() => useEditorCommands(null));
    expect(result.current['format.bold'].isEnabled).toBe(false);
    expect(() => result.current['format.bold'].run()).not.toThrow();
  });
});
