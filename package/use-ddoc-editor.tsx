/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef, useCallback } from 'react';
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
import { Table } from './extensions/supercharged-table/extension-table';
import { isBlackOrWhiteShade } from './utils/color-utils';
import { useResponsive } from './utils/responsive';
import { headingToSlug } from './utils/heading-to-slug';

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
  ddocId,
  enableIndexeddbSync,
  unFocused,
  zoomLevel,
  onInvalidContentError,
  ignoreCorruptedData,
  isPresentationMode,
  proExtensions,
  metadataProxyUrl,
  onCopyHeadingLink,
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
      metadataProxyUrl,
      onCopyHeadingLink,
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
      extensions: extensions,
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
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
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

  const collaborationCleanupRef = useRef<() => void>(() => { });

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
    return !initialContent && initialContent !== '';
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
      if (editor) {
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

        initialiseYjsIndexedDbProvider()
          .then(() => {
            setIsContentLoading(false);
          })
          .catch((error) => {
            console.log(error);
          });
      });

      initialContentSetRef.current = true;
    } else {
      setIsContentLoading(false);
    }
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
    const handler = (update: Uint8Array, origin: any) => {
      if (origin === 'self') return;
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
  const isDarkMode = useRef(localStorage.getItem('theme') !== null);
  const initialDarkModeCleanupDone = useRef(false); // Flag to run only once

  useEffect(() => {
    // Exit if not dark mode, editor not ready, content loading, or cleanup already done
    if (
      !editor ||
      isContentLoading ||
      !isDarkMode.current ||
      initialDarkModeCleanupDone.current
    ) {
      return;
    }

    // Only run if there's initial content to process
    if (initialContent) {
      const timeoutId = setTimeout(() => {
        // Double-check editor exists inside timeout
        if (!editor) return;

        const { from, to } = editor.state.selection;

        // Get all text color marks
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

        // Check if any marks need processing
        if (marks.length > 0) {
          // First, only remove color attribute from text styles
          editor
            .chain()
            .selectAll()
            .setColor('') // This removes only the color attribute
            .run();

          // Then, restore colors that aren't black/white shades
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

          // Restore original selection
          editor.commands.setTextSelection({ from, to });
        }

        // Mark cleanup as done
        initialDarkModeCleanupDone.current = true;
      }, 100);

      return () => clearTimeout(timeoutId);
    } else {
      // If there's no initial content, consider cleanup done for this load
      initialDarkModeCleanupDone.current = true;
    }
  }, [editor, initialContent, isContentLoading]); // Keep dependencies, the flag prevents re-runs

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
