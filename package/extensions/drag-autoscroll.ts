import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import getEditorScrollContainer from '../utils/get-editor-scroll-container';

// Chrome only autoscrolls a native drag inside a 20px belt at the scroll
// container's own edges, and aborts whenever the pointer is over a fixed
// element. The fixed footer covers the whole bottom belt and the toolbar sits
// on the top one (TEC-2947), so we drive the scroll ourselves from dragover.
const BAND = 100;
const MAX_STEP = 20;
// Chrome fires dragover ~every 50ms even while the pointer rests; no event
// for this long means the drag left the window or ended without a drop.
const STALE_MS = 300;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// Signed px per frame for a pointer at `y`, given the container's visible
// top/bottom edges. Positions beyond an edge saturate, so overshooting onto
// fixed chrome keeps scrolling at full speed.
export const dragScrollStep = (y: number, top: number, bottom: number) => {
  if (y < top + BAND) return -MAX_STEP * clamp01((top + BAND - y) / BAND);
  if (y > bottom - BAND)
    return MAX_STEP * clamp01((y - (bottom - BAND)) / BAND);
  return 0;
};

const canScroll = (el: HTMLElement) => el.scrollHeight - el.clientHeight > 1;

// The explicit container is not the scroller in Split View (overflow visible,
// the pane wrapper scrolls), so walk up to whatever actually scrolls.
const resolveScroller = (view: EditorView) => {
  let el: HTMLElement | null = getEditorScrollContainer({
    targetElement: view.dom,
    editorRoot: view.dom,
  });
  while (el && !canScroll(el)) el = el.parentElement;
  return el;
};

export const DragAutoscroll = Extension.create({
  name: 'dragAutoscroll',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('dragAutoscroll'),
        view(view) {
          if (typeof document === 'undefined') return {};

          let pointer: { x: number; y: number } | null = null;
          let lastEventAt = 0;
          let rafId: number | null = null;

          const stop = () => {
            pointer = null;
            if (rafId !== null) cancelAnimationFrame(rafId);
            rafId = null;
          };

          const tick = () => {
            rafId = null;
            if (!pointer || Date.now() - lastEventAt > STALE_MS) {
              stop();
              return;
            }
            const scroller = resolveScroller(view);
            if (scroller) {
              const rect = scroller.getBoundingClientRect();
              const top = Math.max(rect.top, 0);
              const bottom = Math.min(rect.bottom, window.innerHeight);
              if (pointer.x >= rect.left && pointer.x <= rect.right) {
                const step = dragScrollStep(pointer.y, top, bottom);
                if (step) scroller.scrollTop += step;
              }
            }
            rafId = requestAnimationFrame(tick);
          };

          const onDragOver = (event: DragEvent) => {
            if (!view.editable || !view.dom.isConnected) return;
            pointer = { x: event.clientX, y: event.clientY };
            lastEventAt = Date.now();
            if (rafId === null) rafId = requestAnimationFrame(tick);
          };

          document.addEventListener('dragover', onDragOver);
          document.addEventListener('drop', stop);
          document.addEventListener('dragend', stop);

          return {
            destroy() {
              stop();
              document.removeEventListener('dragover', onDragOver);
              document.removeEventListener('drop', stop);
              document.removeEventListener('dragend', stop);
            },
          };
        },
      }),
    ];
  },
});
