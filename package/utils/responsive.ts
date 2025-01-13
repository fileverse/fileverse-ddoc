import platform from 'platform';
import { useMediaQuery } from 'usehooks-ts';

const checkOs = () => platform.os?.family;

export const useResponsive = () => {
  const isBelow1280px = useMediaQuery('(max-width: 1280px)');
  const isBelow1024px = useMediaQuery('(max-width: 1023px)');
  const isMobileScreen = useMediaQuery('(max-width: 768px)');
  const isIOS = checkOs() === 'iOS';

  const isNativeMobile =
    checkOs() === 'iOS' ||
    checkOs() === 'Android' ||
    checkOs() === 'Windows Phone' ||
    isMobileScreen;

  return {
    isBelow1024px,
    isBelow1280px,
    isMobileScreen,
    isNativeMobile,
    isIOS,
  };
};
