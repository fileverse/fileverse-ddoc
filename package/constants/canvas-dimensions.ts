/**
 * Canvas dimension constants
 * Design Philosophy: Canvas mimics real paper (A4) - fixed dimensions regardless of screen size
 * Paper doesn't change size in the real world, so our canvas shouldn't either
 */

/**
 * Constraints for zoom 1.4 (fit mode)
 * These percentages account for the 1.4x transform scaling applied to the canvas
 */
export const ORIENTATION_CONSTRAINTS = {
  portrait: {
    // At zoom 1.4 (fit), percentage width accounts for 1.4x transform scaling
    zoomFitWidth: '55%', // 55% * 1.4 = ~77% effective width
    zoomFitMaxWidth: 1100, // px - prevents overflow on large screens
  },
  landscape: {
    // At zoom 1.4 (fit), percentage width accounts for 1.4x transform scaling
    zoomFitWidth: '60%', // 60% * 1.4 = ~84% effective width
    zoomFitMaxWidth: 1200, // px - prevents overflow while maximizing space
  },
} as const;

/**
 * Canvas dimension constants for different orientations and zoom levels
 * Portrait: Standard document width (850px at 100% zoom)
 * Landscape: Wider canvas for horizontal layouts (1190px at 100% zoom, ~1.4x portrait)
 *
 * Note: Zoom level 1.4 uses percentage widths that are scaled by transform: scaleX(1.4)
 * The effective width is baseWidth * 1.4, so percentages are reduced accordingly
 */
export const CANVAS_DIMENSIONS = {
  portrait: {
    '0.5': { width: 700, minHeight: '150%' },
    '0.75': { width: 800, minHeight: '200%' },
    '1': { width: 850, minHeight: '100%' },
    '1.4': { width: '70%', minHeight: '200%' }, // Overridden by getDimensionStyles for scaling
    '1.5': { width: 1062.5, minHeight: '100%' },
    '2': { width: 1548, minHeight: undefined },
  },
  landscape: {
    '0.5': { width: 980, minHeight: '150%' },
    '0.75': { width: 1135, minHeight: '200%' },
    '1': { width: 1190, minHeight: '100%' },
    '1.4': { width: '90%', minHeight: '200%' }, // Overridden by getDimensionStyles for scaling
    '1.5': { width: 1487.5, minHeight: '100%' },
    '2': { width: 2166, minHeight: undefined },
  },
} as const;
