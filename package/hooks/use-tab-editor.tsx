/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from 'react';
import { DdocProps, DdocEditorProps } from '../types';
import * as Y from 'yjs';
import Collaboration from '@tiptap/extension-collaboration';
import { defaultExtensions } from '../extensions/default-extension';
import { AnyExtension, JSONContent, Editor, useEditor } from '@tiptap/react';
import { getCursor } from '../utils/cursor';
import { EditorView } from '@tiptap/pm/view';
import SlashCommand from '../extensions/slash-command/slash-comand';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import customTextInputRules from '../extensions/customTextInputRules';
import { PageBreak } from '../extensions/page-break/page-break';
import { toUint8Array, fromUint8Array } from 'js-base64';
import { isJSONString } from '../utils/isJsonString';
import { zoomService } from '../zoom-service';
import { sanitizeContent } from '../utils/sanitize-content';
import { CommentExtension as Comment, IComment } from '../extensions/comment';
import { CommentMutationMeta } from '../types';
import {
  CommentAnchor,
  CommentDecorationExtension,
} from '../extensions/comment/comment-decoration-plugin';
import {
  SuggestionTrackingExtension,
  SuggestionReadyData,
} from '../extensions/suggestion/suggestion-tracking-extension';
import {
  createPageCounter,
  handleContentPrint,
  handlePrint,
} from '../utils/handle-print';
import { isBlackOrWhiteShade } from '../utils/color-utils';
import { AiAutocomplete } from '../extensions/ai-autocomplete/ai-autocomplete';
import { AIWriter } from '../extensions/ai-writer';
import { DBlock } from '../extensions/d-block/dblock';
import { ToCItemType } from '../components/toc/types';
import { TWITTER_REGEX } from '../constants/twitter';
import { headingToSlug } from '../utils/heading-to-slug';
import { useResponsive } from '../utils/responsive';
import { yCursorPlugin, yCursorPluginKey } from '@tiptap/y-tiptap';
import { getResponsiveColor } from '../utils/colors';
import { getEditorScrollContainer } from '../utils/get-editor-scroll-container';
import {
  CollabConnectionConfig,
  CollaborationProps,
} from '../sync-local/types';

const usercolors = [
  '#30bced',
  '#6eeb83',
  '#fa69d1',
  '#ecd444',
  '#ee6352',
  '#db3041',
  '#0ad7f2',
  '#1bff39',
];

type ScheduledIdleTask = {
  kind: 'idle' | 'timeout';
  handle: number;
} | null;

const scheduleIdleTask = (callback: () => void): ScheduledIdleTask => {
  if (typeof window.requestIdleCallback === 'function') {
    return {
      kind: 'idle',
      handle: window.requestIdleCallback(() => callback(), {
        timeout: 300,
      }),
    };
  }

  return {
    kind: 'timeout',
    handle: window.setTimeout(callback, 16),
  };
};

const cancelIdleTask = (task: ScheduledIdleTask) => {
  if (!task) {
    return;
  }

  if (task.kind === 'idle' && typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(task.handle);
    return;
  }

  window.clearTimeout(task.handle);
};

interface UseTabEditorArgs {
  ydoc: Y.Doc;
  isVersionMode?: boolean;
  hasTabState?: boolean;
  versionId?: string;
  isPreviewMode?: boolean;
  viewerMode?: DdocProps['viewerMode'];
  initialContent: DdocProps['initialContent'];
  collaboration?: CollaborationProps;
  isReady?: boolean;
  isSyncing?: boolean;
  awareness?: any;
  disableInlineComment?: boolean;
  onCommentInteraction?: DdocProps['onCommentInteraction'];
  onError?: DdocProps['onError'];
  ipfsImageUploadFn?: DdocProps['ipfsImageUploadFn'];
  metadataProxyUrl?: string;
  onCopyHeadingLink?: DdocProps['onCopyHeadingLink'];
  ipfsImageFetchFn?: DdocProps['ipfsImageFetchFn'];
  fetchV1ImageFn?: DdocProps['fetchV1ImageFn'];
  isConnected?: boolean;
  activeModel?: DdocProps['activeModel'];
  maxTokens?: number;
  isAIAgentEnabled?: boolean;
  setCharacterCount?: DdocProps['setCharacterCount'];
  setWordCount?: DdocProps['setWordCount'];
  setPageCount?: DdocProps['setPageCount'];
  setIsContentLoading: Dispatch<SetStateAction<boolean>>;
  setIsCollabContentLoading: Dispatch<SetStateAction<boolean>>;
  unFocused?: boolean;
  zoomLevel?: string;
  isPresentationMode?: boolean;
  onInvalidContentError?: DdocProps['onInvalidContentError'];
  ignoreCorruptedData?: boolean;
  onCollaboratorChange?: DdocProps['onCollaboratorChange'];
  onConnect: (connectConfig: CollabConnectionConfig) => void;
  hasCollabContentInitialised?: boolean;
  initialiseYjsIndexedDbProvider: () => Promise<void>;
  externalExtensions?: Record<string, AnyExtension>;
  isContentLoading?: boolean;
  activeTabId: string;
  theme?: 'dark' | 'light';
  editorRef?: MutableRefObject<Editor | null>;
  onNewComment?: DdocProps['onNewComment'];
}

export const useTabEditor = ({
  ydoc,
  isVersionMode,
  hasTabState,
  versionId,
  isPreviewMode,
  viewerMode,
  initialContent,
  collaboration,
  isReady,
  isSyncing,
  awareness,
  disableInlineComment,
  onCommentInteraction,
  onError,
  ipfsImageUploadFn,
  metadataProxyUrl,
  onCopyHeadingLink,
  ipfsImageFetchFn,
  fetchV1ImageFn,
  isConnected,
  activeModel,
  maxTokens,
  isAIAgentEnabled,
  setCharacterCount,
  setWordCount,
  setPageCount,
  setIsContentLoading,
  setIsCollabContentLoading,
  unFocused,
  zoomLevel,
  isPresentationMode,
  onInvalidContentError,
  ignoreCorruptedData,
  onCollaboratorChange,
  onConnect,
  initialiseYjsIndexedDbProvider,
  externalExtensions,
  isContentLoading,
  activeTabId,
  theme,
  editorRef,
  onNewComment,
}: UseTabEditorArgs) => {
  const collabEnabled = collaboration?.enabled === true;
  const connection = collabEnabled ? collaboration.connection : null;
  const { activeCommentId, setActiveCommentId, focusCommentWithActiveId } =
    useActiveComment();

  const hasAvailableModels = Boolean(activeModel && isAIAgentEnabled);
  const { tocItems, setTocItems, handleTocUpdate } = useTocState(activeTabId);

  const isSuggestionMode = !!(isPreviewMode && viewerMode === 'suggest');

  const { extensions, commentAnchorsRef } = useEditorExtension({
    ydoc,
    onError,
    ipfsImageUploadFn,
    metadataProxyUrl,
    onCopyHeadingLink,
    ipfsImageFetchFn,
    fetchV1ImageFn,
    enableCollaboration: collabEnabled,
    disableInlineComment,
    isConnected,
    activeModel,
    maxTokens,
    isAIAgentEnabled,
    hasAvailableModels,
    onCommentActivated: (commentId) => {
      setActiveCommentId(commentId);
      if (commentId) {
        setTimeout(() => focusCommentWithActiveId(commentId));
      }
    },
    onTocUpdate: handleTocUpdate,
    externalExtensions,
    activeTabId,
    isSuggestionMode,
    onNewComment,
  });

  const { handleCommentInteraction, handleCommentClick } =
    useCommentInteraction({
      onCommentInteraction,
    });
  const isInitialEditorCreation = useRef(true);
  const [slides, setSlides] = useState<string[]>([]);
  const memoizedExtensions = useMemo(() => extensions, [extensions]);

  useEffect(() => {
    if (!activeTabId) return;
    setActiveCommentId(null);
  }, [activeTabId, setActiveCommentId]);

  const editor = useEditor(
    {
      extensions: memoizedExtensions,
      editorProps: {
        clipboardTextSerializer(content) {
          return content.content.textBetween(0, content.content.size, '\n\n');
        },
        ...DdocEditorProps,
        handleDOMEvents: {
          mouseover: handleCommentInteraction,
          keydown: (_view, event) => {
            // prevent default event listeners from firing when slash command is active
            if (['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
              const slashCommand = document.querySelector('#slash-command');
              const emojiList = document.querySelector('#emoji-list');
              if (slashCommand || emojiList) {
                return true;
              }
            }
          },
          blur: () => {
            editor?.commands.unsetCommentActive();
          },
        },
        handleClick: (view, pos, event) => {
          // 1. Check for Modifier Keys (Ctrl or Cmd)
          const isModifierPressed = event.metaKey || event.ctrlKey;
          // 2. Check if the clicked element is a link
          // Use 'target' safely cast to HTMLElement
          const target = event.target as HTMLElement;
          const link = target.closest('a');
          if (link && link.href) {
            if (isPreviewMode) {
              return false;
            }

            const isTwitter = link.textContent.match(TWITTER_REGEX);

            if (isTwitter) {
              if (isModifierPressed) {
                event.preventDefault();
                window.open(link.href, '_blank');
                return true;
              }
            } else {
              event.preventDefault();
              window.open(link.href, '_blank');
              return true;
            }
          }
          // --- COMMENT LOGIC ---
          // If the Twitter logic didn't claim the event, delegate to handleCommentClick.
          // We must return its result so Tiptap knows if the comment click was handled.
          if (handleCommentClick) {
            return handleCommentClick(view, pos, event);
          }

          return false;
        },
        attributes: {
          spellCheck: 'true',
        },
      },
      autofocus:
        unFocused || !isInitialEditorCreation.current ? false : 'start',
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
    },
    [memoizedExtensions, isPresentationMode, isPreviewMode],
  );

  useEffect(() => {
    if (!editorRef) return;
    editorRef.current = editor ?? null;
  }, [editor, editorRef]);
  const isCollaborationEnabled = useMemo(() => {
    return collabEnabled;
  }, [collabEnabled]);

  // TODO: to see why this is necessary
  useEffect(() => {
    if (editor) {
      isInitialEditorCreation.current = false;
    }
  }, [editor]);

  // Fix for TableOfContents not updating in Tiptap v3
  const tocDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (editor && !editor.isDestroyed) {
        if (tocDebounceRef.current) {
          clearTimeout(tocDebounceRef.current);
        }
        tocDebounceRef.current = setTimeout(() => {
          tocDebounceRef.current = null;
          if (!editor.isDestroyed) {
            editor.commands.updateTableOfContents();
          }
        }, 300);
      }
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      if (tocDebounceRef.current) {
        clearTimeout(tocDebounceRef.current);
      }
    };
  }, [editor]);

  // Editor ready state handler
  // Editability is disabled only during active content sync (server merging
  // updates into the ydoc).  All other collab states (connecting, ready,
  // reconnecting, terminating) keep the editor editable so there is no
  // scroll-jump on start or flicker on stop.

  const readyState = useMemo(() => {
    if (isPreviewMode && !isSuggestionMode) return false;
    if (!isCollaborationEnabled) return true;
    if (isSyncing) return false;
    return true;
  }, [isPreviewMode, isSuggestionMode, isCollaborationEnabled, isSyncing]);

  useEffect(() => {
    editor?.setEditable(readyState);
  }, [editor, readyState]);

  useEffect(() => {
    if (!isCollaborationEnabled) return;
    setIsCollabContentLoading(!isReady);
  }, [isCollaborationEnabled, isReady]);

  // ----- Intitalise and handle content from consumer app -----

  const initialContentSetRef = useRef(false);
  const versionHydrationKeyRef = useRef<string | null>(null);

  const mergeAndApplyUpdate = useCallback(
    (contents: string[]) => {
      const parsed = contents.map((content) => toUint8Array(content));
      Y.applyUpdate(ydoc, Y.mergeUpdates(parsed), 'self');
    },
    [ydoc],
  );

  const isContentYjsEncoded = useCallback(
    (content: string[] | JSONContent | string | null) =>
      Array.isArray(content) ||
      (typeof content === 'string' && !isJSONString(content)),
    [],
  );

  useEffect(() => {
    if (!editor || !ydoc) {
      return;
    }

    // In collab mode, content arrives via WebSocket — skip hydration entirely.
    if (collabEnabled) {
      setIsContentLoading(false);
      return;
    }

    if (initialContent === null) {
      setIsContentLoading(true);
      return;
    }

    if (isVersionMode && hasTabState && !activeTabId) {
      setIsContentLoading(true);
      return;
    }

    const targetField = activeTabId || 'default';
    const hydrationKey = `${versionId || 'no-version-id'}:${targetField}`;

    if (!isVersionMode && initialContentSetRef.current) {
      setIsContentLoading(false);
      return;
    }

    if (isVersionMode && versionHydrationKeyRef.current === hydrationKey) {
      setIsContentLoading(false);
      return;
    }

    setIsContentLoading(true);
    queueMicrotask(() => {
      if (initialContent !== '' && initialContent !== undefined) {
        const isYjsEncoded = isContentYjsEncoded(initialContent as string);
        if (isYjsEncoded) {
          if (Array.isArray(initialContent)) {
            mergeAndApplyUpdate(initialContent);
          } else {
            Y.applyUpdate(ydoc, toUint8Array(initialContent as string), 'self');
          }
        } else {
          editor.commands.setContent(
            sanitizeContent({
              data: initialContent as JSONContent,
              ignoreCorruptedData,
              onInvalidContentError,
            }),
          );
        }
      }

      if (zoomLevel) {
        zoomService.setZoom(zoomLevel);
      }
      if (isVersionMode) {
        versionHydrationKeyRef.current = hydrationKey;
        setIsContentLoading(false);
        return;
      }
      initialiseYjsIndexedDbProvider().finally(() => {
        setIsContentLoading(false);
      });
    });
    initialContentSetRef.current = true;
  }, [
    initialContent,
    collabEnabled,
    editor,
    ydoc,
    zoomLevel,
    isVersionMode,
    hasTabState,
    activeTabId,
    versionId,
    setIsContentLoading,
    ignoreCorruptedData,
    onInvalidContentError,
    mergeAndApplyUpdate,
    isContentYjsEncoded,
    initialiseYjsIndexedDbProvider,
  ]);

  const collaborationCleanupRef = useRef<() => void>(() => {});
  const ref = useRef<HTMLDivElement>(null);

  useExtensionSyncWithCollaboration({
    editor,
    isReady,
    awareness,
    collaboration,
    collaborationCleanupRef,
    onCollaboratorChange,
  });

  // ZOOM handler
  useEffect(() => {
    if (!zoomLevel) return;

    zoomService.setZoom(zoomLevel);

    const timeoutId = window.setTimeout(() => {
      zoomService.setZoom(zoomLevel);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [zoomLevel, isContentLoading, initialContent, editor?.isEmpty]);

  // FOR REAL TIME TEXT STYLE CLEANUP WHEN PASTING
  useEffect(() => {
    if (!editor) return;

    const handlePaste = ({ editor: pasteEditor }: { editor: any }) => {
      const from = pasteEditor.state.selection.from;

      setTimeout(() => {
        const to = pasteEditor.state.selection.from;

        // Get all marks in the pasted content
        const marks: { from: number; to: number; mark: any }[] = [];
        pasteEditor.state.doc.nodesBetween(
          from,
          to,
          (node: any, pos: number) => {
            if (node.marks) {
              node.marks.forEach((mark: any) => {
                if (mark.type.name === 'textStyle' && mark.attrs.color) {
                  marks.push({
                    from: pos,
                    to: pos + node.nodeSize,
                    mark,
                  });
                }
              });
            }
          },
        );

        // First, only remove color attribute from text styles
        pasteEditor
          .chain()
          .setTextSelection({ from, to })
          .setColor('') // This removes only the color attribute
          .run();

        // Then, restore colors that aren't black/white shades
        marks.forEach(({ from: markFrom, to: markTo, mark }) => {
          const color = mark.attrs.color;
          if (!isBlackOrWhiteShade(color)) {
            pasteEditor
              .chain()
              .setTextSelection({ from: markFrom, to: markTo })
              .setColor(color)
              .run();
          }
        });

        // Restore cursor position to end of paste
        pasteEditor.commands.setTextSelection(to);
      }, 0);
    };

    editor.on('paste', handlePaste);

    return () => {
      editor.off('paste', handlePaste);
    };
  }, [editor]);

  // Footer stats handler
  const statsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageCountIdleTaskRef = useRef<ScheduledIdleTask>(null);
  const pageCountRequestIdRef = useRef(0);
  const pageCounterRef = useRef<ReturnType<typeof createPageCounter> | null>(
    null,
  );
  const lastPageCountByTabRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!setPageCount) {
      return;
    }

    // Keep the measurement iframe scoped to this mounted hook instance, else
    // separate editor mounts can clobber the same hidden measurement surface.
    const pageCounter = createPageCounter();
    pageCounterRef.current = pageCounter;

    return () => {
      if (pageCounterRef.current === pageCounter) {
        pageCounterRef.current = null;
      }
      pageCounter.destroy();
    };
  }, [setPageCount]);

  useEffect(() => {
    if (!editor) return;
    if (!setCharacterCount && !setWordCount && !setPageCount) return;

    const updateCounts = () => {
      if (statsDebounceRef.current) {
        clearTimeout(statsDebounceRef.current);
      }

      statsDebounceRef.current = setTimeout(() => {
        statsDebounceRef.current = null;

        if (editor && !editor.isDestroyed) {
          setCharacterCount?.(editor.storage.characterCount.characters() ?? 0);
          setWordCount?.(editor.storage.characterCount.words() ?? 0);

          if (setPageCount) {
            const pageCounter = pageCounterRef.current;

            if (!pageCounter) {
              return;
            }

            const html = editor.getHTML();
            const requestId = ++pageCountRequestIdRef.current;
            // Cancel the queued estimate before scheduling a new one, else
            // slower stale HTML can win after a newer edit.
            cancelIdleTask(pageCountIdleTaskRef.current);
            // Push page counting off the typing path, else measurement work
            // competes with input responsiveness.
            pageCountIdleTaskRef.current = scheduleIdleTask(() => {
              pageCountIdleTaskRef.current = null;

              pageCounter
                .getPageCount(html)
                .then((pageCount) => {
                  if (
                    requestId === pageCountRequestIdRef.current &&
                    editor &&
                    !editor.isDestroyed
                  ) {
                    lastPageCountByTabRef.current[activeTabId] = pageCount;
                    setPageCount(pageCount);
                  }
                })
                .catch(() => {
                  if (
                    requestId === pageCountRequestIdRef.current &&
                    editor &&
                    !editor.isDestroyed
                  ) {
                    // Reuse the last good count for this tab, else transient
                    // measurement failures collapse the footer back to 1.
                    setPageCount(
                      lastPageCountByTabRef.current[activeTabId] ?? 1,
                    );
                  }
                });
            });
          }
        }
      }, 500);
    };

    // Initial count
    updateCounts();
    editor.on('update', updateCounts);

    return () => {
      editor.off('update', updateCounts);
      if (statsDebounceRef.current) {
        clearTimeout(statsDebounceRef.current);
      }
      cancelIdleTask(pageCountIdleTaskRef.current);
      pageCountIdleTaskRef.current = null;
      pageCountRequestIdRef.current += 1;
    };
  }, [activeTabId, editor, setCharacterCount, setPageCount, setWordCount]);

  // Print shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault();
        if (editor) {
          isPresentationMode
            ? handlePrint(slides)
            : handleContentPrint(editor.getHTML());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor, isPresentationMode, slides]);

  // Collaboration onConnect handler — watches connection identity fields only
  useEffect(() => {
    if (collabEnabled && connection) {
      onConnect(connection);
    }
    return () => {
      collaborationCleanupRef.current();
    };
  }, [
    collabEnabled,
    connection?.roomKey,
    connection?.roomId,
    connection?.wsUrl,
  ]);

  // Scroll to heading handler for preview mode
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.substring(1)
    : window.location.hash;
  const { isNativeMobile } = useResponsive();

  const hashParams = new URLSearchParams(hash);
  const heading = hashParams.get('heading');
  const headingId = heading?.split('-').pop();
  const scrollToHeading = useCallback(
    (headingId: string) => {
      if (!editor) return;

      try {
        const allHeadings = editor.view.dom.querySelectorAll('[data-toc-id]');
        const element = Array.from(allHeadings).find((el) =>
          (el as HTMLElement).dataset.tocId?.includes(headingId),
        );

        if (!element) return;

        const currentHeadingText = headingToSlug(
          element?.textContent as string,
        );
        const urlHeadingText = heading?.split('-').slice(0, -1).join('-');
        if (currentHeadingText !== urlHeadingText) {
          hashParams.set('heading', `${currentHeadingText}-${headingId}`);
          window.location.hash = hashParams.toString();
        }

        const pos = editor.view.posAtDOM(element as Node, 0);

        // set focus
        const tr = editor.view.state.tr;
        tr.setSelection(new TextSelection(tr.doc.resolve(pos)));
        editor.view.dispatch(tr);

        const scrollContainer = getEditorScrollContainer({
          targetElement: element as HTMLElement,
          editorRoot: editor.view.dom as HTMLElement,
        });
        if (scrollContainer) {
          // Use requestAnimationFrame to ensure DOM updates are complete
          requestAnimationFrame(() => {
            const containerRect = scrollContainer.getBoundingClientRect();
            const elementRect = (
              element as HTMLElement
            ).getBoundingClientRect();

            // Calculate the scroll position to start the element at the top of the container
            const scrollTop =
              elementRect.top -
              containerRect.top -
              containerRect.height / (isNativeMobile ? 5 : 7) +
              elementRect.height / (isNativeMobile ? 5 : 7);

            scrollContainer.scrollBy({
              top: scrollTop,
              behavior: 'smooth',
            });
          });
        }
      } catch (error) {
        // View not ready, skip
        return;
      }
    },
    [editor, isNativeMobile],
  );

  useEffect(() => {
    if (!isPreviewMode || !headingId || isContentLoading) return;
    setTimeout(() => {
      scrollToHeading(headingId);
    }, 100);
  }, [
    editor,
    isPreviewMode,
    isNativeMobile,
    headingId,
    isContentLoading,
    scrollToHeading,
  ]);

  // FOR AUTO TEXT STYLE CLEANUP WHEN DOCUMENT IS RENDERED
  useEffect(() => {
    // Exit if editor not ready, content loading.
    if (!editor || isContentLoading || !initialContent) {
      return;
    }
    const timeoutId = setTimeout(() => {
      const { tr, doc } = editor.state;
      let hasChanges = false;

      doc.descendants((node, pos) => {
        if (!node.marks || node.marks.length === 0) return;

        const textStyleMark = node.marks.find(
          (m) => m.type.name === 'textStyle' && m.attrs.color,
        );

        if (!textStyleMark) return;

        const originalColor = (textStyleMark.attrs['data-original-color'] ||
          textStyleMark.attrs.color) as string;

        if (
          originalColor.startsWith('var(--color-editor-') ||
          originalColor === 'inherit'
        )
          return;

        const responsiveColor = getResponsiveColor(originalColor, theme);

        if (responsiveColor !== textStyleMark.attrs.color) {
          hasChanges = true;
          const newMark = textStyleMark.type.create({
            ...textStyleMark.attrs,
            color: responsiveColor,
            'data-original-color': originalColor,
          });

          tr.removeMark(pos, pos + node.nodeSize, textStyleMark);
          tr.addMark(pos, pos + node.nodeSize, newMark);
        }
      });

      if (hasChanges) {
        tr.setMeta('addToHistory', false);
        editor.view.dispatch(tr);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [editor, initialContent, isContentLoading, theme]);

  // Destroy editor on unmount
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  useDarkModeStyleCleanup(editor, initialContent, false);

  return {
    editor,
    ref,
    slides,
    setSlides,
    tocItems,
    setTocItems,
    activeCommentId,
    setActiveCommentId,
    focusCommentWithActiveId,
    isContentLoading,
    commentAnchorsRef,
  };
};

const useActiveComment = () => {
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const commentsSectionRef = useRef<HTMLDivElement | null>(null);

  const focusCommentWithActiveId = useCallback((id: string) => {
    if (!commentsSectionRef.current) return;

    const commentInput =
      commentsSectionRef.current.querySelector<HTMLInputElement>(`input#${id}`);

    if (!commentInput) return;

    commentInput.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });
  }, []);

  useEffect(() => {
    if (!activeCommentId) return;
    focusCommentWithActiveId(activeCommentId);
  }, [activeCommentId, focusCommentWithActiveId]);

  return {
    activeCommentId,
    setActiveCommentId,
    focusCommentWithActiveId,
  };
};

const useTocState = (activeTabId: string) => {
  const [tocItems, setTocItems] = useState<ToCItemType[]>([]);
  const tocUpdateTimeoutRef = useRef<number | null>(null);
  const tabToTocCacheRef = useRef<Record<string, ToCItemType[]>>({});
  const activeTabRef = useRef(activeTabId);

  // immediately render TOC from cache if available on switching tabs
  useEffect(() => {
    activeTabRef.current = activeTabId;
    const cached = tabToTocCacheRef.current[activeTabId];
    if (cached) {
      setTocItems(cached);
    }
  }, [activeTabId]);

  const handleTocUpdate = useCallback(
    (data: ToCItemType[], isCreate: boolean | undefined) => {
      const targetTabId = activeTabId;

      const cacheUpdate = () => {
        tabToTocCacheRef.current = {
          ...tabToTocCacheRef.current,
          [targetTabId]: data,
        };
        if (activeTabRef.current === targetTabId) {
          setTocItems(data);
        }
      };

      if (isCreate) {
        cacheUpdate();
        return;
      }

      if (tocUpdateTimeoutRef.current) {
        clearTimeout(tocUpdateTimeoutRef.current);
      }

      requestAnimationFrame(() => {
        tocUpdateTimeoutRef.current = window.setTimeout(() => {
          cacheUpdate();
          tocUpdateTimeoutRef.current = null;
        }, 100);
      });
    },
    [activeTabId],
  );

  return {
    tocItems,
    setTocItems,
    handleTocUpdate,
  };
};

interface UseExtensionStackArgs {
  ydoc: Y.Doc;
  onError?: (error: string) => void;
  ipfsImageUploadFn?: DdocProps['ipfsImageUploadFn'];
  metadataProxyUrl?: string;
  onCopyHeadingLink?: DdocProps['onCopyHeadingLink'];
  ipfsImageFetchFn?: DdocProps['ipfsImageFetchFn'];
  fetchV1ImageFn?: DdocProps['fetchV1ImageFn'];
  enableCollaboration?: boolean;
  isConnected: DdocProps['isConnected'];
  disableInlineComment?: boolean;
  activeModel?: DdocProps['activeModel'];
  maxTokens?: number;
  isAIAgentEnabled?: boolean;
  hasAvailableModels: boolean;
  onCommentActivated: (commentId: string | null) => void;
  onTocUpdate: (data: ToCItemType[], isCreate: boolean | undefined) => void;
  externalExtensions?: Record<string, AnyExtension>;
  activeTabId: string;
  isSuggestionMode?: boolean;
  onNewComment?: DdocProps['onNewComment'];
}

const useEditorExtension = ({
  ydoc,
  onError,
  ipfsImageUploadFn,
  metadataProxyUrl,
  onCopyHeadingLink,
  ipfsImageFetchFn,
  fetchV1ImageFn,
  enableCollaboration,
  disableInlineComment,
  isConnected,
  activeModel,
  maxTokens,
  isAIAgentEnabled,
  hasAvailableModels,
  onCommentActivated,
  onTocUpdate,
  externalExtensions,
  activeTabId,
  isSuggestionMode = false,
  onNewComment,
}: UseExtensionStackArgs) => {
  const slashCommandConfigRef = useRef({
    isConnected,
    enableCollaboration,
    disableInlineComment,
  });

  useEffect(() => {
    slashCommandConfigRef.current = {
      isConnected,
      enableCollaboration,
      disableInlineComment,
    };
  }, [isConnected, enableCollaboration, disableInlineComment]);
  const createSlashCommand = useCallback(
    () =>
      SlashCommand(
        (error: string) => onError?.(error),
        ipfsImageUploadFn,
        slashCommandConfigRef,
      ),
    [isConnected, enableCollaboration, disableInlineComment],
  );

  const commentAnchorsRef = useRef<CommentAnchor[]>([]);

  // Keep a stable ref to isSuggestionMode so the extension closure always
  // reads the latest value without needing to rebuild extensions.
  const isSuggestionModeRef = useRef(isSuggestionMode);
  isSuggestionModeRef.current = isSuggestionMode;

  // Keep a stable ref to onNewComment so the callback always reads the latest
  // version without needing extension rebuilds.
  const onNewCommentRef = useRef(onNewComment);
  onNewCommentRef.current = onNewComment;

  // Called on every keystroke — upserts the live anchor so the decoration
  // rebuilds immediately while the user is still typing.
  const onLiveSuggestionRef = useRef<((anchor: CommentAnchor) => void) | null>(null);
  onLiveSuggestionRef.current = (anchor: CommentAnchor) => {
    commentAnchorsRef.current = [
      ...commentAnchorsRef.current.filter((a) => a.id !== anchor.id),
      anchor,
    ];
  };

  // Called once when typing stops (cursor moves away / blur) — only for
  // persistence. The anchor is already in commentAnchorsRef at this point.
  const onSuggestionReadyRef = useRef<((data: SuggestionReadyData) => void) | null>(null);
  onSuggestionReadyRef.current = (data: SuggestionReadyData) => {
    if (!onNewCommentRef.current) return;

    const newComment: IComment = {
      id: data.suggestionId,
      tabId: activeTabId,
      selectedContent: data.originalContent,
      content: '',
      isSuggestion: true,
      suggestionType: data.suggestionType,
      originalContent: data.originalContent,
      suggestedContent: data.suggestedContent,
      resolved: false,
      deleted: false,
      createdAt: new Date(),
    };

    const meta: CommentMutationMeta = {
      type: 'create',
      anchorFrom: fromUint8Array(Y.encodeRelativePosition(data.anchorFrom)),
      anchorTo: fromUint8Array(Y.encodeRelativePosition(data.anchorTo)),
      suggestionType: data.suggestionType,
      originalContent: data.originalContent,
      suggestedContent: data.suggestedContent,
    };

    onNewCommentRef.current(newComment, meta);
  };

  const commentExtension = useMemo(
    () =>
      Comment.configure({
        HTMLAttributes: {
          class: 'inline-comment',
        },
        onCommentActivated,
      }),
    [onCommentActivated],
  );

  const buildExtensions = useCallback(() => {
    const coreExtensions = [
      ...defaultExtensions({
        onError: (error: string) => onError?.(error),
        ipfsImageUploadFn,
        metadataProxyUrl,
        onCopyHeadingLink,
        ipfsImageFetchFn,
        fetchV1ImageFn,
        onTocUpdate,
      }),
      createSlashCommand(),
      customTextInputRules,
      PageBreak,
      commentExtension,
      Collaboration.configure({
        document: ydoc,
        field: activeTabId,
      }),
      CommentDecorationExtension.configure({
        getAnchors: () => commentAnchorsRef.current,
      }),
      SuggestionTrackingExtension.configure({
        getIsSuggestionMode: () => isSuggestionModeRef.current,
        onLiveSuggestion: (anchor) => onLiveSuggestionRef.current?.(anchor),
        onSuggestionReady: (data) => onSuggestionReadyRef.current?.(data),
      }),
      ...(externalExtensions ? Object.values(externalExtensions) : []),
    ];

    return coreExtensions as unknown as AnyExtension[];
  }, [
    onError,
    ipfsImageUploadFn,
    metadataProxyUrl,
    onCopyHeadingLink,
    ipfsImageFetchFn,
    fetchV1ImageFn,
    onTocUpdate,
    createSlashCommand,
    commentExtension,
    ydoc,
    externalExtensions,
    activeTabId,
  ]);

  const [extensions, setExtensions] =
    useState<AnyExtension[]>(buildExtensions());

  useEffect(() => {
    if (activeTabId) {
      setExtensions(buildExtensions());
    }
  }, [activeTabId]);

  useEffect(() => {
    if (!isConnected) return;
    setExtensions((prev) => [
      ...prev.filter((ext) => ext.name !== 'slash-command'),
      createSlashCommand(),
    ]);
  }, [createSlashCommand]);

  useEffect(() => {
    if (!activeModel) return;

    setExtensions((prev) => [
      ...prev.filter(
        (ext) =>
          ext.name !== 'aiAutocomplete' &&
          ext.name !== 'aiWriter' &&
          ext.name !== 'dBlock' &&
          ext.name !== 'slash-command',
      ),
      AiAutocomplete.configure({
        model: activeModel,
        endpoint: activeModel.endpoint,
        maxTokens: maxTokens,
        temperature: 0.1,
        tone: 'neutral',
      }),
      AIWriter,
      DBlock.configure({
        hasAvailableModels,
      }),
      createSlashCommand(),
    ]);
  }, [activeModel, maxTokens, isAIAgentEnabled, createSlashCommand]);

  return { extensions, setExtensions, commentAnchorsRef };
};

interface UseCommentInteractionArgs {
  onCommentInteraction?: DdocProps['onCommentInteraction'];
}

const useCommentInteraction = ({
  onCommentInteraction,
}: UseCommentInteractionArgs) => {
  const isHighlightedYellow = useCallback(
    (state: EditorState, from: number, to: number) => {
      let highlighted = false;
      state.doc.nodesBetween(from, to, (node) => {
        if (
          node.marks &&
          node.marks.some(
            (mark) =>
              mark.type.name === 'highlight' && mark.attrs.color === 'yellow',
          )
        ) {
          highlighted = true;
        }
      });
      return highlighted;
    },
    [],
  );

  const handleCommentInteraction = useCallback(
    (view: EditorView, event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (
        !target ||
        target.nodeName !== 'MARK' ||
        target.dataset.color !== 'yellow'
      ) {
        return;
      }

      const highlightedText = target.textContent;
      const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });

      if (!pos) return;

      const { state } = view;
      let from = pos.pos;
      let to = pos.pos;

      state.doc.nodesBetween(from, to, (node, nodePos) => {
        if (node.marks && node.marks.length) {
          node.marks.forEach((mark) => {
            if (mark.type.name === 'highlight') {
              from = nodePos;
              to = nodePos + node.nodeSize;
            }
          });
        }
      });

      if (from === to) return;

      const data = {
        text: highlightedText,
        from,
        to,
        isHighlightedYellow: isHighlightedYellow(state, from, to),
      };
      onCommentInteraction?.(data);
    },
    [isHighlightedYellow, onCommentInteraction],
  );

  const handleCommentClick = useCallback(
    (view: EditorView, _pos: number, event: MouseEvent) => {
      return handleCommentInteraction(view, event);
    },
    [handleCommentInteraction],
  );

  return { handleCommentInteraction, handleCommentClick };
};

interface UseExtensionSyncWithCollaborationArgs {
  editor?: Editor | null;
  isReady?: boolean;
  awareness?: any;
  collaboration?: CollaborationProps;
  collaborationCleanupRef: MutableRefObject<() => void>;
  onCollaboratorChange: DdocProps['onCollaboratorChange'];
}

const useExtensionSyncWithCollaboration = ({
  editor,
  isReady,
  awareness,
  collaboration,
  collaborationCleanupRef,
  onCollaboratorChange,
}: UseExtensionSyncWithCollaborationArgs) => {
  const collabEnabled = collaboration?.enabled === true;
  const session = collabEnabled ? collaboration.session : null;

  const onCollaboratorChangeRef = useRef(onCollaboratorChange);
  onCollaboratorChangeRef.current = onCollaboratorChange;
  const userColorRef = useRef(
    usercolors[Math.floor(Math.random() * usercolors.length)],
  );
  // Register collaboration cursor plugin directly via editor.registerPlugin
  // instead of setExtensions, which would destroy and recreate the editor (causing scroll jump)
  useEffect(() => {
    if (!editor || !awareness || !isReady) return;

    const user = {
      name: session?.username || '',
      color: userColorRef.current,
      isEns: session?.isEns,
    };

    awareness.setLocalStateField('user', user);

    const plugin = yCursorPlugin(awareness, {
      cursorBuilder: getCursor,
    });
    editor.registerPlugin(plugin);

    // Track collaborators via awareness updates
    const updateCollaborators = () => {
      const users = Array.from(
        awareness.states as Map<number, Record<string, any>>,
      ).map(([clientId, state]) => ({
        clientId,
        ...(state.user || {}),
      }));
      onCollaboratorChangeRef.current?.(users);
    };
    awareness.on('update', updateCollaborators);
    updateCollaborators();

    collaborationCleanupRef.current = () => {
      awareness.off('update', updateCollaborators);
      if (!editor.isDestroyed) {
        editor.unregisterPlugin(yCursorPluginKey);
      }
    };

    return () => {
      collaborationCleanupRef.current();
      collaborationCleanupRef.current = () => {};
    };
  }, [editor, awareness, isReady]);

  // Awareness update — separate effect watches session metadata (e.g. ENS resolution)
  useEffect(() => {
    if (!isReady || !collabEnabled || !awareness || !session) return;
    if (session.isEns) {
      awareness.setLocalStateField('user', {
        name: session.username,
        color: userColorRef.current,
        isEns: session.isEns,
      });
    }
  }, [isReady, collabEnabled, session?.username, session?.isEns, awareness]);
};

const useDarkModeStyleCleanup = (
  editor?: Editor | null,
  initialContent?: string | JSONContent | string[] | null,
  isContentLoading?: boolean,
) => {
  const isDarkMode = useRef(localStorage.getItem('theme') !== null);
  const cleanupDone = useRef(false);

  useEffect(() => {
    if (
      !editor ||
      isContentLoading ||
      !isDarkMode.current ||
      cleanupDone.current
    ) {
      return;
    }

    if (!initialContent) {
      cleanupDone.current = true;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!editor) return;

      const { from, to } = editor.state.selection;
      const marks: { from: number; to: number; mark: any }[] = [];

      editor.state.doc.descendants((node, pos) => {
        if (node.marks) {
          node.marks.forEach((mark) => {
            if (mark.type.name === 'textStyle' && mark.attrs.color) {
              marks.push({
                from: pos,
                to: pos + node.nodeSize,
                mark,
              });
            }
          });
        }
      });

      if (marks.length > 0) {
        editor.chain().selectAll().setColor('').run();

        marks.forEach(({ from: markFrom, to: markTo, mark }) => {
          const color = mark.attrs.color;
          if (!isBlackOrWhiteShade(color)) {
            editor
              .chain()
              .setTextSelection({ from: markFrom, to: markTo })
              .setColor(color)
              .run();
          }
        });

        editor.commands.setTextSelection({ from, to });
      }

      cleanupDone.current = true;
    }, 100);

    return () => window.clearTimeout(timeoutId);
  }, [editor, initialContent, isContentLoading]);
};
