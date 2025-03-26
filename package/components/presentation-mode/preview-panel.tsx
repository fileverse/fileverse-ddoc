import { cn } from '@fileverse/ui';
import { useRef, useEffect } from 'react';
import { useMediaQuery } from 'usehooks-ts';
import { useResponsive } from '../../utils/responsive';

interface PreviewPanelProps {
  slides: string[];
  currentSlide: number;
  setCurrentSlide: (index: number) => void;
}

export const PreviewPanel = ({
  slides,
  currentSlide,
  setCurrentSlide,
}: PreviewPanelProps) => {
  const slideRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const { isNativeMobile } = useResponsive();
  const isMobile = useMediaQuery('(max-width: 1279px)');

  useEffect(() => {
    if (!isMobile && slideRefs.current[currentSlide]) {
      slideRefs.current[currentSlide]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentSlide, isMobile]);

  return (
    <div
      ref={previewPanelRef}
      className={cn(
        'color-bg-default flex gap-3 py-4 px-4 color-border-default-hover relative',
        isMobile
          ? 'flex-row overflow-x-auto border-t min-h-[12rem] order-2 w-full pt-10 xl:pt-0'
          : 'w-[251px] h-full overflow-y-auto overflow-x-hidden flex-col py-16 border-r',
        isNativeMobile && 'min-h-[20rem]',
      )}
    >
      {isMobile && (
        <div className="w-full text-helper-text-sm color-text-secondary absolute top-0 left-0 my-2.5 mx-5 z-20">
          Slides: <span className="color-text-default">{slides.length}</span>
        </div>
      )}
      {slides.map((slideContent, index) => (
        <div
          key={index}
          ref={(el) => (slideRefs.current[index] = el)}
          className={cn(
            'flex p-2 rounded-xl w-[219px] h-[122px] transition-all',
            currentSlide === index
              ? 'color-bg-brand hover:color-bg-brand-hover'
              : 'color-bg-default hover:color-bg-default-hover',
          )}
        >
          <span
            className={cn(
              'text-body-sm h-full w-[20px] pr-1 text-center',
              currentSlide === index
                ? 'color-text-default dark:text-[#363B3F]'
                : 'color-text-default',
            )}
          >
            {index + 1}
          </span>
          <div
            onClick={() => setCurrentSlide(index)}
            className={cn(
              'border rounded-lg cursor-pointer transition-all transform overflow-hidden aspect-video w-[188px] h-[106px]',
              currentSlide === index
                ? 'border-[#FFDF0A]'
                : 'color-border-default',
            )}
          >
            <div
              className="presentation-mode preview-slide color-bg-default w-[400%] h-[400%]"
              dangerouslySetInnerHTML={{ __html: slideContent }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
