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
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import { defaultExtensions } from '../extensions/default-extension';
import { AnyExtension, JSONContent, Editor, useEditor } from '@tiptap/react';
import { getCursor } from '../utils/cursor';
import { EditorView } from '@tiptap/pm/view';
import SlashCommand from '../extensions/slash-command/slash-comand';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import customTextInputRules from '../extensions/customTextInputRules';
import { PageBreak } from '../extensions/page-break/page-break';
import { toUint8Array } from 'js-base64';
import { isJSONString } from '../utils/isJsonString';
import { zoomService } from '../zoom-service';
import { sanitizeContent } from '../utils/sanitize-content';
import { CommentExtension as Comment } from '../extensions/comment';
import { handleContentPrint, handlePrint } from '../utils/handle-print';
import { isBlackOrWhiteShade } from '../utils/color-utils';
import { AiAutocomplete } from '../extensions/ai-autocomplete/ai-autocomplete';
import { AIWriter } from '../extensions/ai-writer';
import { DBlock } from '../extensions/d-block/dblock';
import { ToCItemType } from '../components/toc/types';
import { TWITTER_REGEX } from '../constants/twitter';
import { IConnectConf } from '../sync-local/useSyncMachine';
import { headingToSlug } from '../utils/heading-to-slug';
import { useResponsive } from '../utils/responsive';

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

interface UseTabEditorArgs {
  ydoc: Y.Doc;
  isVersionMode?: boolean;
  hasTabState?: boolean;
  versionId?: string;
  isPreviewMode?: boolean;
  initialContent: DdocProps['initialContent'];
  enableCollaboration?: boolean;
  collabConfig?: DdocProps['collabConfig'];
  isReady?: boolean;
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
  setIsContentLoading: Dispatch<SetStateAction<boolean>>;
  setIsCollabContentLoading: Dispatch<SetStateAction<boolean>>;
  unFocused?: boolean;
  zoomLevel?: string;
  isPresentationMode?: boolean;
  onInvalidContentError?: DdocProps['onInvalidContentError'];
  ignoreCorruptedData?: boolean;
  onCollaboratorChange?: DdocProps['onCollaboratorChange'];
  onConnect: (connectConfig: IConnectConf) => void;
  hasCollabContentInitialised?: boolean;
  initialiseYjsIndexedDbProvider: () => Promise<void>;
  externalExtensions?: Record<string, AnyExtension>;
  isContentLoading?: boolean;
  activeTabId: string;
}

export const useTabEditor = ({
  ydoc,
  isVersionMode,
  hasTabState,
  versionId,
  isPreviewMode,
  initialContent,
  enableCollaboration,
  collabConfig,
  isReady,
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
  setIsContentLoading,
  setIsCollabContentLoading,
  unFocused,
  zoomLevel,
  isPresentationMode,
  onInvalidContentError,
  ignoreCorruptedData,
  onCollaboratorChange,
  onConnect,
  hasCollabContentInitialised,
  initialiseYjsIndexedDbProvider,
  externalExtensions,
  isContentLoading,
  activeTabId,
}: UseTabEditorArgs) => {
  const { activeCommentId, setActiveCommentId, focusCommentWithActiveId } =
    useActiveComment();

  const hasAvailableModels = Boolean(activeModel && isAIAgentEnabled);
  const { tocItems, setTocItems, handleTocUpdate } = useTocState(activeTabId);

  const { extensions, setExtensions } = useEditorExtension({
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
    onCommentActivated: (commentId) => {
      setActiveCommentId(commentId);
      if (commentId) {
        setTimeout(() => focusCommentWithActiveId(commentId));
      }
    },
    onTocUpdate: handleTocUpdate,
    externalExtensions,
    activeTabId,
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

  const preventDeletionIfItIsReminderNode = (
    view: EditorView,
    event: KeyboardEvent,
  ) => {
    const { state } = view;
    const { selection } = state;
    const { from, to, empty } = selection;

    if (event.key === 'Backspace' || event.key === 'Delete') {
      let deletingReminder = false;

      if (!empty) {
        state.doc.nodesBetween(from, to, (node) => {
          if (node.type.name === 'reminderBlock') deletingReminder = true;
        });
      } else {
        const $from = selection.$from;
        const adjacent =
          event.key === 'Backspace' ? $from.nodeBefore : $from.nodeAfter;
        if (adjacent?.type.name === 'reminderBlock') {
          deletingReminder = true;
        }
      }

      if (deletingReminder) {
        event.preventDefault();
        return true;
      }
    }
  };

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
            preventDeletionIfItIsReminderNode(_view, event);
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
          // --- TWITTER LOGIC ---
          // Only intercept if Modifier + Link + Matches Regex
          if (
            isModifierPressed &&
            link &&
            link.href &&
            link.textContent.match(TWITTER_REGEX)
          ) {
            window.open(link.href, '_blank');
            return true; // Stop Tiptap/ProseMirror from handling this event further
          } else if (
            link &&
            link.href &&
            !link.textContent.match(TWITTER_REGEX)
          ) {
            window.open(link.href, '_blank');
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
      autofocus: unFocused ? false : 'start',
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
    },
    [memoizedExtensions, isPresentationMode],
  );

  // TODO: to see why this is necessary
  useEffect(() => {
    if (editor) {
      isInitialEditorCreation.current = false;
    }
  }, [editor]);

  // Editor ready state handler
  const readyState = useMemo(() => {
    if (enableCollaboration) {
      return Boolean(hasCollabContentInitialised && isReady);
    }
    return isPreviewMode ? false : true;
  }, [
    enableCollaboration,
    hasCollabContentInitialised,
    isPreviewMode,
    isReady,
  ]);

  useEffect(() => {
    editor?.setEditable(readyState);
  }, [editor, readyState]);

  useEffect(() => {
    if (!enableCollaboration) return;
    setIsCollabContentLoading(!isReady);
  }, [enableCollaboration, isReady, setIsCollabContentLoading]);

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
    if (initialContent === null || !editor || !ydoc) {
      if (initialContent !== null) {
        setIsContentLoading(false);
      }
      return;
    }

    if (isVersionMode && hasTabState && !activeTabId) {
      setIsContentLoading(true);
      return;
    }

    const targetField = activeTabId || 'default';
    const hydrationKey = `${versionId || 'no-version-id'}:${targetField}`;

    if (!isVersionMode && initialContentSetRef.current) {
      if (initialContent !== null) {
        setIsContentLoading(false);
      }
      return;
    }

    if (isVersionMode && versionHydrationKeyRef.current === hydrationKey) {
      setIsContentLoading(false);
      return;
    }

    setIsContentLoading(true);
    queueMicrotask(() => {
      if (initialContent !== '') {
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
    editor,
    ydoc,
    zoomLevel,
    isVersionMode,
    hasTabState,
    activeTabId,
    versionId,
    setIsContentLoading,
    initialiseYjsIndexedDbProvider,
    ignoreCorruptedData,
    onInvalidContentError,
    mergeAndApplyUpdate,
    isContentYjsEncoded,
  ]);

  // TOC update handler
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (editor && !editor.isDestroyed) {
        editor.commands.updateTableOfContents();
      }
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  const collaborationCleanupRef = useRef<() => void>(() => {});
  const ref = useRef<HTMLDivElement>(null);

  useExtensionSyncWithCollaboration({
    editor,
    isReady,
    awareness,
    ydoc,
    collabConfig,
    enableCollaboration,
    setExtensions,
    collaborationCleanupRef,
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

  // Word / Character count handler
  useEffect(() => {
    if (!editor) return;

    setCharacterCount?.(editor.storage.characterCount.characters() ?? 0);
    setWordCount?.(editor.storage.characterCount.words() ?? 0);
  }, [
    editor?.storage.characterCount.characters(),
    editor?.storage.characterCount.words(),
  ]);

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

  // Collaboration onConnect handler
  useEffect(() => {
    if (
      enableCollaboration &&
      collabConfig?.collaborationId &&
      collabConfig?.roomKey
    ) {
      onConnect({
        username: collabConfig?.username,
        roomKey: collabConfig?.roomKey,
        roomId: collabConfig?.collaborationId,
        isOwner: collabConfig?.isOwner,
        ownerEdSecret: collabConfig?.ownerEdSecret,
        contractAddress: collabConfig?.contractAddress,
        ownerAddress: collabConfig?.ownerAddress,
        isEns: collabConfig?.isEns,
        wsUrl: collabConfig.wsUrl,
        roomInfo: collabConfig.roomInfo,
      });
    }
    return () => {
      collaborationCleanupRef.current();
    };
  }, [enableCollaboration, Boolean(collabConfig)]);

  // Editor collatorators onChange handler
  useEffect(() => {
    const collaborators = editor?.storage?.collaborationCaret?.users?.map(
      (user) => ({
        clientId: user.clientId,
        name: user.name,
        isEns: user.isEns,
        color: user.color,
      }),
    );
    onCollaboratorChange?.(collaborators);
  }, [editor?.storage?.collaborationCaret?.users]);

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

        // Find all possible scroll containers
        const possibleContainers = [
          document.querySelector('.ProseMirror'),
          document.getElementById('editor-canvas'),
          element.closest('.ProseMirror'),
          element.closest('[class*="editor"]'),
          editor.view.dom.parentElement,
        ].filter(Boolean);

        // Find the first scrollable container
        const scrollContainer = possibleContainers.find(
          (container) =>
            container &&
            (container.scrollHeight > container.clientHeight ||
              window.getComputedStyle(container).overflow === 'auto' ||
              window.getComputedStyle(container).overflowY === 'auto'),
        );
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
}: UseExtensionStackArgs) => {
  const createSlashCommand = useCallback(
    () =>
      SlashCommand(
        (error: string) => onError?.(error),
        ipfsImageUploadFn,
        isConnected,
        enableCollaboration,
        disableInlineComment,
      ),
    [isConnected, enableCollaboration, disableInlineComment],
  );

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
    const coreExtensions: AnyExtension[] = [
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
      ...(externalExtensions ? Object.values(externalExtensions) : []),
    ];

    return coreExtensions;
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

  return { extensions, setExtensions };
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
  ydoc: Y.Doc;
  collabConfig?: DdocProps['collabConfig'];
  enableCollaboration?: boolean;
  setExtensions: Dispatch<SetStateAction<AnyExtension[]>>;
  collaborationCleanupRef: MutableRefObject<() => void>;
}

const useExtensionSyncWithCollaboration = ({
  editor,
  isReady,
  awareness,
  ydoc,
  collabConfig,
  enableCollaboration,
  setExtensions,
  collaborationCleanupRef,
}: UseExtensionSyncWithCollaborationArgs) => {
  const awarenessProvider = useMemo(() => {
    if (!isReady || !awareness || !ydoc) return null;
    return { ydoc, awareness };
  }, [isReady, awareness, ydoc]);

  useEffect(() => {
    if (!isReady || !enableCollaboration || !collabConfig) return;
    if (
      collabConfig.isEns &&
      typeof editor?.commands?.updateUser === 'function'
    ) {
      editor.commands.updateUser({
        name: collabConfig.username,
        color: usercolors[Math.floor(Math.random() * usercolors.length)],
        isEns: collabConfig.isEns,
      });
    }
  }, [isReady, enableCollaboration, collabConfig?.isEns]);

  const collaborationExtension = useMemo(() => {
    if (!isReady || !awarenessProvider) return null;
    return CollaborationCaret.configure({
      provider: awarenessProvider,
      user: {
        name: collabConfig?.username || '',
        color: usercolors[Math.floor(Math.random() * usercolors.length)],
        isEns: collabConfig?.isEns,
      },
      render: getCursor,
    });
  }, [isReady, awarenessProvider]);

  useEffect(() => {
    if (!collaborationExtension) return;

    setExtensions((prev) => {
      if (prev.some((ext) => ext.name === 'collaborationCaret')) return prev;
      return [
        ...prev.filter((ext) => ext.name !== 'history'),
        collaborationExtension,
      ];
    });

    collaborationCleanupRef.current = () => {
      setExtensions((prev) =>
        prev.filter((ext) => ext.name !== 'collaborationCaret'),
      );
    };

    return () => {
      collaborationCleanupRef.current();
    };
  }, [collaborationExtension]);
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
