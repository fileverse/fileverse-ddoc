import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

interface UseSplitResizeOptions {
  /** Left-pane fraction at rest (0–1). */
  defaultRatio?: number;
  /** Clamp so neither pane can collapse. */
  min?: number;
  max?: number;
}

/**
 * Drives a two-pane resizable split. Apply `leftRatio` as the left pane's
 * `flexGrow` and `1 - leftRatio` as the right pane's; dragging the divider
 * updates the ratio.
 *
 * The pointer listeners live on `document` (so the drag keeps tracking when the
 * cursor leaves the thin divider) and are always torn down — on mouse-up AND on
 * unmount. The unmount teardown matters: without it, a drag interrupted by the
 * editor unmounting (e.g. navigation) would leave `document.body` with text
 * selection disabled and a resize cursor stuck for the rest of the page's life.
 */
export const useSplitResize = ({
  defaultRatio = 0.5,
  min = 0.2,
  max = 0.8,
}: UseSplitResizeOptions = {}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [leftRatio, setLeftRatio] = useState(defaultRatio);
  // Teardown for an in-flight drag; invoked on mouse-up and on unmount.
  const endDragRef = useRef<(() => void) | null>(null);

  const onSeparatorMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      // The container doesn't move or resize during a drag, so measure once
      // rather than forcing a layout read on every mousemove.
      const rect = container.getBoundingClientRect();
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      const onMove = (ev: MouseEvent) => {
        const ratio = (ev.clientX - rect.left) / rect.width;
        setLeftRatio(Math.min(max, Math.max(min, ratio)));
      };
      const endDrag = () => {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', endDrag);
        endDragRef.current = null;
      };

      endDragRef.current = endDrag;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', endDrag);
    },
    [min, max],
  );

  // Safety net: if we unmount mid-drag, restore the page and drop the listeners.
  useEffect(() => () => endDragRef.current?.(), []);

  return { containerRef, leftRatio, onSeparatorMouseDown };
};
