import { EditorContent } from '@tiptap/react';
import { DdocProps } from './types';
import { EditingProvider } from './hooks/use-editing-context';
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
import { Button, Tag, TagType, TagInput, cn, Skeleton } from '@fileverse/ui';
import { useMediaQuery, useOnClickOutside } from 'usehooks-ts';
import { AnimatePresence, motion } from 'framer-motion';
import { EditorProvider } from './context/editor-context';
import { fadeInTransition, slideUpTransition } from './components/motion-div';
import { PreviewContentLoader } from './components/preview-content-loader';

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
      ipfsImageUploadFn,
      onError,
      setCharacterCount,
      setWordCount,
      tags,
      selectedTags,
      setSelectedTags,
      className,
      unFocused,
      ipfsImageFetchFn,
      fetchV1ImageFn,
      contentClassName,
      isLoading,
    }: DdocProps & { contentClassName?: string; isLoading?: boolean },
    ref,
  ) => {
    const [isHiddenTagsVisible, setIsHiddenTagsVisible] = useState(false);
    const tagsContainerRef = useRef(null);

    const visibleTags = selectedTags?.slice(0, 4) || [];
    const hiddenTagsCount = selectedTags
      ? Math.max(0, selectedTags.length - 4)
      : 0;

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
      ipfsImageFetchFn,
      fetchV1ImageFn,
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
      ipfsImageUploadFn,
      unFocused,
    });

    useImperativeHandle(
      ref,
      () => ({
        getEditor: () => editor,
        getYdoc: () => ydoc,
        exportContentAsMarkDown: async (filename: string) => {
          if (editor) {
            const generateDownloadUrl =
              await editor.commands.exportMarkdownFile();
            if (generateDownloadUrl) {
              const url = generateDownloadUrl;
              const link = document.createElement('a');
              link.href = url;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }
          }
        },
      }),
      [editor, ydoc],
    );

    const handleAddTag = (tag: TagType) => {
      const newTags = tag.name.split(',').map((name) => {
        const trimmedName = name.trim();
        const existingTag = tags?.find(
          (t) => t.name.toLowerCase() === trimmedName.toLowerCase(),
        );
        return existingTag || { name: trimmedName, color: tag.color };
      });

      setSelectedTags?.((prevTags) => {
        const uniqueTags = [...prevTags];
        newTags.forEach((newTag) => {
          if (
            !uniqueTags.some(
              (t) => t.name.toLowerCase() === newTag.name.toLowerCase(),
            )
          ) {
            uniqueTags.push(newTag);
          }
        });
        return uniqueTags;
      });
    };

    const handleRemoveTag = (tagName: string) => {
      setSelectedTags?.((prevTags) =>
        prevTags.filter((tag) => tag.name !== tagName),
      );
    };

    const isMobile = useMediaQuery('(max-width: 768px)');

    return !editor || isContentLoading || isLoading
      ? fadeInTransition(
          <div className={cn(`${!isMobile ? 'mx-20' : 'mx-10 mt-10'}`)}>
            <Skeleton
              className={`${isPreviewMode ? 'w-full' : isMobile ? 'w-full' : 'w-[400px]'}  h-[32px] rounded-sm mb-4`}
            />
            {isPreviewMode && <PreviewContentLoader />}
          </div>,
          'content-transition',
        )
      : slideUpTransition(
          <EditorProvider>
            <div ref={editorRef} className={cn('overflow-x-hidden', className)}>
              <EditingProvider
                isPreviewMode={isPreviewMode}
                isPreviewEditor={true}
              >
                {tags && tags.length > 0 && (
                  <div
                    ref={tagsContainerRef}
                    className="flex flex-wrap px-4 md:px-[80px] lg:!px-[124px] items-center gap-1 mb-4 mt-4 lg:!mt-0"
                  >
                    {visibleTags.map((tag, index) => (
                      <Tag
                        key={index}
                        style={{ backgroundColor: tag?.color }}
                        onRemove={() => handleRemoveTag(tag?.name)}
                        isRemovable={!isPreviewMode}
                        className="!h-6 rounded"
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
                              className="!h-6 rounded"
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
                  className={cn('w-full h-auto py-8', contentClassName)}
                />
              </EditingProvider>
            </div>
          </EditorProvider>,
          'editor-transition',
        );
  },
);

export { PreviewDdocEditor };
