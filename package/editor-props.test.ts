import { describe, expect, it } from 'vitest';
import { DdocEditorProps } from './types';

const SIDES = ['top', 'bottom', 'left', 'right'] as const;

describe('DdocEditorProps caret comfort band', () => {
  it('sets every side of scrollThreshold and scrollMargin', () => {
    const threshold = DdocEditorProps.scrollThreshold as Record<string, number>;
    const margin = DdocEditorProps.scrollMargin as Record<string, number>;
    for (const side of SIDES) {
      expect(Number.isFinite(threshold[side])).toBe(true);
      expect(Number.isFinite(margin[side])).toBe(true);
      expect(margin[side]).toBeGreaterThanOrEqual(threshold[side]);
    }
  });
});
