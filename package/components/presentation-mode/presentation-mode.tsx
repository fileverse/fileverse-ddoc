/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useEffect, useState, useCallback } from 'react';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import {
  AnimatedLoader,
  DynamicDropdownV2,
  IconButton,
  Label,
  Tooltip,
} from '@fileverse/ui';
import { EditingProvider } from '../../hooks/use-editing-context';
import { convertToMarkdown } from '../../utils/md-to-slides';
import { handlePrint } from '../../utils/handle-print';
import { PreviewPanel } from './preview-panel';
import { cn } from '@fileverse/ui';
import { motion, AnimatePresence } from 'framer-motion';
import copy from 'copy-to-clipboard';
import { convertMarkdownToHTML } from '../../utils/md-to-html';
import { useResponsive } from '../../utils/responsive';

interface PresentationModeProps {
  editor: Editor;
  onClose: () => void;
  isFullscreen: boolean;
  setIsFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
  onError?: (error: string) => void;
  setCommentDrawerOpen:
    | React.Dispatch<React.SetStateAction<boolean>>
    | undefined;
  sharedSlidesLink?: string;
  isPreviewMode: boolean;
  documentName: string;
  onSlidesShare?: () => void;
  slides: string[];
  setSlides: React.Dispatch<React.SetStateAction<string[]>>;
}

const SlideContent = ({
  content,
  editor,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  isFullscreen,
}: {
  content: string;
  editor: Editor;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  isFullscreen: boolean;
}) => {
  const isSoloImage = (html: string): boolean => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const img = doc.querySelector('img.slide-image');
    // Check if there's exactly one image with class 'slide-image' and it's the only content
    return !!img && doc.body.children.length === 1;
  };

  useEffect(() => {
    setTimeout(() => {
      editor.commands.setContent(content);

      if (isSoloImage(content)) {
        // Add a class to the editor root for solo image slides
        editor.view.dom.classList.add('solo-slide-image');
      } else {
        editor.view.dom.classList.remove('solo-slide-image');
      }
    });
  }, [content]);

  return (
    <EditorContent
      editor={editor}
      className={cn('presentation-mode', {
        fullscreen: isFullscreen,
      })}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    />
  );
};

export const PresentationMode = ({
  editor,
  onClose,
  isFullscreen,
  setIsFullscreen,
  onError,
  setCommentDrawerOpen,
  sharedSlidesLink,
  isPreviewMode,
  documentName,
  onSlidesShare,
  slides,
  setSlides,
}: PresentationModeProps) => {
  const [showLinkCopied, setShowLinkCopied] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { isNativeMobile } = useResponsive();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>(
    'forward',
  );

  const presentationEditor = useEditor(
    {
      extensions: editor.extensionManager.extensions.filter(
        (b) => b.name !== 'collaboration',
      ),
      editable: false,
    },
    [],
  );

  // Add check for empty editor
  useEffect(() => {
    const editorElement = editor.view.dom;
    const isEditorEmpty = editorElement.querySelector('.is-editor-empty');

    if (isEditorEmpty) {
      onClose();
      // You'll need to pass an onError prop to show the toast
      onError?.('Cannot enter presentation mode with empty content');
      return;
    }

    setIsLoading(true);
    const markdown = convertToMarkdown(editor);

    // First convert markdown to HTML with proper page breaks
    const html = convertMarkdownToHTML(markdown, {
      preserveNewlines: true,
      sanitize: true,
      maxCharsPerSlide: 1000,
      maxWordsPerSlide: 250,
      maxLinesPerSlide: 7,
    });
    // Create a temporary div to properly parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Find all page breaks and split content
    const slideArray: string[] = [];
    let currentSlideContent: Node[] = [];

    // Iterate through all nodes
    tempDiv.childNodes.forEach((node) => {
      if (
        node instanceof HTMLElement &&
        node.getAttribute('data-type') === 'page-break' &&
        node.getAttribute('data-page-break') === 'true'
      ) {
        // When we hit a page break, save the current slide content
        if (currentSlideContent.length > 0) {
          const slideDiv = document.createElement('div');
          currentSlideContent.forEach((n) =>
            slideDiv.appendChild(n.cloneNode(true)),
          );
          slideArray.push(slideDiv.innerHTML);
          currentSlideContent = [];
        }
      } else {
        currentSlideContent.push(node.cloneNode(true));
      }
    });

    // Don't forget to add the last slide
    if (currentSlideContent.length > 0) {
      const slideDiv = document.createElement('div');
      currentSlideContent.forEach((n) =>
        slideDiv.appendChild(n.cloneNode(true)),
      );
      slideArray.push(slideDiv.innerHTML);
    }

    // Filter out empty slides and set the state
    setSlides(slideArray.filter((slide) => slide.trim().length > 0));

    // Add artificial delay of 3 seconds
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    // Cleanup function to clear the timeout
    return () => clearTimeout(timeoutId);
  }, [editor]);

  // Add this function to handle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    if (isNativeMobile) {
      // For iOS/mobile, just toggle the state without using native fullscreen
      setIsFullscreen((prev) => !prev);
    } else {
      // For desktop browsers, try native fullscreen with fallbacks
      if (!document.fullscreenElement) {
        // Try standard fullscreen API first
        if (document.documentElement.requestFullscreen) {
          document.documentElement
            .requestFullscreen()
            .then(() => setIsFullscreen(true))
            .catch(() => {
              // Fallback if standard fullscreen fails
              setIsFullscreen(true);
            });
        } else {
          // If standard fullscreen API not available, just update state
          setIsFullscreen(true);
        }
      } else {
        // Exit fullscreen with fallbacks
        if (document.exitFullscreen) {
          document
            .exitFullscreen()
            .then(() => setIsFullscreen(false))
            .catch(() => {
              setIsFullscreen(false);
            });
        } else {
          // If standard exit fullscreen not available, just update state
          setIsFullscreen(false);
        }
      }
    }
  }, [isNativeMobile]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.key === 'ArrowRight' ||
        e.key === 'ArrowDown' ||
        e.code === 'Space'
      ) {
        e.preventDefault();
        e.stopPropagation();
        setSlideDirection('forward');
        setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setSlideDirection('backward');
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        !isPreviewMode && onClose();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    },
    [slides.length, onClose, toggleFullscreen],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, currentSlide]);

  // Update the fullscreen change event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!isNativeMobile && !document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isNativeMobile]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setSlideDirection('forward');
      setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
    }
    if (isRightSwipe) {
      setSlideDirection('backward');
      setCurrentSlide((prev) => Math.max(prev - 1, 0));
    }
  }, [touchStart, touchEnd, slides.length, minSwipeDistance]);

  const handleCopyLink = () => {
    if (sharedSlidesLink) {
      copy(sharedSlidesLink);
      setShowLinkCopied(true);
      onSlidesShare?.();

      const timeoutId = setTimeout(() => {
        setShowLinkCopied(false);
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 color-bg-default flex flex-col items-center justify-center w-screen h-screen z-50">
        <div className="flex flex-col items-center gap-4">
          <AnimatedLoader
            text={isPreviewMode ? 'Loading slides...' : 'Building slides...'}
          />
        </div>
      </div>
    );
  }

  if (slides.length === 0 || !presentationEditor) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 color-bg-secondary flex z-50',
        isNativeMobile ? 'flex-col' : 'flex-col xl:flex-row',
        'items-center justify-center w-screen h-screen',
      )}
    >
      {!isFullscreen && (
        <PreviewPanel
          slides={slides}
          currentSlide={currentSlide}
          setCurrentSlide={setCurrentSlide}
        />
      )}
      {/* Main Content */}
      <div
        className={cn(
          'flex-1 h-full flex flex-col items-center justify-center',
          {
            'w-full': isFullscreen,
          },
        )}
      >
        {!isFullscreen && (
          <div className="absolute top-0 px-4 py-2 border-b color-border-default right-0 flex gap-2 bg-white w-full justify-between z-50">
            {isPreviewMode ? (
              <div className="flex items-center">
                <p className="max-w-[300px] truncate md:max-w-full w-full">
                  {documentName}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <IconButton
                  variant="ghost"
                  onClick={onClose}
                  icon="ChevronLeft"
                  size="md"
                />
                <Label className="hidden xl:block text-body-sm-bold color-text-default">
                  Back to Editor
                </Label>
              </div>
            )}
            <div className="flex justify-center items-center gap-2">
              {!isPreviewMode && (
                <Tooltip text="Download" sideOffset={10}>
                  <IconButton
                    variant="ghost"
                    onClick={() => handlePrint(slides)}
                    icon="FilePdf"
                    size="md"
                  />
                </Tooltip>
              )}
              <Tooltip text="Comments" sideOffset={10}>
                <IconButton
                  variant="ghost"
                  icon="MessageSquareText"
                  size="md"
                  onClick={() => setCommentDrawerOpen?.((prev) => !prev)}
                />
              </Tooltip>
              {!isPreviewMode && (
                <Tooltip
                  text={
                    sharedSlidesLink ? 'Copy to Share' : 'Link is preparing...'
                  }
                  sideOffset={10}
                >
                  <IconButton
                    variant="ghost"
                    icon="Link"
                    disabled={!sharedSlidesLink}
                    className="disabled:!bg-transparent disabled:pointer-events-none"
                    size="md"
                    onClick={handleCopyLink}
                  />
                  {showLinkCopied && (
                    <DynamicDropdownV2
                      key="link-copied"
                      align="center"
                      sideOffset={15}
                      controlled={true}
                      isOpen={showLinkCopied}
                      onClose={() => setShowLinkCopied?.(false)}
                      content={
                        <div className="flex items-start gap-3 bg-black text-white rounded shadow-elevation-3 p-2 text-helper-text-sm">
                          Link copied
                        </div>
                      }
                    />
                  )}
                </Tooltip>
              )}
              <Tooltip text="Press F to toggle fullscreen" sideOffset={10}>
                <IconButton
                  variant="ghost"
                  onClick={toggleFullscreen}
                  icon={isFullscreen ? 'Minimize2' : 'Play'}
                  size="md"
                />
              </Tooltip>
            </div>
          </div>
        )}

        <div
          className={cn(
            'w-full flex items-center justify-center',
            isFullscreen ? 'h-screen p-0' : 'h-[75vh] p-8',
          )}
        >
          <div
            className={cn(
              'w-full bg-white rounded-lg overflow-hidden relative',
              isFullscreen
                ? 'h-full max-w-none'
                : 'px-8 md:px-0 scale-[0.35] md:scale-[0.75] xl:scale-100 min-w-[1080px] max-w-[1080px] aspect-video py-[48px]',
            )}
            style={{
              transformOrigin: 'center',
            }}
          >
            <EditingProvider isPreviewMode={true}>
              {isFullscreen ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{
                      opacity: 0,
                      x: slideDirection === 'forward' ? 50 : -50,
                    }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{
                      opacity: 0,
                      x: slideDirection === 'forward' ? -50 : 50,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <SlideContent
                      content={slides[currentSlide]}
                      editor={presentationEditor}
                      onTouchStart={onTouchStart}
                      onTouchMove={onTouchMove}
                      onTouchEnd={onTouchEnd}
                      isFullscreen={isFullscreen}
                    />
                  </motion.div>
                </AnimatePresence>
              ) : (
                <SlideContent
                  content={slides[currentSlide]}
                  editor={presentationEditor}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  isFullscreen={isFullscreen}
                />
              )}
            </EditingProvider>
          </div>
        </div>

        {isFullscreen && (
          <div className="absolute bottom-8 left-[50%] translate-x-[-50%] z-50 opacity-0 transition-opacity duration-300 ease-in-out hover:opacity-100">
            <div className="bg-black/80 rounded-full px-4 py-2">
              <p className="text-white text-helper-text-sm">
                Press <strong>ESC</strong> to exit fullscreen
              </p>
            </div>
          </div>
        )}

        {isFullscreen && isNativeMobile && (
          <>
            <div className="fixed top-2 right-4 z-50">
              <IconButton
                variant="ghost"
                onClick={toggleFullscreen}
                icon="X"
                size="md"
              />
            </div>
            <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-white/80 px-3 py-1 rounded">
              <span className="text-black">
                {currentSlide + 1} / {slides.length}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
