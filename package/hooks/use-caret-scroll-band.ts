import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import getEditorScrollContainer, {
  hasScrollableOverflow,
} from '../utils/get-editor-scroll-container';
import { mergeEditorProps } from '../components/editor-utils';

// Fractions of the scroll container height. Bottom: once the caret is this
// close to the bottom, each new line scrolls by one line so the caret parks
// there (TEC-2948). Top: same idea when moving upward.
const CARET_SCROLL_BAND = { top: 0.1, bottom: 0.4 } as const;

const PM_DEFAULT_SCROLL_MARGIN = 5;

export const computeCaretScrollProps = (clientHeight: number) => {
  const top = Math.round(clientHeight * CARET_SCROLL_BAND.top);
  const bottom = Math.round(clientHeight * CARET_SCROLL_BAND.bottom);
  return {
    scrollThreshold: { top, bottom, left: 0, right: 0 },
    scrollMargin: {
      top,
      bottom,
      left: PM_DEFAULT_SCROLL_MARGIN,
      right: PM_DEFAULT_SCROLL_MARGIN,
    },
  };
};

export const useCaretScrollBand = (editor: Editor | null) => {
  useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.view?.dom) return;
    const dom = editor.view.dom;
    const container =
      getEditorScrollContainer({ targetElement: dom, editorRoot: dom }) ??
      document.querySelector<HTMLElement>(
        '[data-editor-scroll-container="true"]',
      );
    if (!container) return;

    let lastAppliedHeight = -1;
    const apply = () => {
      const height = container.clientHeight;
      if (height <= 0 || height === lastAppliedHeight || editor.isDestroyed) {
        return;
      }
      // Split View swaps this container to overflow-visible and moves it
      // inside a taller scroller, so clientHeight becomes the full document
      // height rather than the viewport (TEC-2948). Skip in that state.
      if (!hasScrollableOverflow(container)) return;
      lastAppliedHeight = height;
      mergeEditorProps(editor, computeCaretScrollProps(height));
    };

    apply();

    if (typeof ResizeObserver === 'undefined') return;
    const resizeObserver = new ResizeObserver(apply);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [editor]);
};
