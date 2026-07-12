import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Editor } from '@tiptap/react';
import { useEditorCommands } from './use-editor-commands';
import { makeEditor } from '../utils/make-editor';

describe('useEditorCommands', () => {
  let editor: Editor;
  beforeEach(() => {
    // Collaboration owns the doc — content is set post-construction inside makeEditor.
    editor = makeEditor('<p>hello world</p>');
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

  it('insert.quote reports blockquote active state', () => {
    editor.commands.setTextSelection(3);
    const { result } = renderHook(() => useEditorCommands(editor));
    expect(result.current['insert.quote'].isActive).toBe(false);
    act(() => result.current['insert.quote'].run());
    expect(result.current['insert.quote'].isActive).toBe(true);
  });

  it('format.direction sets and reports paragraph direction', () => {
    editor.commands.setTextSelection(3);
    const { result } = renderHook(() => useEditorCommands(editor));
    act(() => result.current['format.direction'].run('rtl'));
    expect(editor.isActive('paragraph', { dir: 'rtl' })).toBe(true);
    expect(result.current['format.direction'].current).toBe('rtl');
  });

  it('edit.delete removes the selection and tracks enablement', () => {
    const { result } = renderHook(() => useEditorCommands(editor));
    expect(result.current['edit.delete'].isEnabled).toBe(true); // selectAll in setup
    act(() => result.current['edit.delete'].run());
    expect(editor.getText()).not.toContain('hello world');
  });

  it('table commands enable only inside a table and operate on it', () => {
    editor.commands.setTextSelection(3);
    const { result } = renderHook(() => useEditorCommands(editor));
    expect(result.current['table.addRowBelow'].isEnabled).toBe(false);
    act(() => result.current['insert.table'].run()); // 3x2 with header row
    expect(result.current['table.addRowBelow'].isEnabled).toBe(true);
    const rowsBefore = editor.getHTML().match(/<tr/g)?.length ?? 0;
    act(() => result.current['table.addRowBelow'].run());
    const rowsAfter = editor.getHTML().match(/<tr/g)?.length ?? 0;
    expect(rowsAfter).toBe(rowsBefore + 1);
    act(() => result.current['table.deleteTable'].run());
    expect(result.current['table.deleteTable'].isEnabled).toBe(false);
  });

  it('insert.mermaid creates a mermaid code block', () => {
    editor.commands.setTextSelection(3);
    const { result } = renderHook(() => useEditorCommands(editor));
    act(() => result.current['insert.mermaid'].run());
    expect(editor.isActive('codeBlock', { language: 'mermaid' })).toBe(true);
  });

  it('returns disabled no-op commands for a null editor', () => {
    const { result } = renderHook(() => useEditorCommands(null));
    expect(result.current['format.bold'].isEnabled).toBe(false);
    expect(() => result.current['format.bold'].run()).not.toThrow();
  });

  it('re-renders only when a derived value changes (equality-gated)', () => {
    editor.commands.setTextSelection(3);
    let renders = 0;
    renderHook(() => {
      renders++;
      return useEditorCommands(editor);
    });
    // Plain typing changes no derived field (undo depth already > 0 from
    // setup transactions): no re-renders.
    const before = renders;
    act(() => {
      editor.commands.insertContent('a');
    });
    act(() => {
      editor.commands.insertContent('b');
    });
    expect(renders).toBe(before);
    // A transaction that flips a derived field (bold) re-renders once.
    act(() => {
      editor.chain().focus().selectAll().toggleBold().run();
    });
    expect(renders).toBe(before + 1);
  });
});
