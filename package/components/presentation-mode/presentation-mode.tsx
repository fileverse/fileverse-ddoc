import { useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import { AnimatedLoader, IconButton, Label, Tooltip } from '@fileverse/ui';
import { EditingProvider } from '../../hooks/use-editing-context';
import { convertToMarkdown } from '../../utils/md-to-slides';
import { convertMarkdownToHTML } from '@fileverse-dev/md2slides';
import { handlePrint } from '../../utils/handle-print';
import { PreviewPanel } from './preview-panel';
import { cn } from '@fileverse/ui';
import platform from 'platform';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from 'usehooks-ts';

interface PresentationModeProps {
    editor: Editor;
    onClose: () => void;
    isFullscreen: boolean;
    setIsFullscreen: (isFullscreen: boolean) => void;
    onError?: (error: string) => void;
}

const checkOs = () => platform.os?.family;

const SlideContent = ({
    content,
    editor,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isFullscreen
}: {
    content: string;
    editor: Editor;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
    isFullscreen: boolean;
}) => {
    useLayoutEffect(() => {
        const timeoutId = setTimeout(() => {
            editor.commands.setContent(content);
        }, 0);
        return () => clearTimeout(timeoutId);
    }, [content, editor]);

    return (
        <EditorContent
            editor={editor}
            className={cn("presentation-mode", {
                "fullscreen": isFullscreen
            })}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        />
    );
};

export const PresentationMode = ({ editor, onClose, isFullscreen, setIsFullscreen, onError }: PresentationModeProps) => {
    const [slides, setSlides] = useState<string[]>([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [previewEditors, setPreviewEditors] = useState<{ [key: number]: Editor }>({});
    const [isLoading, setIsLoading] = useState(true);
    const isMobile = useMediaQuery('(max-width: 640px)');
    const isNativeMobile =
        checkOs() === 'iOS' ||
        checkOs() === 'Android' ||
        checkOs() === 'Windows Phone' ||
        isMobile;
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const minSwipeDistance = 50;
    const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');

    const presentationEditor = useEditor({
        extensions: editor.extensionManager.extensions,
        editable: false,
    }, []);

    // Add check for empty editor
    useEffect(() => {
        const editorElement = editor.view.dom;
        const isEditorEmpty = editorElement.querySelector('.is-editor-empty');

        if (isEditorEmpty) {
            onClose();
            // You'll need to pass an onError prop to show the toast
            onError?.("Cannot enter presentation mode with empty content");
            return;
        }

        setIsLoading(true);
        const markdown = convertToMarkdown(editor);

        // Add artificial delay of 3 seconds
        const timeoutId = setTimeout(() => {
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
                if (node instanceof HTMLElement &&
                    node.getAttribute('data-type') === 'page-break' &&
                    node.getAttribute('data-page-break') === 'true') {
                    // When we hit a page break, save the current slide content
                    if (currentSlideContent.length > 0) {
                        const slideDiv = document.createElement('div');
                        currentSlideContent.forEach(n => slideDiv.appendChild(n.cloneNode(true)));
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
                currentSlideContent.forEach(n => slideDiv.appendChild(n.cloneNode(true)));
                slideArray.push(slideDiv.innerHTML);
            }

            // Filter out empty slides and set the state
            setSlides(slideArray.filter(slide => slide.trim().length > 0));
            setIsLoading(false);
        }, 4000);

        // Cleanup function to clear the timeout
        return () => clearTimeout(timeoutId);
    }, [editor]);

    // Create preview editors for each slide
    useLayoutEffect(() => {
        const editors: { [key: number]: Editor } = {};
        slides.forEach((_, index) => {
            editors[index] = new Editor({
                extensions: editor.extensionManager.extensions,
                editable: false,
            });
        });
        setPreviewEditors(editors);

        return () => {
            Object.values(editors).forEach(editor => editor.destroy());
        };
    }, [slides]);

    // Update preview editors content
    useLayoutEffect(() => {
        const timeoutIds: NodeJS.Timeout[] = [];

        Object.entries(slides).forEach(([slideIndex, slideContent]) => {
            const index = parseInt(slideIndex);
            const editor = previewEditors[index];
            if (editor) {
                const timeoutId = setTimeout(() => {
                    editor.commands.setContent(slideContent);
                }, 0);
                timeoutIds.push(timeoutId);
            }
        });

        // Cleanup function to clear all timeouts
        return () => {
            timeoutIds.forEach(id => clearTimeout(id));
        };
    }, [slides, previewEditors]);

    // Add this function to handle fullscreen mode
    const toggleFullscreen = useCallback(() => {
        if (isNativeMobile) {
            // For iOS, just toggle the state without using native fullscreen
            // @ts-ignore
            setIsFullscreen(prev => !prev);
        } else {
            // For desktop, use native fullscreen API
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().then(() => {
                    setIsFullscreen(true);
                }).catch(() => {
                    // Fallback if native fullscreen fails
                    setIsFullscreen(true);
                });
            } else {
                document.exitFullscreen().then(() => {
                    setIsFullscreen(false);
                }).catch(() => {
                    setIsFullscreen(false);
                });
            }
        }
    }, [isNativeMobile]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Space') {
            setSlideDirection('forward');
            setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            setSlideDirection('backward');
            setCurrentSlide(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'f' || e.key === 'F') {
            toggleFullscreen();
        }
    }, [slides.length, onClose, toggleFullscreen]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [slides.length, currentSlide]);

    useEffect(() => {
        return () => {
            if (presentationEditor) {
                presentationEditor.destroy();
            }
        };
    }, [presentationEditor]);

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
            setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
        }
        if (isRightSwipe) {
            setSlideDirection('backward');
            setCurrentSlide(prev => Math.max(prev - 1, 0));
        }
    }, [touchStart, touchEnd, slides.length, minSwipeDistance]);

    if (isLoading) {
        return (
            <div className="fixed inset-0 color-bg-default flex flex-col items-center justify-center w-screen h-screen">
                <div className="flex flex-col items-center gap-4 translate-y-[-5vh]">
                    <AnimatedLoader text="Building slides..." />
                </div>
            </div>
        );
    }

    if (slides.length === 0 || !presentationEditor) return null;

    return (
        <div className={cn(
            "fixed inset-0 color-bg-secondary flex",
            isNativeMobile ? "flex-col" : "flex-col xl:flex-row",
            "items-center justify-center w-screen h-screen"
        )}>
            {!isFullscreen && (
                <PreviewPanel
                    slides={slides}
                    currentSlide={currentSlide}
                    setCurrentSlide={setCurrentSlide}
                    previewEditors={previewEditors}
                />
            )}
            {/* Main Content */}
            <div className={cn(
                "flex-1 h-full flex flex-col items-center justify-center",
                {
                    "w-full": isFullscreen
                }
            )}>
                {!isFullscreen && (
                    <div className="absolute top-0 xl:top-[-3.3rem] px-4 py-2 border-b color-border-default right-0 flex gap-2 bg-white w-full justify-between">
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
                        <div className="flex justify-center items-center gap-2">
                            <Tooltip text="Download" sideOffset={10}>
                                <IconButton
                                    variant="ghost"
                                    onClick={() => handlePrint(slides)}
                                    icon="Download"
                                    size="md"
                                />
                            </Tooltip>
                            <Tooltip text="Comments" sideOffset={10}>
                                <IconButton
                                    variant="ghost"
                                    onClick={() => { }}
                                    icon="MessageSquareText"
                                    size="md"
                                />
                            </Tooltip>
                            <Tooltip text="Share" sideOffset={10}>
                                <IconButton
                                    variant="ghost"
                                    onClick={() => { }}
                                    icon="Link"
                                    size="md"
                                />
                            </Tooltip>
                            <Tooltip text="Press F to toggle fullscreen" sideOffset={10}>
                                <IconButton
                                    variant="ghost"
                                    onClick={toggleFullscreen}
                                    icon={isFullscreen ? "Minimize2" : "Play"}
                                    size="md"
                                />
                            </Tooltip>
                        </div>
                    </div>
                )}

                <div className={cn(
                    "w-full flex items-center justify-center",
                    isFullscreen ? "h-screen p-0" : "h-[75vh] p-8"
                )}>
                    <div className={cn(
                        "w-full bg-white rounded-lg overflow-hidden relative",
                        isFullscreen
                            ? "h-full max-w-none"
                            : "px-8 md:px-0 scale-[0.35] md:scale-[0.75] xl:scale-100 min-w-[1080px] max-w-[1080px] aspect-video py-[48px]"
                    )} style={{
                        transformOrigin: "center"
                    }}>
                        <EditingProvider isPreviewMode={true}>
                            {isFullscreen ? (
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentSlide}
                                        initial={{ opacity: 0, x: slideDirection === 'forward' ? 50 : -50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: slideDirection === 'forward' ? -50 : 50 }}
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
                            ) : <SlideContent
                                content={slides[currentSlide]}
                                editor={presentationEditor}
                                onTouchStart={onTouchStart}
                                onTouchMove={onTouchMove}
                                onTouchEnd={onTouchEnd}
                                isFullscreen={isFullscreen}
                            />}
                        </EditingProvider>
                    </div>
                </div>

                {isFullscreen && (
                    <div className="absolute bottom-[8vh] left-[40%] translate-x-[25%] z-50 opacity-0 transition-opacity duration-300 ease-in-out hover:opacity-100">
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