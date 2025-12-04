import { EditorContent, Extension, isTextSelection } from '@tiptap/react';
import { EditorBubbleMenu } from './components/editor-bubble-menu/editor-bubble-menu';
import { DdocProps } from './types';
import { ColumnsMenu } from './extensions/multi-column/menus';
import { EditingProvider } from './hooks/use-editing-context';
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
import {
  Button,
  LucideIcon,
  Tag,
  TagType,
  TagInput,
  Skeleton,
} from '@fileverse/ui';
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
import { fadeInTransition, slideUpTransition } from './components/motion-div';
import { PreviewContentLoader } from './components/preview-content-loader';
import { Reminder } from './extensions/reminder-block/types';
import {
  CANVAS_DIMENSIONS,
  ORIENTATION_CONSTRAINTS,
} from './constants/canvas-dimensions';

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
      ipfsImageUploadFn,
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
      onHtmlExport,
      onTxtExport,
      onDocxImport,
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
      isConnected,
      connectViaWallet,
      isLoading,
      connectViaUsername,
      isDDocOwner,
      isCollabDocumentPublished = true,
      disableInlineComment,
      renderThemeToggle,
      metadataProxyUrl,
      extensions,
      onCopyHeadingLink,
      footerHeight,
      ipfsImageFetchFn,
      fetchV1ImageFn,
      activeModel,
      maxTokens,
      isAIAgentEnabled,
      collaborationKey,
      collaborationKeyPair,

      collabConfig,
      // Document styling object
      documentStyling,
      ...rest
    }: DdocProps,
    ref,
  ) => {
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    /**
     * Document styling system with dark mode support
     * When no document styling exists, CSS classes handle theming (including dark mode)
     * When document styling exists, it applies custom styles
     */

    // Helper to merge document styling with dark mode requirements
    const getMergedStyles = () => {
      // If no document styling is provided, return undefined to let CSS classes handle everything
      if (!documentStyling) {
        return { canvas: undefined, background: undefined };
      }

      const canvas: React.CSSProperties = {};
      const background: React.CSSProperties = {};

      // Apply custom document styling
      if (documentStyling.canvasBackground) {
        canvas.backgroundColor = documentStyling.canvasBackground;
      }
      if (documentStyling.textColor) {
        canvas.color = documentStyling.textColor;
      }
      if (documentStyling.fontFamily) {
        canvas.fontFamily = documentStyling.fontFamily;
      }
      if (documentStyling.background) {
        background.background = documentStyling.background;
      }

      return {
        canvas: Object.keys(canvas).length > 0 ? canvas : undefined,
        background: Object.keys(background).length > 0 ? background : undefined,
      };
    };

    const mergedStyles = getMergedStyles();

    // Helper functions that return styles only when they should override CSS classes
    const getCanvasStyle = () => mergedStyles.canvas;
    const getBackgroundStyle = () => mergedStyles.background;

    /**
     * Get dimension styles based on current orientation and zoom level
     * Returns inline styles for width and minHeight
     *
     * Behavior:
     * - Mobile: Responsive width (100%) and full viewport height
     * - Desktop fixed widths: Applied from CANVAS_DIMENSIONS (mimics real paper)
     * - Desktop zoom 1.4 (fit): Reduced percentages to account for 1.4x transform scaling
     */
    const getDimensionStyles = (): React.CSSProperties => {
      // On mobile, use full viewport height for immersive editing experience
      if (isNativeMobile) {
        return {
          minHeight: '100vh',
        };
      }

      const orientation =
        documentStyling?.orientation === 'landscape' ? 'landscape' : 'portrait';
      const dimensions =
        CANVAS_DIMENSIONS[orientation][
          zoomLevel as keyof typeof CANVAS_DIMENSIONS.portrait
        ];

      if (!dimensions) return {};

      const styles: React.CSSProperties = {};
      const constraints = ORIENTATION_CONSTRAINTS[orientation];

      // Apply width based on dimension type
      if (typeof dimensions.width === 'number') {
        // Fixed pixel widths - canvas behaves like real paper with consistent size
        styles.width = `${dimensions.width}px`;
        styles.maxWidth = `${dimensions.width}px`;
      } else {
        // Percentage widths (zoom 1.4 only) - account for transform: scaleX(1.4) scaling
        // Use reduced percentages to prevent overflow after scaling
        styles.width = constraints.zoomFitWidth;
        styles.maxWidth = `${constraints.zoomFitMaxWidth}px`;
      }

      // Apply minHeight constraint
      if (dimensions.minHeight) {
        styles.minHeight = dimensions.minHeight;
      }

      return styles;
    };

    const btn_ref = useRef(null);
    const isWidth1500px = useMediaQuery('(min-width: 1500px)');
    const isWidth3000px = useMediaQuery('(min-width: 3000px)');
    const isWidth1600px = useMediaQuery('(min-width: 1600px)');
    const isWidth1360px = useMediaQuery('(min-width: 1360px)');
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
      terminateSession,
    } = useDdocEditor({
      ipfsImageFetchFn,
      fetchV1ImageFn,
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
      ipfsImageUploadFn,
      isCommentSectionOpen,
      setIsCommentSectionOpen,
      setInlineCommentData,
      inlineCommentData,
      zoomLevel,
      setZoomLevel,
      isNavbarVisible,
      setIsNavbarVisible,
      onDocxImport,
      onInvalidContentError,
      ignoreCorruptedData,
      isPresentationMode,
      metadataProxyUrl,
      extensions,
      onCopyHeadingLink,
      isConnected,
      activeModel,
      maxTokens,
      isAIAgentEnabled,
      collaborationKey,
      collaborationKeyPair,

      collabConfig,
      ...rest,
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
          Y.applyUpdate(ydoc as unknown as Y.Doc, contents, 'self');

          return fromUint8Array(contents);
        },
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
        updateReminderNode: ({
          id,
          status,
        }: {
          id: string;
          status: Reminder['status'];
        }) => {
          if (!editor) throw new Error('cannot update node without editor');

          editor.commands.command(({ tr, state, dispatch }) => {
            const { doc } = state;
            let updated = false;

            doc.descendants((node, pos) => {
              if (
                node.type.name === 'reminderBlock' &&
                node.attrs.reminder.id === id
              ) {
                if (status === 'cancelled') {
                  tr.delete(pos, pos + node.nodeSize);
                } else {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    reminder: {
                      ...node.attrs.reminder,
                      status,
                    },
                  });
                }
                updated = true;
                return false; // stop traversal
              }
            });

            if (updated && dispatch) {
              dispatch(tr);
              return true;
            }

            return false;
          });
        },
        updateCollaboratorName: (name: string) => {
          if (!editor) {
            console.debug('collab: cannot find editor');
            return;
          }

          const existingUser = editor.storage.collaborationCaret?.users?.find(
            (user: Record<string, unknown>) => {
              return user?.clientId === ydoc.clientID;
            },
          ) as Record<string, unknown> | undefined;

          const newUser = {
            name,
          } as Record<string, unknown>;

          if (existingUser) {
            // newUser.clientId = existingUser.clientId;
            newUser.color = existingUser.color;
            newUser.isEns = existingUser.isEns;
          }
          if (typeof editor.commands.updateUser === 'function') {
            editor.commands.updateUser(newUser);
            editor.setEditable(true);
          }
        },
        terminateSession,
      }),

      // eslint-disable-next-line react-hooks/exhaustive-deps
      [editor],
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

    const isMobile = useMediaQuery('(max-width: 768px)');

    const renderComp = () => {
      return (
        <AnimatePresence>
          <>
            {!isPreviewMode && (
              <div
                id="toolbar"
                className={cn(
                  'z-[45] hidden mobile:flex items-center justify-center w-full h-[52px] fixed left-0 color-bg-default border-b color-border-default transition-transform duration-300 top-[3.5rem]',
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
                    ipfsImageUploadFn={ipfsImageUploadFn}
                    onMarkdownExport={onMarkdownExport}
                    onMarkdownImport={onMarkdownImport}
                    onPdfExport={onPdfExport}
                    onHtmlExport={onHtmlExport}
                    onTxtExport={onTxtExport}
                    onDocxImport={onDocxImport}
                    isLoading={!editor || isContentLoading}
                    ipfsImageFetchFn={ipfsImageFetchFn}
                    fetchV1ImageFn={fetchV1ImageFn}
                  />
                </div>
              </div>
            )}
            {isPresentationMode && editor && (
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
                isContentLoading={isContentLoading}
                ipfsImageFetchFn={ipfsImageFetchFn}
                documentStyling={documentStyling}
                fetchV1ImageFn={fetchV1ImageFn}
              />
            )}
            {editor && (
              <DocumentOutline
                editor={editor}
                hasToC={true}
                items={tocItems}
                setItems={setTocItems}
                showTOC={showTOC}
                setShowTOC={setShowTOC}
                isPreviewMode={isPreviewMode || !isNavbarVisible}
                orientation={documentStyling?.orientation}
              />
            )}

            <div
              id="editor-wrapper"
              className={cn(
                'w-full mx-auto rounded transition-all duration-300 ease-in-out',
                !documentStyling?.canvasBackground && 'color-bg-default',
                !isPreviewMode &&
                  (isNavbarVisible
                    ? '-mt-[1.5rem] md:!mt-[0.8rem] pt-0 md:pt-[5rem]'
                    : 'pt-0 md:pt-[1.5rem]'),
                isPreviewMode && 'md:!mt-[1rem] pt-0 md:!pt-[5rem]',
                { 'md:!mt-[0.7rem]': !isPreviewMode },
                {
                  '-mt-[1.5rem] md:!mt-[0.7rem]':
                    !isNavbarVisible && !isPreviewMode,
                },
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
                    (!isCommentSectionOpen &&
                      !(
                        showTOC &&
                        !isNativeMobile &&
                        zoomLevel === '1' &&
                        documentStyling?.orientation === 'landscape' &&
                        isWidth1360px && // Shift applies from 1360px
                        !isWidth1600px // Up to 1600px, then canvas stays centered
                      )) ||
                    zoomLevel === '0.5' ||
                    zoomLevel === '0.75' ||
                    zoomLevel === '1.4' ||
                    zoomLevel === '1.5',
                },
                {
                  '!ml-0': zoomLevel === '2' && isWidth1500px && !isWidth3000px,
                },
                // TOC shift for landscape mode on 1360-1599px - shift canvas right by TOC width + padding
                // Provides just enough clearance (200px) without excessive gap
                {
                  'min-[1360px]:!ml-[200px] min-[1360px]:!mr-auto':
                    showTOC &&
                    !isNativeMobile &&
                    zoomLevel === '1' &&
                    documentStyling?.orientation === 'landscape' &&
                    !isWidth1600px, // Only shift on screens < 1600px
                },
              )}
              style={{
                transformOrigin:
                  zoomLevel === '2' && !isWidth3000px
                    ? 'left center'
                    : 'top center',
                transform: `scaleX(${zoomLevel})`,
                ...(getCanvasStyle() || {}),
                ...getDimensionStyles(), // Apply dynamic width/height based on orientation
              }}
            >
              <div
                ref={editorRef}
                className={cn(
                  'w-full h-full pt-8 md:pt-0',
                  { 'custom-ios-padding': isIOS },
                  {
                    'color-bg-default':
                      !documentStyling?.canvasBackground &&
                      (zoomLevel === '1.4' || zoomLevel === '1.5'),
                  },
                )}
                style={{
                  transformOrigin: 'top center',
                  transform: `scaleY(${zoomLevel})`,
                }}
              >
                <div>
                  {editor && (
                    <EditorBubbleMenu
                      editor={editor}
                      //@ts-expect-error error mismatch here
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
                      ipfsImageFetchFn={ipfsImageFetchFn}
                      fetchV1ImageFn={fetchV1ImageFn}
                      ipfsImageUploadFn={ipfsImageUploadFn}
                      onReminderCreate={
                        extensions?.find(
                          (ext: Extension) => ext.name === 'reminderBlock',
                        )?.options?.onReminderCreate
                      }
                      isConnected={isConnected}
                      isCollabDocOwner={
                        collabConfig?.roomKey ? collabConfig?.isOwner : true
                      }
                      enableCollaboration={enableCollaboration}
                    />
                  )}

                  {editor && (
                    <ColumnsMenu editor={editor} appendTo={editorRef} />
                  )}
                </div>

                {!editor || isContentLoading
                  ? fadeInTransition(
                      <div className={`${!isMobile ? 'mx-20' : 'mx-10 mt-10'}`}>
                        <Skeleton
                          className={`${isPreviewMode ? 'w-full' : isMobile ? 'w-full' : 'w-[400px]'}  h-[32px] rounded-sm mb-4`}
                        />
                        {isPreviewMode && <PreviewContentLoader />}
                      </div>,
                      'content-transition',
                    )
                  : slideUpTransition(
                      <div>
                        <EditingProvider
                          isPreviewMode={isPreviewMode}
                          isCollaboratorsDoc={
                            !!collabConfig?.roomKey && !collabConfig?.isOwner
                          }
                        >
                          {tags && tags.length > 0 && (
                            <div
                              ref={tagsContainerRef}
                              className={cn(
                                'flex flex-wrap px-4 md:px-8 lg:px-[80px] mb-8 items-center gap-1 mt-4 lg:!mt-0',
                                { 'pt-12': isPreviewMode },
                              )}
                              {...(getCanvasStyle() && {
                                style: getCanvasStyle(),
                              })}
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
                                      onRemove={() =>
                                        handleRemoveTag(tag?.name)
                                      }
                                      isRemovable={!isPreviewMode}
                                      className="!h-6 rounded"
                                    >
                                      {tag?.name}
                                    </Tag>
                                  ))}
                                </motion.div>
                              )}

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
                          <div className="grammarly-wrapper">
                            <EditorContent
                              editor={editor}
                              id="editor"
                              className={cn(
                                'w-full h-auto',
                                !documentStyling?.canvasBackground &&
                                  'color-bg-default',
                                isPreviewMode && 'preview-mode',
                                activeModel !== undefined &&
                                  isAIAgentEnabled &&
                                  'has-available-models',
                                disableInlineComment && 'hide-inline-comments',
                              )}
                              {...(getCanvasStyle() && {
                                style: getCanvasStyle(),
                              })}
                            />
                          </div>
                        </EditingProvider>
                      </div>,
                      'editor-transition',
                    )}
              </div>
            </div>
            {showCommentButton && !isNativeMobile && (
              <Button
                ref={btn_ref}
                onClick={() => {
                  if (!editor) return;
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
            {!isPreviewMode && !disableBottomToolbar && (
              <div
                className={cn(
                  'flex mobile:hidden items-center w-full h-[52px] fixed left-0 z-10 px-4 color-bg-default transition-all duration-300 ease-in-out border-b border-color-default',
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
                  ipfsImageUploadFn={ipfsImageUploadFn}
                  isLoading={!editor || isContentLoading}
                  ipfsImageFetchFn={ipfsImageFetchFn}
                  fetchV1ImageFn={fetchV1ImageFn}
                />
              </div>
            )}
            {editor && (
              <CommentDrawer
                isOpen={commentDrawerOpen as boolean}
                onClose={() => setCommentDrawerOpen?.(false)}
                isNavbarVisible={isNavbarVisible}
                isPresentationMode={isPresentationMode as boolean}
                activeCommentId={activeCommentId}
                isPreviewMode={isPreviewMode}
              />
            )}

            <div>
              {editor && (
                <CommentBubbleCard
                  editor={editor}
                  activeCommentId={activeCommentId}
                  commentDrawerOpen={commentDrawerOpen as boolean}
                  isCollabDocumentPublished={isCollabDocumentPublished}
                  disableInlineComment={disableInlineComment}
                />
              )}
            </div>
          </>
        </AnimatePresence>
      );
    };

    return (
      <EditorProvider documentStyling={documentStyling}>
        <div
          className={cn(
            'w-full',
            !isPresentationMode ? 'color-bg-secondary' : 'color-bg-default',
          )}
          style={{
            height: !isPreviewMode
              ? isNavbarVisible
                ? `calc(100vh - 108px - ${footerHeight || '0px'})`
                : `calc(100vh - 52px - ${footerHeight || '0px'})`
              : `calc(100vh - 52px - ${footerHeight || '0px'})`,
          }}
        >
          <div
            id="editor-canvas"
            className={cn(
              'h-[100%] w-full custom-scrollbar',
              !isPreviewMode &&
                (isNavbarVisible ? 'mt-[6.7rem]' : 'mt-[3.3rem]'),
              isPreviewMode && 'mt-[3.5rem]',
              {
                'overflow-x-hidden': zoomLevel !== '2',
                'overflow-x-auto scroll-container': zoomLevel === '2',
              },
              !isPresentationMode ? 'color-bg-secondary' : 'color-bg-default',
              editorCanvasClassNames,
            )}
            style={getBackgroundStyle()}
          >
            <nav
              id="Navbar"
              className={cn(
                'h-14 color-bg-default py-2 px-0 md:px-4 flex gap-2 items-center justify-between w-screen fixed left-0 top-0 border-b color-border-default z-[45] transition-transform duration-300',
                {
                  'translate-y-0': isNavbarVisible,
                  'translate-y-[-100%]': !isNavbarVisible || isPresentationMode,
                },
              )}
            >
              {editor && renderNavbar?.({ editor: editor.getJSON() })}
            </nav>
            {!editor ? (
              renderComp()
            ) : (
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
                {renderComp()}
              </CommentProvider>
            )}
          </div>
        </div>
      </EditorProvider>
    );
  },
);

export default DdocEditor;
