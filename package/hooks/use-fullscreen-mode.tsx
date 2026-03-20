import { useEffect, useState } from 'react';
import { useMediaQuery } from 'usehooks-ts';

const isApiFullscreen = () => Boolean(document.fullscreenElement);

const isBrowserFullscreen = () => {
  return (
    Math.abs(window.innerHeight - screen.height) <= 2 &&
    Math.abs(window.innerWidth - screen.width) <= 2
  );
};

export const useFullscreenMode = () => {
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');

  useEffect(() => {
    const sync = () => {
      if (isMobile) {
        setIsFullscreenMode(false);
        return;
      }
      setIsFullscreenMode(isBrowserFullscreen());
    };

    sync();

    document.addEventListener('fullscreenchange', sync);
    window.addEventListener('resize', sync);

    return () => {
      document.removeEventListener('fullscreenchange', sync);
      window.removeEventListener('resize', sync);
    };
  }, [isMobile]);

  const toggleFullscreenMode = async () => {
    if (isApiFullscreen()) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  };

  return { isFullscreenMode, toggleFullscreenMode };
};
