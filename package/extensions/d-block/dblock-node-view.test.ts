import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/react';
import { makeEditor } from '../../utils/make-editor';

describe('DBlockNodeView (simplified chrome-less wrapper)', () => {
  let editor: Editor;
  afterEach(() => editor?.destroy());

  it('renders no gutter and no per-block padding classes', () => {
    editor = makeEditor('<p>hello</p>');
    const block = editor.view.dom.querySelector('[data-type="d-block"]')!;
    expect(block).toBeTruthy();
    expect(block.querySelector('[data-dblock-gutter]')).toBeNull();
    expect(block.className).not.toMatch(
      /px-4|pl-2|pr-8|pr-\[80px\]|pl-\[8px\]/,
    );
    // contentDOM is the direct (and only) element child
    expect(block.children.length).toBe(1);
    expect(
      (block.firstElementChild as HTMLElement).dataset.nodeViewContent,
    ).toBe('true');
  });

  it('keeps the is-table marker class for table blocks', () => {
    editor = makeEditor(
      '<table><tbody><tr><td><p>x</p></td></tr></tbody></table>',
    );
    const block = editor.view.dom.querySelector('[data-type="d-block"]')!;
    expect(block.className).toMatch(/is-table/);
  });
});
