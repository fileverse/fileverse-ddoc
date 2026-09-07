import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '@tiptap/react';
import type { AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { DragAutoscroll, dragScrollStep } from './drag-autoscroll';

describe('dragScrollStep', () => {
  // Visible container edges: top 100, bottom 700, band 100px.
  it('is zero in the middle of the container', () => {
    expect(dragScrollStep(400, 100, 700)).toBe(0);
    expect(dragScrollStep(200, 100, 700)).toBe(0);
    expect(dragScrollStep(600, 100, 700)).toBe(0);
  });

  it('ramps up towards the bottom edge and saturates past it', () => {
    const half = dragScrollStep(650, 100, 700);
    const edge = dragScrollStep(700, 100, 700);
    const beyond = dragScrollStep(900, 100, 700);
    expect(half).toBeGreaterThan(0);
    expect(edge).toBeGreaterThan(half);
    expect(beyond).toBe(edge);
  });

  it('is negative towards the top edge and saturates above it', () => {
    const half = dragScrollStep(150, 100, 700);
    const edge = dragScrollStep(100, 100, 700);
    const beyond = dragScrollStep(0, 100, 700);
    expect(half).toBeLessThan(0);
    expect(edge).toBeLessThan(half);
    expect(beyond).toBe(edge);
  });
});

describe('DragAutoscroll', () => {
  let container: HTMLDivElement;
  let editor: Editor;
  let scrollTop: number;

  const dragover = (clientY: number, clientX = 400) =>
    editor.view.dom.dispatchEvent(
      new MouseEvent('dragover', { clientX, clientY, bubbles: true }),
    );

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 16),
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));

    container = document.createElement('div');
    container.setAttribute('data-editor-scroll-container', 'true');
    container.style.overflowY = 'auto';
    Object.defineProperty(container, 'clientHeight', { value: 600 });
    Object.defineProperty(container, 'scrollHeight', { value: 3000 });
    container.getBoundingClientRect = () =>
      ({ top: 0, bottom: 600, left: 0, right: 800 }) as DOMRect;
    scrollTop = 500;
    Object.defineProperty(container, 'scrollTop', {
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
    });
    document.body.appendChild(container);
    editor = new Editor({
      element: container,
      extensions: [
        StarterKit.configure({ dropcursor: false }),
        DragAutoscroll,
      ] as AnyExtension[],
      content: '<p>one</p><p>two</p>',
    });
  });

  afterEach(() => {
    editor.destroy();
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('scrolls the container down while a drag hovers the bottom band', () => {
    dragover(590);
    vi.advanceTimersByTime(16 * 5);
    expect(scrollTop).toBeGreaterThan(500);
  });

  it('keeps scrolling when the pointer sits below the container (fixed footer)', () => {
    dragover(620);
    vi.advanceTimersByTime(16 * 5);
    expect(scrollTop).toBeGreaterThan(500);
  });

  it('scrolls up while a drag hovers above the container (toolbar)', () => {
    dragover(-10);
    vi.advanceTimersByTime(16 * 5);
    expect(scrollTop).toBeLessThan(500);
  });

  it('does nothing in the middle of the container', () => {
    dragover(300);
    vi.advanceTimersByTime(16 * 5);
    expect(scrollTop).toBe(500);
  });

  it('stops on drop', () => {
    dragover(590);
    vi.advanceTimersByTime(16 * 2);
    const afterTwoFrames = scrollTop;
    document.dispatchEvent(new MouseEvent('drop', { bubbles: true }));
    vi.advanceTimersByTime(16 * 5);
    expect(scrollTop).toBe(afterTwoFrames);
  });

  it('stops when dragover events go stale', () => {
    dragover(590);
    vi.advanceTimersByTime(16 * 2);
    const afterTwoFrames = scrollTop;
    vi.advanceTimersByTime(1000);
    const afterStale = scrollTop;
    vi.advanceTimersByTime(1000);
    expect(scrollTop).toBe(afterStale);
    expect(afterStale).toBeGreaterThan(afterTwoFrames);
  });

  it('ignores drags when the editor is read-only', () => {
    editor.setEditable(false);
    dragover(590);
    vi.advanceTimersByTime(16 * 5);
    expect(scrollTop).toBe(500);
  });
});
