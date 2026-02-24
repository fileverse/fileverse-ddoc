/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
// import { WebrtcProvider } from 'y-webrtc';
import { DdocProps, DdocEditorProps } from './types';
import * as Y from 'yjs';
import Collaboration from '@tiptap/extension-collaboration';
import { yCursorPlugin, yCursorPluginKey } from '@tiptap/y-tiptap';
import { defaultExtensions } from './extensions/default-extension';
import { AnyExtension, JSONContent, useEditor } from '@tiptap/react';
import { getCursor } from './utils/cursor';
// import { getAddressName } from './utils/getAddressName';
import { EditorView } from '@tiptap/pm/view';
import SlashCommand from './extensions/slash-command/slash-comand';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import customTextInputRules from './extensions/customTextInputRules';
import { PageBreak } from './extensions/page-break/page-break';
import { fromUint8Array, toUint8Array } from 'js-base64';
import { IndexeddbPersistence } from 'y-indexeddb';
import { isJSONString } from './utils/isJsonString';
import { zoomService } from './zoom-service';
import { sanitizeContent } from './utils/sanitize-content';
import { CommentExtension as Comment } from './extensions/comment';
import { handleContentPrint, handlePrint } from './utils/handle-print';
// import { Table } from './extensions/supercharged-table/extension-table';
import { isBlackOrWhiteShade } from './utils/color-utils';
import { useResponsive } from './utils/responsive';
import { headingToSlug } from './utils/heading-to-slug';
import { AiAutocomplete } from './extensions/ai-autocomplete/ai-autocomplete';
import { AIWriter } from './extensions/ai-writer';
import { DBlock } from './extensions/d-block/dblock';
import { useSyncMachine } from './sync-local/useSyncMachine';
// import { type TableOfContentDataItem } from '@tiptap/extension-table-of-contents';
import { ToCItemType } from './components/toc/types';
import { TWITTER_REGEX } from './constants/twitter';
import { useRtcWebsocketDisconnector } from './hooks/use-rtc-websocket-disconnector';
import { getResponsiveColor } from './utils/colors';
// import { SyncCursor } from './extensions/sync-cursor';

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

export const useDdocEditor = ({
  isPreviewMode,
  initialContent,
  enableCollaboration,
  // collaborationId,
  // walletAddress,
  // username,
  onChange,
  onCollaboratorChange,
  onCommentInteraction,
  // ensResolutionUrl,
  onError,
  setCharacterCount,
  setWordCount,
  ipfsImageUploadFn,
  ddocId,
  enableIndexeddbSync,
  unFocused,
  theme,
  zoomLevel,
  onInvalidContentError,
  ignoreCorruptedData,
  isPresentationMode,
  // proExtensions,
  metadataProxyUrl,
  extensions: externalExtensions,
  onCopyHeadingLink,
  ipfsImageFetchFn,
  fetchV1ImageFn,
  isConnected,
  activeModel,
  maxTokens,
  isAIAgentEnabled,
  collabConfig,
  onIndexedDbError,
  disableInlineComment,
  ...rest
}: Partial<DdocProps>) => {
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [isCollabContentLoading, setIsCollabContentLoading] = useState(true);
  const [ydoc] = useState(new Y.Doc());
  const {
    connect: onConnect,
    isReady,
    terminateSession,
    awareness,
    hasCollabContentInitialised,
    state: syncState,
  } = useSyncMachine({
    onError: rest.onCollabError,
    ydoc,
    onCollaborationConnectCallback: rest.onCollaborationConnectCallback,
    onCollaborationCommit: rest.onCollaborationCommit,
    onFetchCommitContent: rest.onFetchCommitContent,
    onSessionTerminated: rest.onCollabSessionTermination,
    onUnMergedUpdates: rest.onUnMergedUpdates,
    onLocalUpdate: onChange,
  });

  useRtcWebsocketDisconnector(syncState, enableCollaboration);

  const isCollaborationEnabled = useMemo(() => {
    return enableCollaboration;
  }, [enableCollaboration]);

  // V2 - comment
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  const commentsSectionRef = useRef<HTMLDivElement | null>(null);

  const focusCommentWithActiveId = (id: string) => {
    if (!commentsSectionRef.current) return;

    const commentInput =
      commentsSectionRef.current.querySelector<HTMLInputElement>(`input#${id}`);

    if (!commentInput) return;

    commentInput.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });
  };

  useEffect(() => {
    if (!activeCommentId) return;

    focusCommentWithActiveId(activeCommentId);
  }, [activeCommentId]);
  // V2 - comment
  const [tocItems, setTocItems] = useState<ToCItemType[]>([]);
  const hasAvailableModels = activeModel !== undefined && isAIAgentEnabled;
  const slashCommandConfigRef = useRef({
    isConnected,
    enableCollaboration,
    disableInlineComment,
  });
  const userColorRef = useRef(
    usercolors[Math.floor(Math.random() * usercolors.length)],
  );
  const onCollaboratorChangeRef = useRef(onCollaboratorChange);
  onCollaboratorChangeRef.current = onCollaboratorChange;
  const [extensions, setExtensions] = useState<AnyExtension[]>([
    ...(defaultExtensions({
      onError: (error: string) => {
        console.log(error);
        onError?.(error);
      },
      ipfsImageUploadFn,
      metadataProxyUrl,
      onCopyHeadingLink,
      ipfsImageFetchFn,
      fetchV1ImageFn,
      onTocUpdate(data, isCreate) {
        // Only update state when necessary
        if (isCreate) {
          // Initial TOC creation
          setTocItems(data);
        } else {
          // Debounce subsequent updates using ref
          if (tocUpdateTimeoutRef.current) {
            clearTimeout(tocUpdateTimeoutRef.current);
          }

          // Use requestAnimationFrame for smoother updates
          requestAnimationFrame(() => {
            tocUpdateTimeoutRef.current = window.setTimeout(() => {
              setTocItems(data);
              tocUpdateTimeoutRef.current = null;
            }, 100); // Reduced debounce time
          });
        }
      },
    }) as AnyExtension[]),
    SlashCommand(
      (error: string) => onError?.(error),
      ipfsImageUploadFn,
      slashCommandConfigRef,
    ),
    customTextInputRules,
    PageBreak,
    Comment.configure({
      HTMLAttributes: {
        class: 'inline-comment',
      },
      onCommentActivated: (commentId) => {
        setActiveCommentId(commentId);
        if (commentId) setTimeout(() => focusCommentWithActiveId(commentId));
      },
    }),
    Collaboration.configure({
      document: ydoc,
    }),
    ...(externalExtensions ? Object.values(externalExtensions) : []),
  ]);

  // useEffect(() => {
  //   setExtensions((prev) => [
  //     ...prev.filter((ext) => ext.name !== 'table'),
  //     Table.configure({
  //       resizable: !isPreviewMode,
  //     }),
  //   ]);
  // }, [isPreviewMode]);

  useEffect(() => {
    slashCommandConfigRef.current = {
      isConnected,
      enableCollaboration,
      disableInlineComment,
    };
  }, [isConnected, enableCollaboration, disableInlineComment]);
  const initialContentSetRef = useRef(false);
  const isInitialEditorCreation = useRef(true);
  const [slides, setSlides] = useState<string[]>([]);

  const isHighlightedYellow = (
    state: EditorState,
    from: number,
    to: number,
  ) => {
    let _isHighlightedYellow = false;
    state.doc.nodesBetween(from, to, (node) => {
      if (
        node.marks &&
        node.marks.some(
          (mark) =>
            mark.type.name === 'highlight' && mark.attrs.color === 'yellow',
        )
      ) {
        _isHighlightedYellow = true;
      }
    });
    return _isHighlightedYellow;
  };

  const handleCommentInteraction = (view: EditorView, event: MouseEvent) => {
    const target: any = event.target;
    // Check if the hovered element is a highlighted text
    if (
      target &&
      target.nodeName === 'MARK' &&
      target.dataset.color &&
      target?.dataset?.color === 'yellow'
    ) {
      const highlightedText = target.textContent;

      // Find the position of the hovered text within the document
      const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });

      if (pos) {
        const { state } = view;
        let from = pos.pos;
        let to = pos.pos;

        // Find the start and end of the highlighted mark
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (node.marks && node.marks.length) {
            node.marks.forEach((mark) => {
              if (mark.type.name === 'highlight') {
                from = pos;
                to = pos + node.nodeSize;
              }
            });
          }
        });

        if (from !== to) {
          const data = {
            text: highlightedText,
            from,
            to,
            isHighlightedYellow: isHighlightedYellow(state, from, to),
          };
          onCommentInteraction?.(data);
        }
      }
    }
  };

  const handleCommentClick = (
    view: EditorView,
    _pos: number,
    event: MouseEvent,
  ) => {
    handleCommentInteraction(view, event);
  };

  // Memoize the extensions array to avoid unnecessary re-renders
  const memoizedExtensions = useMemo(() => extensions, [extensions]);

  // Create a ref to store the timeout ID
  const tocUpdateTimeoutRef = useRef<number | null>(null);
  const preventDeletionIfItIsReminderNode = (
    view: EditorView,
    event: KeyboardEvent,
  ) => {
    const { state } = view;
    const { selection } = state;
    const { from, to, empty } = selection;

    if (event.key === 'Backspace' || event.key === 'Delete') {
      let deletingReminder = false;

      // 1) If there's a range select, check for reminderBlock nodes
      if (!empty) {
        state.doc.nodesBetween(from, to, (node) => {
          if (node.type.name === 'reminderBlock') deletingReminder = true;
        });
      }
      // 2) If it's just a cursor, use selection.$from
      else {
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

  // Don't recreate the editor when extensions change
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

  useEffect(() => {
    if (activeModel) {
      setExtensions([
        ...extensions.filter(
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
        SlashCommand(
          (error: string) => onError?.(error),
          ipfsImageUploadFn,
          slashCommandConfigRef,
        ),
      ]);
    }
  }, [activeModel, maxTokens, isAIAgentEnabled]);

  useEffect(() => {
    if (zoomLevel) {
      zoomService.setZoom(zoomLevel);

      const timeoutId = setTimeout(() => {
        zoomService.setZoom(zoomLevel);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [zoomLevel, isContentLoading, initialContent, editor?.isEmpty]);

  const collaborationCleanupRef = useRef<() => void>(() => {});

  // Register collaboration cursor plugin directly via editor.registerPlugin
  // instead of setExtensions, which would destroy and recreate the editor (causing scroll jump)
  useEffect(() => {
    if (!editor || !awareness || !isReady) return;

    const user = {
      name: collabConfig?.username || '',
      color: userColorRef.current,
      isEns: collabConfig?.isEns,
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

  // Update user info when ENS resolves
  useEffect(() => {
    if (!isReady || !enableCollaboration || !collabConfig || !awareness) return;
    if (collabConfig.isEns) {
      awareness.setLocalStateField('user', {
        name: collabConfig.username,
        color: userColorRef.current,
        isEns: collabConfig.isEns,
      });
    }
  }, [isReady, enableCollaboration, collabConfig?.isEns, awareness]);

  const ref = useRef<HTMLDivElement>(null);

  const readyState = useMemo(() => {
    if (isCollaborationEnabled) {
      return hasCollabContentInitialised && isReady;
    }
    return isPreviewMode ? false : true;
  }, [
    isCollaborationEnabled,
    hasCollabContentInitialised,
    isPreviewMode,
    isReady,
  ]);

  useEffect(() => {
    editor?.setEditable(readyState);
  }, [editor, readyState]);

  useEffect(() => {
    if (!isCollaborationEnabled) return;
    setIsCollabContentLoading(!isReady);
  }, [isCollaborationEnabled, isReady]);

  const yjsIndexeddbProviderRef = useRef<IndexeddbPersistence | null>(null);

  const initialiseYjsIndexedDbProvider = async () => {
    const provider = yjsIndexeddbProviderRef.current;
    if (provider) {
      await provider.destroy();
    }
    if (enableIndexeddbSync && ddocId) {
      try {
        const newYjsIndexeddbProvider = new IndexeddbPersistence(ddocId, ydoc);
        // Wait for the database to be ready and synced
        await newYjsIndexeddbProvider.whenSynced;
        yjsIndexeddbProviderRef.current = newYjsIndexeddbProvider;
      } catch (error) {
        console.error('IndexedDB initialization failed:', error);
        onIndexedDbError?.(
          error instanceof Error ? error : new Error(String(error)),
        );
        // Don't rethrow - allow editor to continue without persistence
      }
    }
  };

  const mergeAndApplyUpdate = (contents: string[]) => {
    const parsedContents = contents.map((content) => toUint8Array(content));
    Y.applyUpdate(ydoc, Y.mergeUpdates(parsedContents), 'self');
  };

  const isContentYjsEncoded = (
    initialContent: string[] | JSONContent | string | null,
  ) => {
    return (
      Array.isArray(initialContent) ||
      (typeof initialContent === 'string' && !isJSONString(initialContent))
    );
  };

  const isLoadingInitialContent = (
    initialContent: string | JSONContent | string[] | null | undefined,
  ) => {
    return initialContent === null;
  };

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.substring(1)
    : window.location.hash;

  const hashParams = new URLSearchParams(hash);
  const heading = hashParams.get('heading');
  const headingId = heading?.split('-').pop();
  const { isNativeMobile } = useResponsive();

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
  }, [editor, isPresentationMode]);

  useEffect(() => {
    if (
      !isLoadingInitialContent(initialContent) &&
      editor &&
      !initialContentSetRef.current &&
      ydoc
    ) {
      setIsContentLoading(true);
      queueMicrotask(() => {
        if (initialContent !== '') {
          const isYjsEncoded = isContentYjsEncoded(initialContent as string);
          if (isYjsEncoded) {
            if (Array.isArray(initialContent)) {
              mergeAndApplyUpdate(initialContent);
            } else {
              Y.applyUpdate(
                ydoc,
                toUint8Array(initialContent as string),
                'self',
              );
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

        initialiseYjsIndexedDbProvider().finally(() => {
          setIsContentLoading(false);
        });
      });

      initialContentSetRef.current = true;
    } else if (initialContent !== null) {
      // if initialContent is null then we are loading it from consumer app
      setIsContentLoading(false);
    }
  }, [initialContent, editor, ydoc]);

  // const startCollaboration = useCallback(
  //   async (collaborationId: string, roomKey: string) => {
  //     if (!collabConfig?.wsUrl)
  //       throw new Error('Cannot start collaboration without a wss url');
  //     let _username = collabConfig?.username;
  //     let _isEns = false;

  //     if (walletAddress && ensResolutionUrl) {
  //       const { name, isEns } = await getAddressName(
  //         walletAddress,
  //         ensResolutionUrl,
  //       );

  //       _username = name;
  //       _isEns = isEns;
  //     }
  //     onConnect({
  //       username: _username,
  //       roomKey,
  //       roomId: collaborationId,
  //       isOwner: collabConfig?.isOwner,
  //       ownerEdSecret: collabConfig?.ownerEdSecret,
  //       contractAddress: collabConfig?.contractAddress,
  //       ownerAddress: collabConfig?.ownerAddress,
  //       isEns: _isEns,
  //       wsUrl: collabConfig.wsUrl,
  //       roomInfo: collabConfig.roomInfo,
  //     });
  //   },
  //   [collabConfig?.collaborationId],
  // );

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

  const charCountDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    if (!editor) return;

    const updateCounts = () => {
      if (charCountDebounceRef.current) {
        clearTimeout(charCountDebounceRef.current);
      }
      charCountDebounceRef.current = setTimeout(() => {
        charCountDebounceRef.current = null;
        if (editor && !editor.isDestroyed) {
          setCharacterCount?.(editor.storage.characterCount.characters() ?? 0);
          setWordCount?.(editor.storage.characterCount.words() ?? 0);
        }
      }, 500);
    };

    // Initial count
    updateCounts();
    editor.on('update', updateCounts);

    return () => {
      editor.off('update', updateCounts);
      if (charCountDebounceRef.current) {
        clearTimeout(charCountDebounceRef.current);
      }
    };
  }, [editor]);

  const onChangeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    const handler = (update: Uint8Array, origin: any) => {
      if (origin === 'self') return;
      const chunk = fromUint8Array(update);

      // Debounce the expensive full-state encoding.
      // The incremental chunk is tiny and fires immediately via the second arg.
      // The full Y.Doc encoding (first arg) is O(n) and only needed for
      // persistence — batching it avoids encoding on every keystroke.
      if (onChangeDebounceRef.current) {
        clearTimeout(onChangeDebounceRef.current);
      }
      onChangeDebounceRef.current = setTimeout(() => {
        onChangeDebounceRef.current = null;
        onChange?.(fromUint8Array(Y.encodeStateAsUpdate(ydoc)), chunk);
      }, 300);
    };
    if (ydoc) {
      ydoc.on('update', handler);
    }
    return () => {
      ydoc?.off('update', handler);
      if (onChangeDebounceRef.current) {
        clearTimeout(onChangeDebounceRef.current);
      }
    };
  }, [ydoc]);

  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

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

  return {
    editor,
    isContentLoading:
      isCollaborationEnabled && !collabConfig?.isOwner
        ? isCollabContentLoading || isContentLoading
        : isContentLoading,
    ref,
    ydoc,
    refreshYjsIndexedDbProvider: initialiseYjsIndexedDbProvider,
    activeCommentId,
    setActiveCommentId,
    focusCommentWithActiveId,
    slides,
    setSlides,
    tocItems,
    setTocItems,
    terminateSession,
    awareness,
  };
};
