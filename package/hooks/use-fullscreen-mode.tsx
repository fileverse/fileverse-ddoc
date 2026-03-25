import { useEffect, useState } from 'react';
import { useMediaQuery } from 'usehooks-ts';

type UseFocusModeOptions = {
  onFocusMode?: (isFocusMode: boolean) => void;
};

export const useFocusMode = ({ onFocusMode }: UseFocusModeOptions = {}) => {
  const [isFocusMode, setisFocusMode] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');

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
  }, [isMobile]);

  const toggleFocusMode = async () => {
    setisFocusMode((prev) => {
      onFocusMode?.(!prev);
      return !prev;
    });
  };

  return { isFocusMode, toggleFocusMode };
};
