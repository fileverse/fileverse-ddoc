/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from 'react';
import { WebrtcProvider } from 'y-webrtc';
import { DdocProps, DdocEditorProps } from './types';
import * as Y from 'yjs';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { defaultExtensions } from './extensions/default-extension';
import { AnyExtension, JSONContent, useEditor } from '@tiptap/react';
import { getCursor } from './utils/cursor';
import { getAddressName, getTrimmedName } from './utils/getAddressName';
import { EditorView } from '@tiptap/pm/view';
import SlashCommand from './extensions/slash-command/slash-comand';
import { EditorState } from '@tiptap/pm/state';
import customTextInputRules from './extensions/customTextInputRules';
import { PageBreak } from './extensions/page-break/page-break';
import { fromUint8Array, toUint8Array } from 'js-base64';
import { IndexeddbPersistence } from 'y-indexeddb';
import { isJSONString } from './utils/isJsonString';
import { zoomService } from './zoom-service';
import { sanitizeContent } from './utils/sanitize-content';
import { CommentExtension as Comment } from './extensions/comment';
import { handleContentPrint, handlePrint } from './utils/handle-print';
import { Table } from './extensions/supercharged-table/extension-table';

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
  collaborationId,
  walletAddress,
  username,
  onChange,
  onCollaboratorChange,
  onCommentInteraction,
  ensResolutionUrl,
  onError,
  setCharacterCount,
  setWordCount,
  secureImageUploadUrl,
  scrollPosition,
  ddocId,
  enableIndexeddbSync,
  unFocused,
  zoomLevel,
  onInvalidContentError,
  ignoreCorruptedData,
  isPresentationMode,
  proExtensions,
}: Partial<DdocProps>) => {
  const [ydoc] = useState(new Y.Doc());

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
  const [tocItems, setTocItems] = useState<any[]>([]);

  const [extensions, setExtensions] = useState([
    ...(defaultExtensions(
      (error: string) => onError?.(error),
      secureImageUploadUrl,
    ) as AnyExtension[]),
    SlashCommand((error: string) => onError?.(error), secureImageUploadUrl),
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
  ]);

  useEffect(() => {
    setExtensions((prev) => [
      ...prev.filter((ext) => ext.name !== 'table'),
      Table.configure({
        resizable: !isPreviewMode,
      }),
    ]);
  }, [isPreviewMode]);

  const initialContentSetRef = useRef(false);
  const [isContentLoading, setIsContentLoading] = useState(true);
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

  const editor = useEditor(
    {
      extensions,
      editorProps: {
        ...DdocEditorProps,
        handleDOMEvents: {
          mouseover: handleCommentInteraction,
          keydown: (_view, event) => {
            // prevent default event listeners from firing when slash command is active
            if (['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
              const slashCommand = document.querySelector('#slash-command');
              if (slashCommand) {
                return true;
              }
            }
          },
          blur: () => {
            editor?.commands.unsetCommentActive();
          },
        },
        handleClick: handleCommentClick,
      },
      autofocus: unFocused ? false : 'start',
      shouldRerenderOnTransaction: true,
      immediatelyRender: false,
    },
    [extensions, isPresentationMode],
  );

  useEffect(() => {
    if (
      proExtensions?.TableOfContents &&
      !extensions.some((ext) => ext.name === 'tableOfContents')
    ) {
      setExtensions([
        ...extensions.filter((ext) => ext.name !== 'tableOfContents'),
        proExtensions.TableOfContents.configure({
          getIndex: proExtensions.getHierarchicalIndexes,
          onUpdate(content: any) {
            setTocItems(content);
          },
        }),
      ]);
    }
  }, [proExtensions]);

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

  const connect = (username: string | null | undefined, isEns = false) => {
    if (!enableCollaboration || !collaborationId) {
      throw new Error('docId or username is not provided');
    }

    const provider = new WebrtcProvider(collaborationId, ydoc, {
      signaling: [
        'wss://fileverse-signaling-server-0529292ff51c.herokuapp.com/',
      ],
    });

    setExtensions([
      ...extensions.filter((extension) => extension.name !== 'history'),
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name:
            username && username.length > 20
              ? getTrimmedName(username, 7, 15)
              : username,
          color: usercolors[Math.floor(Math.random() * usercolors.length)],
          isEns: isEns,
        },
        render: getCursor,
      }),
    ]);

    collaborationCleanupRef.current = () => {
      provider.destroy();
      ydoc.destroy();
    };

    return collaborationCleanupRef.current;
  };

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    editor?.setEditable(!isPreviewMode);
  }, [isPreviewMode, editor]);

  const yjsIndexeddbProviderRef = useRef<IndexeddbPersistence | null>(null);

  const initialiseYjsIndexedDbProvider = async () => {
    const provider = yjsIndexeddbProviderRef.current;
    if (provider) {
      await provider.destroy();
    }
    if (enableIndexeddbSync && ddocId) {
      const newYjsIndexeddbProvider = new IndexeddbPersistence(ddocId, ydoc);
      yjsIndexeddbProviderRef.current = newYjsIndexeddbProvider;
    }
  };

  const mergeAndApplyUpdate = (contents: string[]) => {
    const parsedContents = contents.map((content) => toUint8Array(content));
    Y.applyUpdate(ydoc, Y.mergeUpdates(parsedContents));
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
    return !initialContent && initialContent !== '';
  };

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
              Y.applyUpdate(ydoc, toUint8Array(initialContent as string));
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

        initialiseYjsIndexedDbProvider()
          .then(() => {
            setIsContentLoading(false);
          })
          .catch((error) => {
            console.log(error);
          });
      });

      initialContentSetRef.current = true;
    }

    const scrollTimeoutId = setTimeout(() => {
      if (ref.current && !!scrollPosition && editor) {
        const coords = editor.view.coordsAtPos(scrollPosition);
        const editorContainer = ref.current;
        editorContainer.scrollTo({
          top: editorContainer.scrollTop + coords.top - 500,
          behavior: 'smooth',
        });
      }
      initialContentSetRef.current = false;
      if (editor && initialContent === undefined) {
        setIsContentLoading(false);
      }
    });

    return () => {
      clearTimeout(scrollTimeoutId);
    };
  }, [initialContent, editor, ydoc]);

  const startCollaboration = async () => {
    let _username = username;
    let _isEns = false;

    if (walletAddress && ensResolutionUrl) {
      const { name, isEns } = await getAddressName(
        walletAddress,
        ensResolutionUrl,
      );

      _username = name;
      _isEns = isEns;
    }
    if (!_username)
      throw new Error('Cannot start collaboration without a username');
    connect(_username, _isEns);
  };

  useEffect(() => {
    if (enableCollaboration) {
      startCollaboration();
    } else {
      collaborationCleanupRef.current();
    }
  }, [enableCollaboration]);

  useEffect(() => {
    onCollaboratorChange?.(editor?.storage?.collaborationCursor?.users);
  }, [editor?.storage?.collaborationCursor?.users]);

  useEffect(() => {
    setCharacterCount &&
      setCharacterCount(editor?.storage.characterCount.characters());
    setWordCount && setWordCount(editor?.storage.characterCount.words());
  }, [
    editor?.storage.characterCount.characters(),
    editor?.storage.characterCount.words(),
  ]);

  useEffect(() => {
    const handler = (update: Uint8Array) => {
      onChange?.(
        fromUint8Array(Y.encodeStateAsUpdate(ydoc)),
        fromUint8Array(update),
      );
    };
    if (ydoc) {
      ydoc.on('update', handler);
    }
    return () => {
      ydoc?.off('update', handler);
    };
  }, [ydoc]);

  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  // Single, focused theme effect
  useEffect(() => {
    if (!editor) return;

    const handleThemeChange = () => {
      const isDarkTheme = localStorage.getItem('theme') === 'dark';
      if (isDarkTheme) {
        editor
          .chain()
          .selectAll()
          .unsetMark('textStyle', { extendEmptyMarkRange: true })
          .run();
      }
    };

    // Observe theme changes
    const observer = new MutationObserver(() => {
      handleThemeChange();
    });

    // Watch for class changes on html element that indicate theme switches
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [editor]);

  return {
    editor,
    isContentLoading,
    ref,
    connect,
    ydoc,
    refreshYjsIndexedDbProvider: initialiseYjsIndexedDbProvider,
    activeCommentId,
    setActiveCommentId,
    focusCommentWithActiveId,
    slides,
    setSlides,
    tocItems,
    setTocItems,
  };
};
