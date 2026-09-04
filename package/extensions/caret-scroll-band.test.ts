import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/react';
import type { AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { CaretScrollBand } from './caret-scroll-band';

const keydown = (editor: Editor, key: string, init: KeyboardEventInit = {}) =>
  editor.view.dom.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );

const scrollHandled = (editor: Editor) =>
  editor.view.someProp('handleScrollToSelection', (f) => f(editor.view)) ===
  true;

describe('caretScrollBand', () => {
  let container: HTMLDivElement;
  let editor: Editor;

  // jsdom has no layout: pin the caret rect relative to a 600px container.
  const setCaretTop = (top: number) => {
    editor.view.coordsAtPos = () => ({
      top,
      bottom: top + 20,
      left: 10,
      right: 10,
    });
  };

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('data-editor-scroll-container', 'true');
    container.style.overflowY = 'auto';
    Object.defineProperty(container, 'clientHeight', { value: 600 });
    container.getBoundingClientRect = () =>
      ({ top: 0, bottom: 600, left: 0, right: 800 }) as DOMRect;
    let scrollTop = 500;
    Object.defineProperty(container, 'scrollTop', {
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
    });
    document.body.appendChild(container);
    editor = new Editor({
      element: container,
      extensions: [StarterKit, CaretScrollBand] as AnyExtension[],
      content: '<p>one</p><p>two</p>',
    });
    // ProseMirror probes text-block edges on arrow keys with DOM ranges that
    // jsdom cannot measure; the probe is not under test.
    editor.view.endOfTextblock = () => false;
    setCaretTop(300);
  });

  afterEach(() => {
    editor.destroy();
    container.remove();
  });

  it('exposes the band as scroll props with all four sides set', () => {
    expect(editor.view.someProp('scrollThreshold')).toEqual({
      top: 0,
      bottom: 120,
      left: 0,
      right: 0,
    });
    expect(editor.view.someProp('scrollMargin')).toEqual({
      top: 5,
      bottom: 160,
      left: 5,
      right: 5,
    });
  });

  it('leaves scroll-into-view to ProseMirror after a typing key', () => {
    keydown(editor, 'a');
    expect(scrollHandled(editor)).toBe(false);
  });

  it('swallows scroll-into-view after a navigation key while the caret is visible', () => {
    keydown(editor, 'ArrowLeft');
    expect(scrollHandled(editor)).toBe(true);
  });

  it('falls back to ProseMirror after a navigation key when the caret is hidden', () => {
    setCaretTop(-40);
    keydown(editor, 'ArrowLeft');
    expect(scrollHandled(editor)).toBe(false);
  });

  it('pre-scrolls before ArrowUp when the caret is near the top edge', () => {
    setCaretTop(10);
    keydown(editor, 'ArrowUp');
    expect(container.scrollTop).toBe(500 - (64 - 10));
  });

  it('pre-scrolls before ArrowDown when the caret is near the bottom edge', () => {
    setCaretTop(560);
    keydown(editor, 'ArrowDown');
    expect(container.scrollTop).toBe(500 + (160 - 20));
  });

  it('does not pre-scroll mid-screen, for modified arrows, or horizontal keys', () => {
    keydown(editor, 'ArrowUp');
    setCaretTop(10);
    keydown(editor, 'ArrowUp', { metaKey: true });
    keydown(editor, 'ArrowRight');
    expect(container.scrollTop).toBe(500);
  });
});
