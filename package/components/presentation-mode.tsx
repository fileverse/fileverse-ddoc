/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from 'react';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import { IconButton } from '@fileverse/ui';
import { EditingProvider } from '../hooks/use-editing-context';
import { convertToMarkdown, md, processMarkdownContent, Slides } from '../utils/md-to-slides';
import cn from 'classnames';

interface PresentationModeProps {
    editor: Editor;
    onClose: () => void;
}

export const PresentationMode = ({ editor, onClose }: PresentationModeProps) => {
    const [slides, setSlides] = useState<Slides>({});
    const [currentSlide, setCurrentSlide] = useState(0);
    const slidesLength = Object.keys(slides).length;
    const [previewEditors, setPreviewEditors] = useState<{ [key: number]: Editor }>({});
    const previewPanelRef = useRef<HTMLDivElement>(null);
    const slideRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

    const presentationEditor = useEditor({
        extensions: editor.extensionManager.extensions,
        editable: false,
    });

    // Create preview editors for each slide
    useEffect(() => {
        const editors: { [key: number]: Editor } = {};
        Object.keys(slides).forEach((slideIndex) => {
            const index = parseInt(slideIndex);
            editors[index] = new Editor({
                extensions: editor.extensionManager.extensions,
                editable: false,
            });
        });
        setPreviewEditors(editors);

        // Cleanup
        return () => {
            Object.values(editors).forEach(editor => editor.destroy());
        };
    }, [slides]);

    // Update preview editors content
    useEffect(() => {
        Object.entries(slides).forEach(([slideIndex, slideContent]) => {
            const index = parseInt(slideIndex);
            const editor = previewEditors[index];
            if (editor) {
                const html = slideContent.map((content: { type: any; content: string; }) => {
                    switch (content.type) {
                        case 'h1':
                            return `<h1>${content.content}</h1>`;
                        case 'h2':
                            return `<h2>${content.content}</h2>`;
                        case 'image':
                            return `<img src="${content.content}" />`;
                        case 'table':
                            return `<div class="table-wrapper">${md.render(content.content)}</div>`;
                        default:
                            return md.render(content.content);
                    }
                }).join('\n');
                editor.commands.setContent(html);
            }
        });
    }, [slides, previewEditors]);

    useEffect(() => {
        const markdown = convertToMarkdown(editor);
        const processedSlides = processMarkdownContent(markdown);
        setSlides(processedSlides);
    }, [editor]);

    useEffect(() => {
        if (presentationEditor && slides[currentSlide]) {
            const slideContent = slides[currentSlide];
            const html = slideContent.map(content => {
                switch (content.type) {
                    case 'h1':
                        return `<h1>${content.content}</h1>`;
                    case 'h2':
                        return `<h2>${content.content}</h2>`;
                    case 'image':
                        return `<img src="${content.content}" />`;
                    case 'table':
                        return `<div class="table-wrapper">${md.render(content.content)}</div>`;
                    default:
                        return md.render(content.content);
                }
            }).join('\n');

            presentationEditor.commands.setContent(html);
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
            const nextSlide = Math.min(currentSlide + 1, slidesLength - 1);
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
    }, [slidesLength, currentSlide]);

    useEffect(() => {
        scrollToCurrentSlide(currentSlide);
    }, [currentSlide]);

    if (slidesLength === 0 || !presentationEditor) return null;

    return (
        <div className="fixed inset-0 bg-[#E8EBEC] flex flex-row items-center justify-center w-screen h-screen">
            {/* Preview Panel */}
            <div
                ref={previewPanelRef}
                className="w-64 h-full bg-white overflow-y-auto flex flex-col gap-4 p-4 border-r color-border-default-hover pb-20"
            >
                {Object.keys(slides).map((slideIndex) => {
                    const index = parseInt(slideIndex);
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
                        onClick={onClose}
                        icon="X"
                        className="text-black hover:bg-transparent hover:opacity-50 transition-all !bg-transparent"
                        size="md"
                    />
                </div>

                <div className="w-full h-[75vh] flex items-start justify-center p-8">
                    <div className="w-full max-w-[1080px] aspect-video bg-white rounded-lg py-[48px] overflow-hidden">
                        <EditingProvider isPreviewMode={true}>
                            <EditorContent editor={presentationEditor} className="presentation-mode" />
                        </EditingProvider>
                    </div>
                </div>
            </div>
        </div>
    );
};