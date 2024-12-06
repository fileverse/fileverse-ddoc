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
        'bg-white flex gap-4 py-4 px-6 color-border-default-hover relative',
        isMobile
          ? 'flex-row overflow-x-auto border-t min-h-[12rem] order-2 w-full pt-10 xl:pt-0'
          : 'w-64 h-full overflow-y-auto flex-col pb-20 border-r',
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
              'flex',
              isMobile && 'flex-shrink-0 h-[120px]',
              currentSlide === index
                ? 'ring-[.5rem] ring-[#FFDF0A] rounded-[2px]'
                : '',
            )}
          >
            <span
              className={cn(
                'text-body-sm color-text-default h-full w-6 pr-1 text-center',
                currentSlide === index &&
                  'bg-[#FFDF0A] border-[#FFDF0A] border',
              )}
            >
              {index + 1}
            </span>
            <div
              onClick={() => setCurrentSlide(index)}
              className={cn(
                'bg-white border color-border-default p-2 cursor-pointer transition-all transform overflow-hidden aspect-video',
                isMobile ? 'w-[200px] min-w-[200px]' : 'w-full min-h-[120px]',
                currentSlide !== index && 'rounded-lg',
              )}
              style={{
                transform: `scale(${currentSlide === index ? 1.02 : 1})`,
              }}
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
