/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef, useMemo } from 'react';
import { WebrtcProvider } from 'y-webrtc';
import { DdocProps, DdocEditorProps } from './types';
import * as Y from 'yjs';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { defaultExtensions } from './extensions/default-extension';
import { AnyExtension, useEditor } from '@tiptap/react';
import { getCursor } from './utils/cursor';
import { getAddressName, getTrimmedName } from './utils/getAddressName';
import { EditorView } from '@tiptap/pm/view';
import SlashCommand from './components/slash-comand';
import { EditorState } from '@tiptap/pm/state';

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
  onTextSelection,
  ensResolutionUrl,
  handleImageUploadToIpfs,
}: Partial<DdocProps>) => {
  const [ydoc] = useState(new Y.Doc());
  const [loading, setLoading] = useState(false);
  const [extensions, setExtensions] = useState([
    ...(defaultExtensions as AnyExtension[]),
    SlashCommand(handleImageUploadToIpfs!),
  ]);
  const initialContentSetRef = useRef(false);

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

  const processLargeTextAsync = (view: any, text: string) => {
    const blocks = text.split('\n\n');
    // Reverse the order of blocks except for the first one
    const firstBlock = blocks.slice(0, 1);
    const reversedBlocks = blocks.slice(1).reverse();
    const orderedBlocks = firstBlock.concat(reversedBlocks);

    let currentBlockIndex = 0;

    const insertNextBlock = () => {
      if (currentBlockIndex < orderedBlocks.length) {
        const block = orderedBlocks[currentBlockIndex];
        const tr = view.state.tr;
        let insertPos = tr.selection.from;

        if (currentBlockIndex > 0) {
          insertPos = tr.doc.resolve(insertPos).end(1);
          // Ensure we're not at the end of the document; if so, adjust accordingly
          if (!tr.doc.resolve(insertPos + 1).parent) {
            tr.insert(insertPos, view.state.schema.nodes.paragraph.create());
            insertPos += 1;
          } else {
            insertPos += 1; // Adjust to insert after the current block/node
          }
        }

        tr.insertText(block, insertPos);
        view.dispatch(tr);

        currentBlockIndex++;
        // Adjust the delay or mechanism based on performance and responsiveness needs
        requestAnimationFrame(insertNextBlock);
      }
    };

    insertNextBlock();
  };

  const onlineEditor = useEditor(
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
          paste: (_view, event) => {
            // prevent default when pasting a set of large text to avoid browser crash
            if (event.clipboardData) {
              const text = event.clipboardData.getData('text');
              if (text.length > 20000) {
                event.preventDefault();
                processLargeTextAsync(_view, text);
              }
            }

            return false;
          }
        },
        handleClick: handleCommentClick,
      },
      autofocus: 'start',
      onUpdate: (_editor) => {
        if (editor?.isEmpty) {
          return;
        }
        onChange?.(_editor.editor.getJSON());
      },
    },
    [extensions],
  );

  const offlineEditor = useEditor({
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
        paste: (_view, event) => {
          // prevent default when pasting a set of large text to avoid browser crash
          if (event.clipboardData) {
            const text = event.clipboardData.getData('text');
            if (text.length > 20000) {
              event.preventDefault();
              processLargeTextAsync(_view, text);
            }
          }

          return false;
        }
      },
      handleClick: handleCommentClick,
    },
    autofocus: 'start',
    onUpdate: (_editor) => {
      if (editor?.isEmpty) {
        return;
      }
      onChange?.(_editor.editor.getJSON());
    },
  });

  const collaborationCleanupRef = useRef<() => void>(() => { });

  const connect = (username: string | null | undefined, isEns = false) => {
    if (!enableCollaboration || !collaborationId) {
      throw new Error('docId or username is not provided');
    }

    setLoading(true);
    const provider = new WebrtcProvider(collaborationId, ydoc, {
      signaling: [
        'wss://fileverse-signaling-server-0529292ff51c.herokuapp.com/',
      ],
    });

    setExtensions([
      ...extensions,
      Collaboration.configure({
        document: ydoc,
      }),
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

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 100); // this is a hack to dynamically set tiptap extension -  wait for tiptap to re-render the online editor with new extensions before rendering the editor

    collaborationCleanupRef.current = () => {
      clearTimeout(timeout);
      provider.destroy();
      ydoc.destroy();
      setLoading(false);
    };

    return collaborationCleanupRef.current;
  };

  const ref = useRef<HTMLDivElement>(null);

  const editor = useMemo(() => {
    if (enableCollaboration && collaborationId && onlineEditor && !loading) {
      return onlineEditor;
    } else {
      return offlineEditor;
    }
  }, [onlineEditor, offlineEditor, loading]);

  useEffect(() => {
    editor?.setEditable(!isPreviewMode);
  }, [isPreviewMode, editor]);

  useEffect(() => {
    if (initialContent && editor && !initialContentSetRef.current) {
      editor.commands.setContent(initialContent);
      initialContentSetRef.current = true;
    }

    setTimeout(() => {
      initialContentSetRef.current = false;
    });
  }, [initialContent, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const handleSelection = () => {
      const { state } = editor;
      const { from, to } = state.selection;

      if (from !== to) {
        const selectedText = state.doc.textBetween(from, to, ' ');
        onTextSelection?.({
          text: selectedText,
          from,
          to,
          isHighlightedYellow: isHighlightedYellow(state, from, to),
        });
      }
    };

    editor.on('selectionUpdate', handleSelection);
    return () => {
      editor.off('selectionUpdate', handleSelection);
    };
  }, [editor]);

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

  return {
    editor,
    ref,
    loading,
    connect,
    ydoc,
  };
};
