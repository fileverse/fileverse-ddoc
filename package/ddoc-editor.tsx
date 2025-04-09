import { EditorContent, isTextSelection } from '@tiptap/react';
import { EditorBubbleMenu } from './components/editor-bubble-menu/editor-bubble-menu';
import { DdocProps } from './types';
import { ColumnsMenu } from './extensions/multi-column/menus';
import { EditingProvider } from './hooks/use-editing-context';
import { Spinner } from './common/spinner';
import EditorToolBar from './components/editor-toolbar';
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
import cn from 'classnames';
import { Button, LucideIcon, Tag, TagType, TagInput } from '@fileverse/ui';
import { useMediaQuery, useOnClickOutside } from 'usehooks-ts';
import { AnimatePresence, motion } from 'framer-motion';
import * as Y from 'yjs';
import MobileToolbar from './components/mobile-toolbar';
import { fromUint8Array, toUint8Array } from 'js-base64';
import { PresentationMode } from './components/presentation-mode/presentation-mode';
import { CommentDrawer } from './components/inline-comment/comment-drawer';
import { useResponsive } from './utils/responsive';
import { CommentProvider } from './components/inline-comment/context/comment-context';
import { CommentBubbleCard } from './components/inline-comment/comment-bubble-card';
import { DocumentOutline } from './components/toc/document-outline';
import { EditorProvider } from './context/editor-context';

const DdocEditor = forwardRef(
  (
    {
      isPreviewMode = false,
      initialContent,
      enableCollaboration,
      collaborationId,
      username,
      setUsername,
      renderNavbar,
      walletAddress,
      onChange,
      onCollaboratorChange,
      onTextSelection,
      onCommentInteraction,
      handleCommentButtonClick,
      showCommentButton,
      ensResolutionUrl,
      secureImageUploadUrl,
      disableBottomToolbar,
      onError,
      setCharacterCount,
      setWordCount,
      tags,
      selectedTags,
      setSelectedTags,
      isCommentSectionOpen,
      setIsCommentSectionOpen,
      setInlineCommentData,
      inlineCommentData,
      enableIndexeddbSync,
      ddocId,
      zoomLevel,
      setZoomLevel,
      isPresentationMode,
      setIsPresentationMode,
      isNavbarVisible,
      setIsNavbarVisible,
      onComment,
      onInlineComment,
      onMarkdownExport,
      onMarkdownImport,
      onPdfExport,
      editorCanvasClassNames,
      sharedSlidesLink,
      documentName,
      onInvalidContentError,
      ignoreCorruptedData,
      commentDrawerOpen,
      setCommentDrawerOpen,
      initialComments = [],
      onNewComment,
      onCommentReply,
      setInitialComments,
      onSlidesShare,
      onResolveComment,
      onUnresolveComment,
      onDeleteComment,
      showTOC,
      setShowTOC,
      proExtensions,
      isConnected,
      connectViaWallet,
      isLoading,
      connectViaUsername,
      isDDocOwner,
      isCollabDocumentPublished = true,
      disableInlineComment,
      renderThemeToggle,
      metadataProxyUrl,
      onCopyHeadingLink,
    }: DdocProps,
    ref,
  ) => {
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const btn_ref = useRef(null);
    const isWidth1500px = useMediaQuery('(min-width: 1500px)');
    const isWidth3000px = useMediaQuery('(min-width: 3000px)');
    const { isNativeMobile, isIOS } = useResponsive();

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
      refreshYjsIndexedDbProvider,
      activeCommentId,
      setActiveCommentId,
      focusCommentWithActiveId,
      slides,
      setSlides,
      tocItems,
      setTocItems,
    } = useDdocEditor({
      enableIndexeddbSync,
      ddocId,
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
      secureImageUploadUrl,
      isCommentSectionOpen,
      setIsCommentSectionOpen,
      setInlineCommentData,
      inlineCommentData,
      zoomLevel,
      setZoomLevel,
      isNavbarVisible,
      setIsNavbarVisible,
      onInvalidContentError,
      ignoreCorruptedData,
      isPresentationMode,
      proExtensions,
      metadataProxyUrl,
      onCopyHeadingLink,
    });

    useImperativeHandle(
      ref,
      () => ({
        getEditor: () => editor,
        getYdoc: () => ydoc,
        refreshYjsIndexedDbProvider,
        mergeYjsContents: (_contents: string[]) => {
          const contents = Y.mergeUpdates(
            _contents.map((content) => toUint8Array(content)),
          );
          Y.applyUpdate(ydoc, contents, 'self');

          return fromUint8Array(contents);
        },
        exportContentAsMarkDown: (filename: string) => {
          if (editor) {
            const generateDownloadUrl = editor.commands.exportMarkdownFile();
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
      setSelectedTags?.((prevTags) => {
        if (prevTags.length >= 6) {
          // If we already have 6 tags, don't add any more
          return prevTags;
        }

        const newTags = tag.name.split(',').map((name) => {
          const trimmedName = name.trim();
          const existingTag = tags?.find(
            (t) => t.name.toLowerCase() === trimmedName.toLowerCase(),
          );
          return existingTag || { name: trimmedName, color: tag.color };
        });

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

        // Ensure we don't exceed 6 tags
        return uniqueTags.slice(0, 6);
      });
    };
    const handleRemoveTag = (tagName: string) => {
      setSelectedTags?.((prevTags) =>
        prevTags.filter((tag) => tag.name !== tagName),
      );
    };

    const handleClosePresentationMode = () => {
      setIsPresentationMode?.(false);

      // Remove slides parameter from URL
      const url = new URL(window.location.href);
      const hash = url.hash;

      // Split the hash to preserve the key parameter
      const [hashPath, keyParam] = hash.split('&');
      if (keyParam && keyParam.startsWith('slides=')) {
        // Remove only the slides parameter while keeping the key
        url.hash = hashPath;
        window.history.replaceState({}, '', url.toString());
      }
    };

    useEffect(() => {
      if (!editor) return;
      if (isNativeMobile) {
        const { selection } = editor.state;
        const isTextSelected = isTextSelection(selection);

        const handleKeyboardShow = () => {
          setIsKeyboardVisible(true);
        };

        const handleKeyboardHide = () => {
          setIsKeyboardVisible(false);
        };

        !isTextSelected && editor.on('focus', handleKeyboardShow);
        isTextSelected && editor.on('blur', handleKeyboardHide);

        return () => {
          editor.off('focus', handleKeyboardShow);
          editor.off('blur', handleKeyboardHide);
        };
      }
    }, [isNativeMobile, editor]);

    useEffect(() => {
      if (!editor) return;
      // Pressing the enter key will scroll the editor to the current selection
      const handleEnterKey = (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          editor.commands.scrollIntoView();
        }
      };

      const editorElement = editor.view.dom;

      editorElement.addEventListener('keydown', handleEnterKey);

      return () => {
        editorElement.removeEventListener('keydown', handleEnterKey);
      };
    }, [editor]);

    // Push the editor to the top when the keyboard is visible
    useEffect(() => {
      if (!isNativeMobile || !editor) return;

      const handleKeyboardShow = () => {
        if (editorRef.current) {
          editorRef.current.scrollIntoView();
        }
      };

      const editorElement = editor.view.dom;

      editorElement.addEventListener('resize', handleKeyboardShow);

      return () => {
        editorElement.removeEventListener('resize', handleKeyboardShow);
      };
    }, [editor, editorRef, isNativeMobile]);

    if (!editor || isContentLoading) {
      return (
        <div className="w-screen h-screen flex flex-col gap-4 justify-center items-center">
          <Spinner />
          <p>Loading Editor...</p>
        </div>
      );
    }
    return (
      <EditorProvider>
        <div
          id="editor-canvas"
          className={cn(
            'h-[100vh] w-full custom-scrollbar',
            {
              'overflow-x-hidden': zoomLevel !== '2',
              'overflow-x-auto scroll-container': zoomLevel === '2',
            },
            !isPresentationMode ? 'color-bg-secondary' : 'color-bg-default',
            editorCanvasClassNames,
          )}
        >
          <nav
            id="Navbar"
            className={cn(
              'h-14 color-bg-default py-2 px-4 flex gap-2 items-center justify-between w-screen fixed left-0 top-0 border-b color-border-default z-50 transition-transform duration-300',
              {
                'translate-y-0': isNavbarVisible,
                'translate-y-[-100%]': !isNavbarVisible || isPresentationMode,
              },
            )}
          >
            {renderNavbar?.({ editor: editor.getJSON() })}
          </nav>
          <CommentProvider
            editor={editor}
            username={username as string}
            setUsername={setUsername}
            activeCommentId={activeCommentId}
            setActiveCommentId={setActiveCommentId}
            focusCommentWithActiveId={focusCommentWithActiveId}
            initialComments={initialComments}
            setInitialComments={setInitialComments}
            onNewComment={onNewComment}
            onCommentReply={onCommentReply}
            onResolveComment={onResolveComment}
            onUnresolveComment={onUnresolveComment}
            onDeleteComment={onDeleteComment}
            ensResolutionUrl={ensResolutionUrl as string}
            isConnected={isConnected}
            connectViaWallet={connectViaWallet}
            isLoading={isLoading}
            connectViaUsername={connectViaUsername}
            isDDocOwner={isDDocOwner}
            onInlineComment={onInlineComment}
            onComment={onComment}
            setCommentDrawerOpen={setCommentDrawerOpen}
          >
            {!isPreviewMode && (
              <div
                id="toolbar"
                className={cn(
                  'z-50 hidden xl:flex items-center justify-center w-full h-[52px] fixed left-0 color-bg-default border-b color-border-default transition-transform duration-300 top-[3.5rem]',
                  {
                    'translate-y-0': isNavbarVisible,
                    'translate-y-[-108%]': !isNavbarVisible,
                  },
                )}
              >
                <div className="justify-center items-center grow relative color-text-default">
                  <EditorToolBar
                    onError={onError}
                    editor={editor}
                    zoomLevel={zoomLevel}
                    setZoomLevel={setZoomLevel}
                    isNavbarVisible={isNavbarVisible}
                    setIsNavbarVisible={setIsNavbarVisible}
                    secureImageUploadUrl={secureImageUploadUrl}
                    onMarkdownExport={onMarkdownExport}
                    onMarkdownImport={onMarkdownImport}
                    onPdfExport={onPdfExport}
                  />
                </div>
              </div>
            )}
            {isPresentationMode && (
              <PresentationMode
                editor={editor}
                onClose={handleClosePresentationMode}
                isFullscreen={isFullscreen}
                setIsFullscreen={setIsFullscreen}
                onError={onError}
                setCommentDrawerOpen={setCommentDrawerOpen}
                sharedSlidesLink={sharedSlidesLink}
                isPreviewMode={isPreviewMode}
                documentName={documentName as string}
                onSlidesShare={onSlidesShare}
                slides={slides}
                setSlides={setSlides}
                renderThemeToggle={renderThemeToggle}
              />
            )}
            <DocumentOutline
              editor={editor}
              hasToC={true}
              items={tocItems}
              setItems={setTocItems}
              showTOC={showTOC}
              setShowTOC={setShowTOC}
              isPreviewMode={isPreviewMode || !isNavbarVisible}
            />

            <div
              className={cn(
                'color-bg-default w-full mx-auto rounded',
                { 'mt-4 md:!mt-16 !py-20': isPreviewMode && !isNativeMobile },
                { 'md:!mt-16': !isPreviewMode },
                { 'pt-20 md:!mt-[7.5rem]': isNavbarVisible && !isPreviewMode },
                { 'pt-6 md:!mt-16': !isNavbarVisible && !isPreviewMode },
                { 'mt-4 md:!mt-16 py-6': isPreviewMode && isNativeMobile },
                {
                  'max-[1080px]:!mx-auto min-[1081px]:!ml-[18%] min-[1700px]:!mx-auto':
                    isCommentSectionOpen &&
                    !isNativeMobile &&
                    zoomLevel !== '0.5' &&
                    zoomLevel !== '0.75' &&
                    zoomLevel !== '1.4' &&
                    zoomLevel !== '1.5' &&
                    zoomLevel !== '2',
                },
                {
                  '!mx-auto':
                    !isCommentSectionOpen ||
                    zoomLevel === '0.5' ||
                    zoomLevel === '0.75' ||
                    zoomLevel === '1.4' ||
                    zoomLevel === '1.5',
                },
                {
                  '!ml-0': zoomLevel === '2' && isWidth1500px && !isWidth3000px,
                },
                {
                  'w-[700px] md:max-w-[700px] min-h-[150%]':
                    zoomLevel === '0.5',
                },
                {
                  'w-[800px] md:max-w-[800px] min-h-[200%]':
                    zoomLevel === '0.75',
                },
                {
                  'w-[850px] md:max-w-[850px] min-h-[100%]': zoomLevel === '1',
                },
                { 'w-[70%] md:max-w-[70%] min-h-[200%]': zoomLevel === '1.4' },
                {
                  'w-[1062.5px] md:max-w-[1062.5px] min-h-[100%]':
                    zoomLevel === '1.5',
                },
                { 'w-[1548px] md:max-w-[1548px]': zoomLevel === '2' },
              )}
              style={{
                transformOrigin:
                  zoomLevel === '2' && !isWidth3000px
                    ? 'left center'
                    : 'top center',
                transform: `scaleX(${zoomLevel})`,
              }}
            >
              <div
                ref={editorRef}
                className={cn(
                  'w-full h-full pt-8 md:pt-0',
                  { 'custom-ios-padding': isIOS },
                  { 'color-bg-default': zoomLevel === '1.4' || '1.5' },
                )}
                style={{
                  transformOrigin: 'top center',
                  transform: `scaleY(${zoomLevel})`,
                }}
              >
                <div>
                  <EditorBubbleMenu
                    editor={editor}
                    onError={onError}
                    zoomLevel={zoomLevel}
                    disableInlineComment={disableInlineComment || false}
                    setIsCommentSectionOpen={setIsCommentSectionOpen}
                    inlineCommentData={inlineCommentData}
                    setInlineCommentData={setInlineCommentData}
                    isPreviewMode={isPreviewMode}
                    username={username as string}
                    walletAddress={walletAddress as string}
                    onInlineComment={onInlineComment}
                    activeCommentId={activeCommentId}
                    isCollabDocumentPublished={isCollabDocumentPublished}
                  />
                  <ColumnsMenu editor={editor} appendTo={editorRef} />
                </div>
                <EditingProvider isPreviewMode={isPreviewMode}>
                  {tags && tags.length > 0 && (
                    <div
                      ref={tagsContainerRef}
                      className={cn(
                        'flex flex-wrap px-4 md:px-8 lg:px-[80px] items-center gap-1 mb-4 mt-4 lg:!mt-0',
                        { 'pt-12': isPreviewMode },
                      )}
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
                      {selectedTags && selectedTags?.length < 6 ? (
                        <TagInput
                          tags={tags || []}
                          selectedTags={selectedTags as TagType[]}
                          onAddTag={handleAddTag}
                          isPreviewMode={isPreviewMode}
                        />
                      ) : null}
                    </div>
                  )}
                  <EditorContent
                    editor={editor}
                    id="editor"
                    className="w-full h-auto py-4 color-bg-default"
                  />
                </EditingProvider>
              </div>
              {showCommentButton && !isNativeMobile && (
                <Button
                  ref={btn_ref}
                  onClick={() => {
                    handleCommentButtonClick?.(editor);
                  }}
                  variant="ghost"
                  className={cn(
                    'absolute w-12 h-12 color-bg-default rounded-full shadow-xl top-[70px] right-[-23px]',
                  )}
                >
                  <LucideIcon name="MessageSquareText" size="sm" />
                </Button>
              )}
            </div>
            {!isPreviewMode && !disableBottomToolbar && (
              <div
                className={cn(
                  'flex xl:hidden items-center w-full h-[52px] absolute left-0 z-10 px-4 color-bg-default transition-all duration-300 ease-in-out border-b border-color-default',
                  isKeyboardVisible && 'hidden',
                  { 'top-14': isNavbarVisible, 'top-0': !isNavbarVisible },
                )}
              >
                <MobileToolbar
                  onError={onError}
                  editor={editor}
                  isKeyboardVisible={isKeyboardVisible}
                  isNavbarVisible={isNavbarVisible}
                  setIsNavbarVisible={setIsNavbarVisible}
                  secureImageUploadUrl={secureImageUploadUrl}
                />
              </div>
            )}
            <CommentDrawer
              isOpen={commentDrawerOpen as boolean}
              onClose={() => setCommentDrawerOpen?.(false)}
              isNavbarVisible={isNavbarVisible}
              isPresentationMode={isPresentationMode as boolean}
              activeCommentId={activeCommentId}
              isPreviewMode={isPreviewMode}
            />
            <div>
              <CommentBubbleCard
                editor={editor}
                activeCommentId={activeCommentId}
                commentDrawerOpen={commentDrawerOpen as boolean}
                isCollabDocumentPublished={isCollabDocumentPublished}
              />
            </div>
          </CommentProvider>
        </div>
      </EditorProvider>
    );
  },
);

export default DdocEditor;
