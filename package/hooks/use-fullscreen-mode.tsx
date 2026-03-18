import { useEffect, useState } from 'react';

const isApiFullscreen = () => Boolean(document.fullscreenElement);

const isBrowserFullscreen = () => {
  return (
    Math.abs(window.innerHeight - screen.height) <= 2 &&
    Math.abs(window.innerWidth - screen.width) <= 2
  );
};

export const useFullscreenMode = () => {
  const [isFullscreenMode, setIsFullscreenMode] = useState(
    isBrowserFullscreen(),
  );

  useEffect(() => {
    const sync = () => {
      setIsFullscreenMode(isBrowserFullscreen());
    };

    document.addEventListener('fullscreenchange', sync);
    window.addEventListener('resize', sync);

    return () => {
      document.removeEventListener('fullscreenchange', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  const toggleFullscreenMode = async () => {
    if (isApiFullscreen()) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  };

  return { isFullscreenMode, toggleFullscreenMode };
};
