import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import getEditorScrollContainer from '../utils/get-editor-scroll-container';

// Comfort band (TEC-2948): within `threshold` px of the bottom, ProseMirror
// parks the caret `margin` px away; the gap is hysteresis. Top keeps the
// defaults because Chrome reveals upward moves itself.
const BAND = { threshold: 120, margin: 160 };
// A vertical arrow press pre-scrolls so the target line is already visible;
// otherwise Chrome centres a hidden target line, a half-screen jump.
const ARROW_EDGE = { top: 64, bottom: BAND.margin };
const NAVIGATION_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

const caretBox = (view: EditorView) => {
  const container = getEditorScrollContainer({
    targetElement: view.dom,
    editorRoot: view.dom,
  });
  if (!container) return null;
  try {
    const caret = view.coordsAtPos(view.state.selection.head);
    const rect = container.getBoundingClientRect();
    return {
      container,
      top: caret.top - rect.top,
      bottom: rect.bottom - caret.bottom,
    };
  } catch {
    return null;
  }
};

export const CaretScrollBand = Extension.create({
  name: 'caretScrollBand',

  addProseMirrorPlugins() {
    let navigating = false;

    return [
      new Plugin({
        key: new PluginKey('caretScrollBand'),
        props: {
          scrollThreshold: {
            top: 0,
            bottom: BAND.threshold,
            left: 0,
            right: 0,
          },
          scrollMargin: { top: 5, bottom: BAND.margin, left: 5, right: 5 },
          handleKeyDown(view, event) {
            navigating = NAVIGATION_KEYS.has(event.key);
            const vertical =
              event.key === 'ArrowUp' || event.key === 'ArrowDown';
            if (!vertical || event.altKey || event.ctrlKey || event.metaKey) {
              return false;
            }
            if (!(view.state.selection instanceof TextSelection)) return false;
            const box = caretBox(view);
            if (!box) return false;
            if (event.key === 'ArrowUp' && box.top < ARROW_EDGE.top) {
              box.container.scrollTop -= ARROW_EDGE.top - box.top;
            } else if (
              event.key === 'ArrowDown' &&
              box.bottom < ARROW_EDGE.bottom
            ) {
              box.container.scrollTop += ARROW_EDGE.bottom - box.bottom;
            }
            return false;
          },
          // Navigation keys never trigger the band: a visible caret stays put,
          // a hidden one falls through to ProseMirror's default handling.
          handleScrollToSelection(view) {
            if (!navigating) return false;
            const box = caretBox(view);
            return !!box && box.top >= 0 && box.bottom >= 0;
          },
        },
      }),
    ];
  },
});
