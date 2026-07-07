import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFocusMode } from './use-focus-mode';

describe('useFocusMode', () => {
  it('uncontrolled: toggles internal state (existing behavior)', () => {
    const { result } = renderHook(() => useFocusMode({}));
    expect(result.current.isFocusMode).toBe(false);
    act(() => {
      result.current.toggleFocusMode();
    });
    expect(result.current.isFocusMode).toBe(true);
  });

  it('controlled: reflects the prop and calls onFocusModeChange instead of mutating', () => {
    const onFocusModeChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ v }) => useFocusMode({ isFocusMode: v, onFocusModeChange }),
      { initialProps: { v: false } },
    );
    act(() => {
      result.current.toggleFocusMode();
    });
    expect(onFocusModeChange).toHaveBeenCalledWith(true);
    expect(result.current.isFocusMode).toBe(false); // still the prop value
    rerender({ v: true });
    expect(result.current.isFocusMode).toBe(true);
  });

  it('Cmd+Shift+F keyboard shortcut still toggles in both modes', () => {
    const onFocusModeChange = vi.fn();
    renderHook(() => useFocusMode({ isFocusMode: false, onFocusModeChange }));
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'f', metaKey: true, shiftKey: true }),
      );
    });
    expect(onFocusModeChange).toHaveBeenCalledWith(true);
  });
});
