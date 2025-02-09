/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';

export const useEscapeKey = (callback: () => void) => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      callback();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
};
