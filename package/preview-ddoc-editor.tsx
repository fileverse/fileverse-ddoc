import { EditorContent } from '@tiptap/react';
import { DdocProps } from './types';
import { EditingProvider } from './hooks/use-editing-context';
import { Spinner } from './common/spinner';
import './styles/editor.scss';
import 'tippy.js/animations/shift-toward-subtle.css';
import { useDdocEditor } from './use-ddoc-editor';
import './styles/index.css';
import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import { Button, Tag, TagType, TagInput, cn } from '@fileverse/ui';
import { useOnClickOutside } from 'usehooks-ts';
import { AnimatePresence, motion } from 'framer-motion';

const PreviewDdocEditor = forwardRef(
    (
        {
            isPreviewMode = false,
            initialContent,
            enableCollaboration,
            collaborationId,
            username,
            walletAddress,
            onChange,
            onCollaboratorChange,
            onTextSelection,
            onCommentInteraction,
            ensResolutionUrl,
            secureImageUploadUrl,
            onError,
            setCharacterCount,
            setWordCount,
            tags,
            selectedTags,
            setSelectedTags,
            className
        }: DdocProps,
        ref,
    ) => {
        const [isHiddenTagsVisible, setIsHiddenTagsVisible] = useState(false);
        const tagsContainerRef = useRef(null);

        const visibleTags = selectedTags?.slice(0, 4) || [];
        const hiddenTagsCount = selectedTags ? Math.max(0, selectedTags.length - 4) : 0;

        useOnClickOutside(tagsContainerRef, () => {
            setIsHiddenTagsVisible(false);
        });

        useEffect(() => {
            if (selectedTags && selectedTags.length <= 4) {
                setIsHiddenTagsVisible(false);
            }
        }, [selectedTags]);

        const {
            editor,
            ref: editorRef,
            isContentLoading,
            ydoc,
        } = useDdocEditor({
            isPreviewMode,
            initialContent,
            enableCollaboration,
            collaborationId,
            walletAddress,
            username,
            onChange,
            onCollaboratorChange,
            onCommentInteraction,
            onTextSelection,
            ensResolutionUrl,
            onError,
            setCharacterCount,
            setWordCount,
            secureImageUploadUrl
        });

        useImperativeHandle(
            ref,
            () => ({
                getEditor: () => editor,
                getYdoc: () => ydoc,
            }),
            [editor, ydoc],
        );

        const handleAddTag = (tag: TagType) => {
            const newTags = tag.name.split(',').map(name => {
                const trimmedName = name.trim();
                const existingTag = tags?.find(t => t.name.toLowerCase() === trimmedName.toLowerCase());
                return existingTag || { name: trimmedName, color: tag.color };
            });

            setSelectedTags?.(prevTags => {
                const uniqueTags = [...prevTags];
                newTags.forEach(newTag => {
                    if (!uniqueTags.some(t => t.name.toLowerCase() === newTag.name.toLowerCase())) {
                        uniqueTags.push(newTag);
                    }
                });
                return uniqueTags;
            });
        };

        const handleRemoveTag = (tagName: string) => {
            setSelectedTags?.(prevTags => prevTags.filter(tag => tag.name !== tagName));
        };

        if (!editor || isContentLoading) {
            return (
                <div className="w-auto h-auto flex flex-col gap-4 justify-center items-center">
                    <Spinner />
                    <p>Loading Editor...</p>
                </div>
            );
        }

        return (
            <div
                ref={editorRef}
                className={cn("overflow-x-hidden", className)}
            >
                <EditingProvider isPreviewMode={isPreviewMode}>
                    {tags && tags.length > 0 && (
                        <div ref={tagsContainerRef} className="flex flex-wrap px-4 md:px-[80px] lg:!px-[124px] items-center gap-1 mb-4 mt-4 lg:!mt-0">
                            {visibleTags.map((tag, index) => (
                                <Tag
                                    key={index}
                                    style={{ backgroundColor: tag?.color }}
                                    onRemove={() => handleRemoveTag(tag?.name)}
                                    isRemovable={!isPreviewMode}
                                    className='!h-6 rounded'
                                >
                                    {tag?.name}
                                </Tag>
                            ))}
                            {hiddenTagsCount > 0 && !isHiddenTagsVisible && (
                                <Button
                                    variant="ghost"
                                    className="!h-6 rounded min-w-fit !px-2 color-bg-secondary text-helper-text-sm"
                                    onClick={() => setIsHiddenTagsVisible(true)}
                                >
                                    +{hiddenTagsCount}
                                </Button>
                            )}
                            <AnimatePresence>
                                {isHiddenTagsVisible && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex flex-wrap items-center gap-1"
                                    >
                                        {selectedTags?.slice(4).map((tag, index) => (
                                            <Tag
                                                key={index + 4}
                                                style={{ backgroundColor: tag?.color }}
                                                onRemove={() => handleRemoveTag(tag?.name)}
                                                isRemovable={!isPreviewMode}
                                                className='!h-6 rounded'
                                            >
                                                {tag?.name}
                                            </Tag>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <TagInput
                                tags={tags || []}
                                selectedTags={selectedTags as TagType[]}
                                onAddTag={handleAddTag}
                                isPreviewMode={isPreviewMode}
                            />
                        </div>
                    )}
                    <EditorContent
                        editor={editor}
                        id="editor"
                        className="w-full h-auto py-4"
                    />
                </EditingProvider>
            </div>
        );
    },
);

export { PreviewDdocEditor };
