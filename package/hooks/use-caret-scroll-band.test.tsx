// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Editor } from '@tiptap/react';
import * as Y from 'yjs';
import { getHeadlessExtensions } from './use-headless-editor';
import {
  computeCaretScrollProps,
  useCaretScrollBand,
} from './use-caret-scroll-band';

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  callback: ResizeObserverCallback;
  observed: Element[] = [];
  disconnected = false;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }

  observe(target: Element) {
    this.observed.push(target);
  }

  unobserve() {}

  disconnect() {
    this.disconnected = true;
  }

  trigger() {
    this.callback(
      [] as ResizeObserverEntry[],
      this as unknown as ResizeObserver,
    );
  }
}

describe('computeCaretScrollProps', () => {
  it('derives threshold and margin from the container height', () => {
    expect(computeCaretScrollProps(600)).toEqual({
      scrollThreshold: { top: 60, bottom: 240, left: 0, right: 0 },
      scrollMargin: { top: 60, bottom: 240, left: 5, right: 5 },
    });
  });

  it('rounds fractional pixels', () => {
    const result = computeCaretScrollProps(733);
    expect(result.scrollThreshold.top).toBe(73);
    expect(result.scrollThreshold.bottom).toBe(293);
  });
});

describe('useCaretScrollBand', () => {
  let ydoc: Y.Doc;
  let container: HTMLDivElement;
  let editor: Editor;

  beforeEach(() => {
    FakeResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    ydoc = new Y.Doc();
    container = document.createElement('div');
    container.setAttribute('data-editor-scroll-container', 'true');
    container.style.overflowY = 'auto';
    Object.defineProperty(container, 'clientHeight', {
      value: 600,
      configurable: true,
    });
    Object.defineProperty(container, 'scrollHeight', {
      value: 2000,
      configurable: true,
    });
    document.body.appendChild(container);
    editor = new Editor({
      extensions: getHeadlessExtensions({ ydoc, field: 'tab-a' }),
    });
    container.appendChild(editor.view.dom);
  });

  afterEach(() => {
    editor.destroy();
    ydoc.destroy();
    container.remove();
    vi.unstubAllGlobals();
  });

  it('applies the computed props on mount, keeping other editorProps untouched', () => {
    editor.setOptions({
      editorProps: { attributes: { class: 'keep-me' } },
    });

    renderHook(() => useCaretScrollBand(editor));

    expect(editor.options.editorProps.scrollThreshold).toEqual({
      top: 60,
      bottom: 240,
      left: 0,
      right: 0,
    });
    expect(editor.options.editorProps.scrollMargin).toEqual({
      top: 60,
      bottom: 240,
      left: 5,
      right: 5,
    });
    expect(editor.options.editorProps.attributes).toEqual({
      class: 'keep-me',
    });
  });

  it('observes the scroll container and reapplies props on resize', () => {
    renderHook(() => useCaretScrollBand(editor));

    expect(FakeResizeObserver.instances).toHaveLength(1);
    const observer = FakeResizeObserver.instances[0];
    expect(observer.observed).toEqual([container]);

    Object.defineProperty(container, 'clientHeight', {
      value: 1000,
      configurable: true,
    });
    observer.trigger();

    expect(editor.options.editorProps.scrollThreshold).toEqual(
      expect.objectContaining({ top: 100, bottom: 400 }),
    );
    expect(editor.options.editorProps.scrollMargin).toEqual({
      top: 100,
      bottom: 400,
      left: 5,
      right: 5,
    });
  });

  it('does not apply props when the container has no scrollable overflow (Split View)', () => {
    container.style.overflowY = 'visible';

    expect(() => {
      renderHook(() => useCaretScrollBand(editor));
    }).not.toThrow();

    expect(editor.options.editorProps.scrollThreshold).toBeUndefined();
    expect(editor.options.editorProps.scrollMargin).toBeUndefined();
  });

  it('keeps the previously applied props when a resize fires while the container is non-scrollable', () => {
    renderHook(() => useCaretScrollBand(editor));
    const observer = FakeResizeObserver.instances[0];

    container.style.overflowY = 'visible';
    Object.defineProperty(container, 'clientHeight', {
      value: 4000,
      configurable: true,
    });
    observer.trigger();

    expect(editor.options.editorProps.scrollThreshold).toEqual({
      top: 60,
      bottom: 240,
      left: 0,
      right: 0,
    });
    expect(editor.options.editorProps.scrollMargin).toEqual({
      top: 60,
      bottom: 240,
      left: 5,
      right: 5,
    });
  });

  it('does not call setOptions again when the height is unchanged', () => {
    renderHook(() => useCaretScrollBand(editor));
    const observer = FakeResizeObserver.instances[0];
    const setOptionsSpy = vi.spyOn(editor, 'setOptions');

    observer.trigger();

    expect(setOptionsSpy).not.toHaveBeenCalled();
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = renderHook(() => useCaretScrollBand(editor));
    const observer = FakeResizeObserver.instances[0];

    unmount();

    expect(observer.disconnected).toBe(true);
  });

  it('applies props once and does not throw when ResizeObserver is undefined', () => {
    vi.stubGlobal('ResizeObserver', undefined);

    expect(() => {
      renderHook(() => useCaretScrollBand(editor));
    }).not.toThrow();

    expect(editor.options.editorProps.scrollThreshold).toEqual({
      top: 60,
      bottom: 240,
      left: 0,
      right: 0,
    });
  });

  it('does nothing and does not throw when editor is null', () => {
    expect(() => {
      renderHook(() => useCaretScrollBand(null));
    }).not.toThrow();
  });
});
