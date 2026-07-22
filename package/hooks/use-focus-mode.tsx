import { useCallback, useEffect, useState } from 'react';
import { useMediaQuery } from 'usehooks-ts';
import { useEscapeKey } from './useEscapeKey';

type UseFocusModeOptions = {
  /** Notify callback — fires on every toggle in both modes (existing API). */
  onFocusMode?: (isFocusMode: boolean) => void;
  /** Controlled value (D6). Omit for the legacy internal-state behavior. */
  isFocusMode?: boolean;
  /** Controlled setter — receives the next value instead of internal mutation. */
  onFocusModeChange?: (isFocusMode: boolean) => void;
};

export const useFocusMode = ({
  onFocusMode,
  isFocusMode: controlledValue,
  onFocusModeChange,
}: UseFocusModeOptions = {}) => {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(false);
  const isFocusMode = isControlled ? controlledValue : internalValue;
  const isMobile = useMediaQuery('(max-width: 1024px)');

  // async to preserve the pre-D6 signature (() => Promise<void>)
  const toggleFocusMode = useCallback(async () => {
    const next = !isFocusMode;
    if (isControlled) {
      onFocusModeChange?.(next);
    } else {
      setInternalValue(next);
    }
    onFocusMode?.(next);
  }, [isFocusMode, isControlled, onFocusModeChange, onFocusMode]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFocusMode();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobile, toggleFocusMode]);

  useEscapeKey(() => {
    if (isFocusMode) {
      toggleFocusMode();
    }
  });

  return { isFocusMode, toggleFocusMode };
};
