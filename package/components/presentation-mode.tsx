/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import { AnimatedLoader, IconButton } from '@fileverse/ui';
import { EditingProvider } from '../hooks/use-editing-context';
import { convertToMarkdown } from '../utils/md-to-slides';
// import { convertMarkdownToHTML } from '../utils/md-to-html';
import { convertMarkdownToHTML } from '@fileverse-dev/md2slides';
import cn from 'classnames';
import { handlePrint } from '../utils/handle-print';

interface PresentationModeProps {
    editor: Editor;
    onClose: () => void;
}

export const PresentationMode = ({ editor, onClose }: PresentationModeProps) => {
    const [slides, setSlides] = useState<string[]>([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [previewEditors, setPreviewEditors] = useState<{ [key: number]: Editor }>({});
    const [isLoading, setIsLoading] = useState(true);
    const previewPanelRef = useRef<HTMLDivElement>(null);
    const slideRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

    const presentationEditor = useEditor({
        extensions: editor.extensionManager.extensions,
        editable: false,
    }, []);

    // Convert content to slides using HTML
    useEffect(() => {
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

    // Update presentation editor content
    useLayoutEffect(() => {
        if (presentationEditor && slides[currentSlide]) {
            const timeoutId = setTimeout(() => {
                presentationEditor.commands.setContent(slides[currentSlide]);
            }, 0);
            return () => clearTimeout(timeoutId);
        }
    }, [currentSlide, slides, presentationEditor]);

    const scrollToCurrentSlide = (slideIndex: number) => {
        if (!previewPanelRef.current || !slideRefs.current[slideIndex]) return;

        const panel = previewPanelRef.current;
        const slideElement = slideRefs.current[slideIndex];

        if (slideElement) {
            const slideTop = slideElement.offsetTop;
            const slideHeight = slideElement.offsetHeight;
            const panelHeight = panel.clientHeight;
            const currentScroll = panel.scrollTop;

            // Check if slide is not fully visible
            if (slideTop < currentScroll || slideTop + slideHeight > currentScroll + panelHeight) {
                // Center the slide in the panel
                panel.scrollTo({
                    top: slideTop - (panelHeight - slideHeight) / 2,
                    behavior: 'smooth'
                });
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Space') {
            const nextSlide = Math.min(currentSlide + 1, slides.length - 1);
            setCurrentSlide(nextSlide);
            scrollToCurrentSlide(nextSlide);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            const prevSlide = Math.max(currentSlide - 1, 0);
            setCurrentSlide(prevSlide);
            scrollToCurrentSlide(prevSlide);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [slides.length, currentSlide]);

    useEffect(() => {
        scrollToCurrentSlide(currentSlide);
    }, [currentSlide]);

    useEffect(() => {
        return () => {
            if (presentationEditor) {
                presentationEditor.destroy();
            }
        };
    }, [presentationEditor]);


    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-[#E8EBEC] flex flex-col items-center justify-center w-screen h-screen">
                <div className="flex flex-col items-center gap-4">
                    <AnimatedLoader text="Building slides..." />
                </div>
            </div>
        );
    }

    if (slides.length === 0 || !presentationEditor) return null;

    return (
        <div className="fixed inset-0 bg-[#E8EBEC] flex flex-row items-center justify-center w-screen h-screen">
            {/* Preview Panel */}
            <div
                ref={previewPanelRef}
                className="w-64 h-full bg-white overflow-y-auto flex flex-col gap-4 p-4 border-r color-border-default-hover pb-20"
            >
                {slides.map((_slideContent, index) => {
                    return (
                        <div
                            key={index}
                            ref={el => slideRefs.current[index] = el}
                            className={cn("flex", currentSlide === index ? "ring-[.5rem] ring-[#FFDF0A] rounded-[2px]" : "")}
                        >
                            <span className={cn("text-body-sm color-text-default h-full w-6 pr-1 text-center", currentSlide === index && "bg-[#FFDF0A]")}>{index + 1}</span>
                            <div
                                onClick={() => setCurrentSlide(index)}
                                className={cn(
                                    "w-full min-h-[120px] aspect-video bg-white border color-border-default p-2 cursor-pointer transition-all transform overflow-hidden",

                                    currentSlide !== index && "rounded-lg"
                                )}
                                style={{ transform: `scale(${currentSlide === index ? 1.02 : 1})` }}
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

            {/* Main Content */}
            <div className="flex-1 h-full flex flex-col items-center justify-center">
                <div className="absolute top-4 right-4 flex gap-2">
                    <IconButton
                        variant="ghost"
                        onClick={() => handlePrint(slides)}
                        icon="Printer"
                        className="text-black hover:bg-transparent hover:opacity-50 transition-all !bg-transparent"
                        size="md"
                    />
                    <IconButton
                        variant="ghost"
                        onClick={onClose}
                        icon="X"
                        className="text-black hover:bg-transparent hover:opacity-50 transition-all !bg-transparent"
                        size="md"
                    />
                </div>

                <div className="w-full h-[75vh] flex items-start justify-center p-8">
                    <div className="w-full min-w-[1080px] max-w-[1080px] aspect-video bg-white rounded-lg py-[48px] overflow-hidden">
                        <EditingProvider isPreviewMode={true}>
                            <EditorContent editor={presentationEditor} className="presentation-mode" />
                        </EditingProvider>
                    </div>
                </div>
            </div>
        </div>
    );
};