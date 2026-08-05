import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Editor } from '@tiptap/react';
import { makeEditor } from '../../utils/make-editor';
import { DBlockDragHandle, resolveTopLevelBlock } from './dblock-drag-handle';
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

describe('resolveTopLevelBlock', () => {
  let editor: Editor;
  afterEach(() => editor?.destroy());

  it('resolves a top-level dBlock', () => {
    editor = makeEditor('<p>hello</p>');
    const resolved = resolveTopLevelBlock(editor, 0);
    expect(resolved?.node.type.name).toBe('dBlock');
    expect(resolved?.pos).toBe(0);
  });

  it('resolves non-dBlock top-level nodes so their controls act on the whole block', () => {
    // The DragHandle plugin targets the depth-1 node, so inside a columns
    // layout (or on a pageBreak) the hovered node is never a dBlock. These
    // must resolve — a null here renders live-looking Plus/menu buttons
    // whose every action silently no-ops.
    editor = makeEditor('<p>hello</p>');
    editor.commands.insertContentAt(editor.state.doc.content.size, {
      type: 'pageBreak',
    });
    let pageBreakPos = -1;
    editor.state.doc.forEach((node, pos) => {
      if (node.type.name === 'pageBreak') pageBreakPos = pos;
    });
    expect(pageBreakPos).toBeGreaterThan(-1);

    const resolved = resolveTopLevelBlock(editor, pageBreakPos);
    expect(resolved?.node.type.name).toBe('pageBreak');
  });

  it('returns null for nested and out-of-range positions', () => {
    editor = makeEditor('<p>hello</p>');
    // depth > 0: inside the paragraph
    expect(resolveTopLevelBlock(editor, 2)).toBeNull();
    // beyond the doc (stale pos after a deletion shrank the doc)
    expect(
      resolveTopLevelBlock(editor, editor.state.doc.content.size + 5),
    ).toBeNull();
  });
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

  it('keeps the collapse slot mounted (invisible) so cluster width is constant', () => {
    // The DragHandle plugin computes `left` from the cluster's width at
    // reposition time. If the chevron mounted only for headings, the cluster
    // would widen AFTER positioning and overlap the block's text
    // (paragraph → heading hover). The slot must reserve its width always.
    editor = makeEditor('<p>hello</p>');
    document.body.appendChild(editor.view.dom);
    const { unmount } = render(
      <DBlockDragHandle
        editor={editor}
        runtimeState={DEFAULT_DBLOCK_RUNTIME_STATE}
      />,
    );
    const collapse = document.querySelector('[data-test="collapse-button"]');
    expect(collapse).toBeTruthy();
    expect(collapse!.className).toMatch(/invisible/);
    expect(collapse!.className).toMatch(/pointer-events-none/);

    // Same manual unmount as the first test — see its comment about the
    // DragHandle plugin relocating the element outside React's root.
    try {
      unmount();
    } catch {
      // expected
    }
  });
});
