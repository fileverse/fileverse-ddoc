import { cn } from '@fileverse/ui';
import { useRef, useEffect } from 'react';
import platform from 'platform';
const checkOs = () => platform.os?.family;
import { useMediaQuery } from 'usehooks-ts';
import { EditingProvider } from '../../hooks/use-editing-context';
import { Editor, EditorContent } from '@tiptap/react';

interface PreviewPanelProps {
  slides: string[];
  currentSlide: number;
  setCurrentSlide: (index: number) => void;
  previewEditors: { [key: number]: Editor };
}

export const PreviewPanel = ({
  slides,
  currentSlide,
  setCurrentSlide,
  previewEditors,
}: PreviewPanelProps) => {
  const slideRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const isNativeMobile =
    checkOs() === 'iOS' ||
    checkOs() === 'Android' ||
    checkOs() === 'Windows Phone';
  const isMobile = useMediaQuery('(max-width: 1280px)');

  const scrollToCurrentSlide = (slideIndex: number) => {
    if (!previewPanelRef.current || !slideRefs.current[slideIndex]) return;

    const panel = previewPanelRef.current;
    const slideElement = slideRefs.current[slideIndex];

    if (!slideElement) return;

    if (isMobile) {
      const slideLeft = slideElement.offsetLeft;
      const slideWidth = slideElement.offsetWidth;
      const panelWidth = panel.clientWidth;
      const currentScroll = panel.scrollLeft;

      if (
        slideLeft < currentScroll ||
        slideLeft + slideWidth > currentScroll + panelWidth
      ) {
        panel.scrollTo({
          left: slideLeft - (panelWidth - slideWidth) / 2,
          behavior: 'smooth',
        });
      }
    } else {
      const slideTop = slideElement.offsetTop;
      const slideHeight = slideElement.offsetHeight;
      const panelHeight = panel.clientHeight;
      const currentScroll = panel.scrollTop;

      if (
        slideTop < currentScroll ||
        slideTop + slideHeight > currentScroll + panelHeight
      ) {
        panel.scrollTo({
          top: slideTop - (panelHeight - slideHeight) / 2,
          behavior: 'smooth',
        });
      }
    }
  };

  useEffect(() => {
    scrollToCurrentSlide(currentSlide);
  }, [currentSlide]);

  return (
    <div
      ref={previewPanelRef}
      className={cn(
        'color-bg-default flex gap-3 py-4 px-4 color-border-default-hover relative',
        isMobile
          ? 'flex-row overflow-x-auto border-t min-h-[12rem] order-2 w-full pt-10 xl:pt-0'
          : 'w-[251px] h-full overflow-y-auto flex-col py-16 border-r',
        isNativeMobile && 'min-h-[20rem]',
      )}
    >
      {isMobile && (
        <div className="w-full text-helper-text-sm color-text-secondary absolute top-0 left-0 my-2.5 mx-5 z-20">
          Slides: <span className="color-text-default">{slides.length}</span>
        </div>
      )}
      {slides.map((_slideContent, index) => {
        return (
          <div
            key={index}
            ref={(el) => (slideRefs.current[index] = el)}
            className={cn(
              'flex p-2 rounded-xl w-[219px] h-[122px] transition-all',
              currentSlide === index
                ? 'color-bg-brand hover:color-bg-brand-hover'
                : 'bg-transparent hover:color-bg-default-hover',
            )}
          >
            <span className="text-body-sm color-text-default h-full w-[20px] pr-1 text-center">
              {index + 1}
            </span>
            <div
              onClick={() => setCurrentSlide(index)}
              className={cn(
                'color-bg-default border rounded-lg p-2 cursor-pointer transition-all transform overflow-hidden aspect-video w-[188px] h-[106px]',
                currentSlide === index
                  ? 'border-[#FFDF0A]'
                  : 'color-border-default',
              )}
            >
              <EditingProvider isPreviewMode={true}>
                <EditorContent
                  editor={previewEditors[index]}
                  className="presentation-mode preview-slide"
                />
              </EditingProvider>
            </div>
          </div>
        );
      })}
    </div>
  );
};
