/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from 'react';
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
import customTextInputRules from './extensions/customTextInputRules';
import { PageBreak } from './extensions/page-break/page-break';

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
  onTextSelection,
  ensResolutionUrl,
  onError,
  setCharacterCount,
  setWordCount,
  secureImageUploadUrl,
  scrollPosition,
  unFocused,
  commentMap,
}: Partial<DdocProps>) => {
  const [ydoc] = useState(new Y.Doc());
  const [extensions, setExtensions] = useState([
    ...(defaultExtensions(
      (error: string) => onError?.(error),
      secureImageUploadUrl,
    ) as AnyExtension[]),
    SlashCommand((error: string) => onError?.(error), secureImageUploadUrl),
    customTextInputRules,
    PageBreak,
  ]);
  const initialContentSetRef = useRef(false);
  const [isContentLoading, setIsContentLoading] = useState(true);

  const isHighlightedYellow = (
    state: EditorState,
    from: number,
    to: number,
  ) => {
    let _isHighlightedYellow = false;
    state.doc.nodesBetween(from, to, node => {
      if (
        node.marks &&
        node.marks.some(
          mark =>
            mark.type.name === 'highlight' && mark.attrs.color === 'yellow',
        )
      ) {
        _isHighlightedYellow = true;
      }
    });
    return _isHighlightedYellow;
  };
  const [popupPosition, setPopupPosition] = useState({
    x: 0,
    y: 0,
    visible: false,
  });

  const [popupContent, setPopupContent] = useState('');

  const handleCommentInteraction = (_view: EditorView, event: MouseEvent) => {
    console.log({ commentMap }, 'handleCommentInteraction');
    if (!commentMap) return;
    const target: any = event.target;
    // Check if the hovered element is a highlighted text
    if (
      target &&
      target.nodeName === 'MARK' &&
      target.dataset.color &&
      target?.dataset?.color === '#DDFBDF'
    ) {
      const rect = target.getBoundingClientRect();

      const popupWidth = 300;

      const x = Math.max(
        10,
        Math.min(
          rect.left + rect.width / 2 - popupWidth / 2,
          window.innerWidth - popupWidth - 10,
        ),
      );
      const y = Math.max(10, rect.top - 130);
      const highlightedComment = commentMap.get(target.textContent);
      if (highlightedComment) {
        setPopupContent(highlightedComment);
        setPopupPosition({ x, y, visible: true });
      }
    } else {
      setPopupPosition(prev => ({ ...prev, visible: false }));
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
        },
        handleClick: handleCommentClick,
      },
      autofocus: unFocused ? false : 'start',
      onTransaction: ({ editor, transaction }) => {
        if (editor?.isEmpty) {
          return;
        }
        if (transaction.docChanged) {
          onChange?.(editor.getJSON());
        }
      },
      shouldRerenderOnTransaction: true,
      immediatelyRender: false,
    },
    [extensions],
  );

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
      ...extensions.filter(extension => extension.name !== 'history'),
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

  useEffect(() => {
    if (initialContent && editor && !initialContentSetRef.current) {
      setIsContentLoading(true);
      queueMicrotask(() => {
        editor.commands.setContent(initialContent);
        setIsContentLoading(false);
      });

      initialContentSetRef.current = true;
    }

    setTimeout(() => {
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
  }, [initialContent, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const handleSelection = () => {
      const { state } = editor;
      const { from, to } = state.selection;

      const selectedText = state.doc.textBetween(from, to, ' ');
      onTextSelection?.({
        text: selectedText,
        from,
        to,
        isHighlightedYellow: isHighlightedYellow(state, from, to),
      });
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

  useEffect(() => {
    setCharacterCount &&
      setCharacterCount(editor?.storage.characterCount.characters());
    setWordCount && setWordCount(editor?.storage.characterCount.words());
  }, [
    editor?.storage.characterCount.characters(),
    editor?.storage.characterCount.words(),
  ]);

  return {
    editor,
    isContentLoading,
    ref,
    connect,
    ydoc,
    isCommentShown: popupPosition.visible,
    popupContent,
    popupPosition,
  };
};
