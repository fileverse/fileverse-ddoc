import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Editor } from '@tiptap/react';
import { makeEditor } from '../../utils/make-editor';
import { DBlockDragHandle } from './dblock-drag-handle';
import { DEFAULT_DBLOCK_RUNTIME_STATE } from './dblock-runtime';

beforeAll(() => {
  // floating-ui in jsdom
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

describe('DBlockDragHandle', () => {
  let editor: Editor;
  afterEach(() => editor?.destroy());

  it('renders the control cluster outside the editable DOM', () => {
    editor = makeEditor('<p>hello</p>');
    document.body.appendChild(editor.view.dom);
    const { unmount } = render(
      <DBlockDragHandle
        editor={editor}
        runtimeState={DEFAULT_DBLOCK_RUNTIME_STATE}
      />,
    );
    const cluster = screen.getByLabelText('block-controls');
    expect(cluster).toBeTruthy();
    expect(editor.view.dom.contains(cluster)).toBe(false);

    // jsdom limitation (verified to be a real DragHandle behavior, not a
    // missing-API gap): @tiptap/extension-drag-handle-react's ProseMirror
    // plugin physically relocates its rendered element into a `wrapper` div
    // appended next to `editor.view.dom`, outside React's root, without
    // informing React. React's own unmount bookkeeping still expects the
    // node to be a direct child of the root container, so its cleanup call
    // throws `NotFoundError: The node to be removed is not a child of this
    // node.`. Testing-library's automatic global `afterEach(cleanup)` does
    // not catch that error, which fails the test even though every assertion
    // above already passed. Unmounting here ourselves, inside a try/catch,
    // moves that same (already-verified-harmless) exception into code that
    // handles it, so global cleanup becomes a no-op.
    try {
      unmount();
    } catch {
      // expected — see comment above.
    }
  });

  it('does not tear down and re-register the drag handle plugin on re-render', () => {
    // Regression guard: `computePositionConfig`/`onNodeChange` must keep a
    // stable identity across renders. DragHandle's internal effect depends
    // on both by reference and its cleanup calls `editor.unregisterPlugin`
    // — a new identity every render would unregister/re-register the
    // plugin every render, which resets the handle to hidden each time and
    // it can never stay visible.
    editor = makeEditor('<p>hello</p>');
    document.body.appendChild(editor.view.dom);
    const unregisterSpy = vi.spyOn(editor, 'unregisterPlugin');
    const { rerender, unmount } = render(
      <DBlockDragHandle
        editor={editor}
        runtimeState={DEFAULT_DBLOCK_RUNTIME_STATE}
      />,
    );
    unregisterSpy.mockClear();

    rerender(
      <DBlockDragHandle
        editor={editor}
        runtimeState={DEFAULT_DBLOCK_RUNTIME_STATE}
      />,
    );

    expect(unregisterSpy).not.toHaveBeenCalled();

    // Same jsdom/React DOM-ownership limitation as the first test — see its
    // comment for the full explanation.
    try {
      unmount();
    } catch {
      // expected
    }
  });

  it('renders nothing in presentation preview', () => {
    editor = makeEditor('<p>hello</p>');
    const { container } = render(
      <DBlockDragHandle
        editor={editor}
        runtimeState={{
          ...DEFAULT_DBLOCK_RUNTIME_STATE,
          isPresentationMode: true,
          isPreviewMode: true,
        }}
      />,
    );
    expect(container.querySelector('[aria-label="block-controls"]')).toBeNull();
  });
});
