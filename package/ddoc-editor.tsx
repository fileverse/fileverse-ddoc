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
  useMemo,
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
import { toUint8Array } from 'js-base64';
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
import { EmbedSettings } from './extensions/twitter-embed/embed-settings';
import { DEFAULT_TAB_ID } from './components/tabs/utils/tab-utils';
import { PreviewModeExportTrigger } from './components/preview-export-trigger';
import {
  getResponsiveThemeTextColor,
  getThemeStyle,
} from './utils/document-styling';
import { useFocusMode } from './hooks/use-fullscreen-mode';
import { FullScreenToolbar } from './components/fullscreen-toolbar';
import { mergeTabAwareYjsUpdates } from './components/tabs/utils/tab-utils';

const DdocEditor = forwardRef(
  (
    {
      isPreviewMode = false,
      initialContent,
      collaboration,
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
      onFocusMode,
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
      theme,
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
      tabConfig,
      footerHeight,
      ipfsImageFetchFn,
      fetchV1ImageFn,
      activeModel,
      maxTokens,
      isAIAgentEnabled,
      // Document styling object
      documentStyling,
      ...rest
    }: DdocProps,
    ref,
  ) => {
    const { isFocusMode, toggleFocusMode } = useFocusMode({ onFocusMode });
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const exportTriggerRef = useRef<
      ((format?: string, name?: string) => void) | null
    >(null);

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
      const currentTheme = theme ?? 'light';

      // Apply custom document styling
      if (documentStyling.canvasBackground) {
        const themeCanvasBackground = getThemeStyle(
          documentStyling.canvasBackground,
          currentTheme,
        );
        canvas.backgroundColor = themeCanvasBackground;
      }
      if (documentStyling.textColor) {
        const responsiveTextColor = getResponsiveThemeTextColor(
          documentStyling.textColor,
          currentTheme,
        );
        if (responsiveTextColor) {
          canvas.color = responsiveTextColor;
        }
      }
      if (documentStyling.fontFamily) {
        canvas.fontFamily = documentStyling.fontFamily;
      }
      if (documentStyling.background) {
        const themeBackgroundStyle = getThemeStyle(
          documentStyling.background,
          currentTheme,
        );
        background.background = themeBackgroundStyle;
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

    const btn_ref = useRef(null);
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
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const {
      editor,
      ref: editorRef,
      isContentLoading,
      ydoc,
      awareness,
      refreshYjsIndexedDbProvider,
      activeCommentId,
      setActiveCommentId,
      focusCommentWithActiveId,
      slides,
      setSlides,
      tocItems,
      setTocItems,
      terminateSession,
      tabs,
      setTabs,
      activeTabId,
      setActiveTabId,
      createTab,
      renameTab,
      duplicateTab,
      orderTab,
      deleteTab,
    } = useDdocEditor({
      documentStyling,
      ipfsImageFetchFn,
      fetchV1ImageFn,
      enableIndexeddbSync,
      ddocId,
      isPreviewMode,
      initialContent,
      collaboration,
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
      theme,
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
      disableInlineComment,
      onCopyHeadingLink,
      isConnected,
      activeModel,
      maxTokens,
      isAIAgentEnabled,
      isDDocOwner,
      tabConfig,
      ...rest,
    });

    useImperativeHandle(
      ref,
      () => ({
        getEditor: () => editor,
        getYdoc: () => ydoc,
        refreshYjsIndexedDbProvider,
        mergeYjsContents: (_contents: string[]) => {
          const mergedContent = mergeTabAwareYjsUpdates(_contents);
          Y.applyUpdate(
            ydoc as unknown as Y.Doc,
            toUint8Array(mergedContent),
            'self',
          );

          return mergedContent;
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
          if (!editor || !awareness) {
            console.debug('collab: cannot find editor or awareness');
            return;
          }

          const localState = awareness.getLocalState();
          const existingUser = localState?.user as
            | Record<string, unknown>
            | undefined;

          const newUser = {
            name,
            color: existingUser?.color,
            isEns: existingUser?.isEns,
          };

          awareness.setLocalStateField('user', newUser);
          editor.setEditable(true);
        },
        exportCurrentTabOrOpenExportModal: (format = 'pdf', name?: string) => {
          exportTriggerRef.current?.(format, name);
        },
        terminateSession,
      }),

      // eslint-disable-next-line react-hooks/exhaustive-deps
      [editor, awareness],
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

      try {
        const editorElement = editor.view.dom;
        if (!editorElement) return;

        // Pressing the enter key will scroll the editor to the current selection
        const handleEnterKey = (event: KeyboardEvent) => {
          if (event.key === 'Enter') {
            editor.commands.scrollIntoView();
          }
        };

        editorElement.addEventListener('keydown', handleEnterKey);

        return () => {
          editorElement.removeEventListener('keydown', handleEnterKey);
        };
      } catch (error) {
        // View not ready yet, skip this effect
        return;
      }
    }, [editor]);

    // Push the editor to the top when the keyboard is visible
    useEffect(() => {
      if (!isNativeMobile || !editor) return;

      try {
        const editorElement = editor.view.dom;
        if (!editorElement) return;

        const handleKeyboardShow = () => {
          if (editorRef.current) {
            editorRef.current.scrollIntoView();
          }
        };

        editorElement.addEventListener('resize', handleKeyboardShow);

        return () => {
          editorElement.removeEventListener('resize', handleKeyboardShow);
        };
      } catch (error) {
        // View not ready yet, skip this effect
        return;
      }
    }, [editor, editorRef, isNativeMobile]);

    const isMobile = useMediaQuery('(max-width: 768px)');
    const tabCommentCounts = useMemo(() => {
      return (initialComments || []).reduce<Record<string, number>>(
        (acc, comment) => {
          if (comment.deleted) return acc;
          const tabId = comment.tabId || DEFAULT_TAB_ID;
          acc[tabId] = (acc[tabId] || 0) + 1;
          return acc;
        },
        {},
      );
    }, [initialComments]);
    const baseWidth = documentStyling?.orientation === 'landscape' ? 1190 : 850;

    const zoom = Number(zoomLevel);
    const scaledWidth = baseWidth * zoom;
    const shouldRenderDocumentOutline =
      (tabs.length > 0 ||
        (tocItems.length > 0 && !rest.versionHistoryState?.enabled)) &&
      (!isFocusMode || showTOC);

    const containerWidth =
      typeof window !== 'undefined' ? window.innerWidth : 0;
    const shouldHideRight = scaledWidth + 148 * 2 > containerWidth;

    const leftWidth = shouldRenderDocumentOutline ? 148 : 0;

    // remaining space after reserving left
    const availableSpace = containerWidth - leftWidth;

    // should editor overflow?
    const shouldScroll = scaledWidth > availableSpace;
    const editorContentRef = useRef<HTMLDivElement | null>(null);

    const handleFocusModeMouseDown = (event: React.MouseEvent) => {
      if (!isFocusMode || !editor || event.button !== 0) return;

      const target = event.target as Node;

      const clickedInsideEditor = editorContentRef.current?.contains(target);

      if (clickedInsideEditor) {
        return;
      }

      event.preventDefault();
      editor.commands.focus('end', { scrollIntoView: false });
    };

    const renderComp = () => {
      return (
        <AnimatePresence>
          <>
            {isFocusMode && (
              <FullScreenToolbar
                dropdownOpen={dropdownOpen}
                setDropdownOpen={setDropdownOpen}
                zoomLevel={zoomLevel}
                setZoomLevel={setZoomLevel}
                showTOC={showTOC}
                setShowTOC={setShowTOC}
                toggleFocusMode={toggleFocusMode}
              />
            )}

            {!isPreviewMode && (
              <div
                id="toolbar"
                className={cn(
                  'z-[45] hidden mobile:flex items-center justify-center w-full h-[52px] fixed left-0 color-bg-default border-b color-border-default transition-all duration-300 top-[3.5rem]',
                  {
                    'translate-y-0 opacity-100':
                      !isFocusMode && isNavbarVisible,
                    'translate-y-[-108%] opacity-0 pointer-events-none':
                      isFocusMode || !isNavbarVisible,
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
                    isConnected={isConnected}
                    tabs={tabs}
                    ydoc={ydoc}
                    toggleFocusMode={toggleFocusMode}
                    onRegisterExportTrigger={(trigger) => {
                      exportTriggerRef.current = trigger;
                    }}
                  />
                </div>
              </div>
            )}
            {isPreviewMode && editor && (
              <PreviewModeExportTrigger
                editor={editor}
                ydoc={ydoc}
                tabs={tabs}
                onRegisterExportTrigger={(trigger) => {
                  exportTriggerRef.current = trigger;
                }}
                onError={onError}
                ipfsImageUploadFn={ipfsImageUploadFn}
                onMarkdownExport={onMarkdownExport}
                onMarkdownImport={onMarkdownImport}
                onPdfExport={onPdfExport}
                onHtmlExport={onHtmlExport}
                onTxtExport={onTxtExport}
                ipfsImageFetchFn={ipfsImageFetchFn}
                onDocxImport={onDocxImport}
                fetchV1ImageFn={fetchV1ImageFn}
                isConnected={isConnected}
              />
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
                theme={theme ?? 'light'}
              />
            )}
            <div
              className={cn(
                !isMobile && 'flex-[1_1_263px]',
                !isPreviewMode &&
                  !isFocusMode &&
                  isNavbarVisible &&
                  '-mt-[1.5rem] md:!mt-[0.8rem]',
                isPreviewMode && 'md:!mt-[1rem]',
                { 'md:!mt-[0.7rem]': !isPreviewMode && !isFocusMode },
                {
                  '-mt-[1.5rem] md:!mt-[0.7rem]':
                    !isNavbarVisible && !isPreviewMode,
                },
                isFocusMode && 'mt-[48px]',
                isFocusMode && !showTOC && shouldHideRight && 'hidden',
              )}
            >
              {editor && shouldRenderDocumentOutline && (
                <DocumentOutline
                  editor={editor}
                  hasToC={true}
                  items={tocItems}
                  setItems={setTocItems}
                  showTOC={showTOC}
                  setShowTOC={setShowTOC}
                  isPreviewMode={isPreviewMode || !isNavbarVisible}
                  orientation={documentStyling?.orientation}
                  tabs={tabs}
                  setTabs={setTabs}
                  activeTabId={activeTabId}
                  setActiveTabId={setActiveTabId}
                  createTab={createTab}
                  renameTab={renameTab}
                  duplicateTab={duplicateTab}
                  orderTab={orderTab}
                  deleteTab={deleteTab}
                  ydoc={ydoc}
                  tabCommentCounts={tabCommentCounts}
                  tabConfig={tabConfig}
                  isConnected={isConnected}
                />
              )}
            </div>
            <div className={cn('flex w-full overflow-auto')}>
              <div className="w-full h-full">
                <div
                  className={cn('flex min-h-[100%]', !isMobile && 'min-w-max')}
                >
                  <div
                    className={cn(
                      'flex-grow min-w-0 flex overflow-y-hidden items-stretch',
                      shouldRenderDocumentOutline
                        ? shouldScroll
                          ? 'justify-start overflow-x-auto'
                          : 'justify-center'
                        : 'justify-start overflow-x-auto',
                    )}
                  >
                    <div
                      id="editor-wrapper"
                      className={cn(
                        'w-full flex-grow min-w-0 no-scrollbar rounded transition-all mx-auto duration-300 ease-in-out',
                        !documentStyling?.canvasBackground &&
                          !isFocusMode &&
                          'color-bg-default',
                        !isPreviewMode &&
                          !isFocusMode &&
                          (isNavbarVisible
                            ? '-mt-[1.5rem] md:!mt-[0.8rem] pt-0 md:pt-[5rem]'
                            : 'pt-0 md:pt-[1.5rem]'),
                        isPreviewMode && 'md:!mt-[1rem] pt-0 md:!pt-[5rem]',
                        { 'md:!mt-[0.7rem]': !isPreviewMode && !isFocusMode },
                        {
                          '-mt-[1.5rem] md:!mt-[0.7rem]':
                            !isNavbarVisible && !isPreviewMode,
                        },
                        isFocusMode && 'mt-[48px]',
                        zoomLevel !== '1' && 'overflow-auto',
                      )}
                      style={{
                        ...(isMobile
                          ? {}
                          : {
                              width: `${scaledWidth}px`,
                              maxWidth: `${scaledWidth}px`,
                            }),
                        flexShrink: 0,
                        minHeight: '100%',
                        ...(!isFocusMode ? getCanvasStyle() || {} : {}),
                      }}
                    >
                      <div
                        ref={editorRef}
                        className={cn(
                          'w-full pt-8 md:pt-0',
                          { 'custom-ios-padding': isIOS },
                          {
                            'color-bg-default':
                              !documentStyling?.canvasBackground &&
                              (zoomLevel === '1.4' || zoomLevel === '1.5') &&
                              !isFocusMode,
                          },
                        )}
                        style={
                          isMobile
                            ? {}
                            : {
                                width: `${baseWidth}px`,
                                transform: `scale(${zoom})`,
                                transformOrigin: 'top left',
                                height: `${100 / zoom}%`,
                              }
                        }
                      >
                        <div>
                          {editor && (
                            <>
                              <EditorBubbleMenu
                                editor={editor}
                                //@ts-expect-error error mismatch here
                                onError={onError}
                                zoomLevel={zoomLevel}
                                disableInlineComment={
                                  disableInlineComment || false
                                }
                                setIsCommentSectionOpen={
                                  setIsCommentSectionOpen
                                }
                                inlineCommentData={inlineCommentData}
                                setInlineCommentData={setInlineCommentData}
                                isPreviewMode={isPreviewMode}
                                username={username as string}
                                walletAddress={walletAddress as string}
                                onInlineComment={onInlineComment}
                                activeCommentId={activeCommentId}
                                isCollabDocumentPublished={
                                  isCollabDocumentPublished
                                }
                                ipfsImageFetchFn={ipfsImageFetchFn}
                                fetchV1ImageFn={fetchV1ImageFn}
                                ipfsImageUploadFn={ipfsImageUploadFn}
                                onReminderCreate={
                                  extensions?.find(
                                    (ext: Extension) =>
                                      ext.name === 'reminderBlock',
                                  )?.options?.onReminderCreate
                                }
                                isConnected={isConnected}
                                isCollabDocOwner={
                                  collaboration?.enabled
                                    ? collaboration.connection.isOwner
                                    : true
                                }
                                enableCollaboration={collaboration?.enabled}
                              />
                              <EmbedSettings editor={editor} />
                            </>
                          )}

                          {editor && (
                            <ColumnsMenu editor={editor} appendTo={editorRef} />
                          )}
                        </div>

                        {!editor || isContentLoading
                          ? fadeInTransition(
                              <div
                                className={`${!isMobile ? 'mx-20' : 'mx-10 mt-10'}`}
                              >
                                {isPreviewMode ? (
                                  <PreviewContentLoader />
                                ) : (
                                  <Skeleton
                                    className={`${isMobile ? 'w-full' : 'w-[400px]'}  h-[32px] rounded-sm mb-4`}
                                  />
                                )}
                              </div>,
                              'content-transition',
                            )
                          : slideUpTransition(
                              <div>
                                <EditingProvider
                                  isPreviewMode={isPreviewMode}
                                  isCollaboratorsDoc={
                                    collaboration?.enabled === true &&
                                    !collaboration.connection.isOwner
                                  }
                                >
                                  {tags && tags.length > 0 && (
                                    <div
                                      ref={tagsContainerRef}
                                      className={cn(
                                        'flex flex-wrap px-4 md:px-8 lg:px-[80px] mb-8 items-center gap-1 mt-4 lg:!mt-0',
                                        { 'pt-12': isPreviewMode },
                                      )}
                                      {...(!isFocusMode &&
                                        getCanvasStyle() && {
                                          style: getCanvasStyle(),
                                        })}
                                    >
                                      {visibleTags.map((tag, index) => (
                                        <Tag
                                          key={index}
                                          style={{
                                            backgroundColor: tag?.color,
                                          }}
                                          onRemove={() =>
                                            handleRemoveTag(tag?.name)
                                          }
                                          isRemovable={!isPreviewMode}
                                          className="!h-6 rounded"
                                        >
                                          {tag?.name}
                                        </Tag>
                                      ))}
                                      {hiddenTagsCount > 0 &&
                                        !isHiddenTagsVisible && (
                                          <Button
                                            variant="ghost"
                                            className="!h-6 rounded min-w-fit !px-2 color-bg-secondary text-helper-text-sm"
                                            onClick={() =>
                                              setIsHiddenTagsVisible(true)
                                            }
                                          >
                                            +{hiddenTagsCount}
                                          </Button>
                                        )}

                                      {isHiddenTagsVisible && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{
                                            opacity: 1,
                                            height: 'auto',
                                          }}
                                          exit={{ opacity: 0, height: 0 }}
                                          transition={{ duration: 0.3 }}
                                          className="flex flex-wrap items-center gap-1"
                                        >
                                          {selectedTags
                                            ?.slice(4)
                                            .map((tag, index) => (
                                              <Tag
                                                key={index + 4}
                                                style={{
                                                  backgroundColor: tag?.color,
                                                }}
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

                                      {selectedTags &&
                                      selectedTags?.length < 6 ? (
                                        <TagInput
                                          tags={tags || []}
                                          selectedTags={
                                            selectedTags as TagType[]
                                          }
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
                                      ref={editorContentRef}
                                      className={cn(
                                        'w-full h-auto',
                                        isPreviewMode && 'preview-mode',
                                        activeModel !== undefined &&
                                          isAIAgentEnabled &&
                                          'has-available-models',
                                        disableInlineComment &&
                                          'hide-inline-comments',
                                      )}
                                    />
                                  </div>
                                </EditingProvider>
                              </div>,
                              'editor-transition',
                            )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  !isMobile && 'flex-[1_1_263px]',
                  !isPreviewMode &&
                    !isFocusMode &&
                    isNavbarVisible &&
                    '-mt-[1.5rem] md:!mt-[0.8rem]',
                  isPreviewMode && 'md:!mt-[1rem]',
                  { 'md:!mt-[0.7rem]': !isPreviewMode && !isFocusMode },
                  {
                    '-mt-[1.5rem] md:!mt-[0.7rem]':
                      !isNavbarVisible && !isPreviewMode,
                  },
                  isFocusMode && 'mt-[48px]',
                  isFocusMode && !showTOC && shouldHideRight && 'hidden',
                )}
              ></div>
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
      <EditorProvider
        documentStyling={documentStyling}
        theme={theme ?? 'light'}
        isFocusMode={isFocusMode}
      >
        <div
          className={cn(
            'w-full',
            !isPresentationMode ? 'color-bg-secondary' : 'color-bg-default',
          )}
          style={{
            height: isFocusMode
              ? '100vh'
              : !isPreviewMode
                ? isNavbarVisible
                  ? `calc(100vh - 108px - ${footerHeight || '0px'})`
                  : `calc(100vh - 52px - ${footerHeight || '0px'})`
                : `calc(100vh - 52px - ${footerHeight || '0px'})`,
          }}
        >
          <div
            id="editor-canvas"
            onMouseDown={handleFocusModeMouseDown}
            className={cn(
              'h-[100%] flex w-full overflow-auto relative',
              !isPreviewMode &&
                !isFocusMode &&
                (isNavbarVisible ? 'mt-[6.7rem]' : 'mt-[3.3rem]'),
              isPreviewMode && !isFocusMode && 'mt-[3.5rem]',
              !isPresentationMode ? 'color-bg-secondary' : 'color-bg-default',
              editorCanvasClassNames,
            )}
            style={!isFocusMode ? getBackgroundStyle() : undefined}
          >
            <nav
              id="Navbar"
              className={cn(
                'h-14 color-bg-default py-2 px-0 md:px-4 flex gap-2 items-center justify-between w-screen fixed left-0 top-0 border-b color-border-default z-[45] transition-all duration-300',
                {
                  'translate-y-0 opacity-100':
                    !isFocusMode && isNavbarVisible && !isPresentationMode,
                  'translate-y-[-100%] opacity-0 pointer-events-none':
                    isFocusMode || !isNavbarVisible || isPresentationMode,
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
                ydoc={ydoc}
                username={username as string}
                setUsername={setUsername}
                activeCommentId={activeCommentId}
                setActiveCommentId={setActiveCommentId}
                activeTabId={activeTabId}
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
