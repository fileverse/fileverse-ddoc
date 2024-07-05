import { useEffect, useState, useRef, useMemo } from 'react';
import { WebrtcProvider } from 'y-webrtc';
import { DdocProps, DdocEditorProps } from './types';
import * as Y from 'yjs';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { defaultExtensions } from './extensions/default-extension';
import { AnyExtension, useEditor } from '@tiptap/react';
import { getCursor } from './utils/cursor';
import { debounce } from './utils/debounce';
import { getAddressName, getTrimmedName } from './utils/getAddressName';
import { ENS_RESOLUTION_URL } from '../../constants';
import { EditorView } from '@tiptap/pm/view';

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
  onAutoSave,
  onChange,
  onCollaboratorChange,
  onHighlightedTextClick,
  onTextSelection,
  threads,
}: Partial<DdocProps>) => {
  const [ydoc] = useState(new Y.Doc());
  const [loading, setLoading] = useState(false);
  const [extensions, setExtensions] = useState([
    ...(defaultExtensions as AnyExtension[]),
  ]);
  const initialContentSetRef = useRef(false);

  const handleClick = (_view: EditorView, _pos: number, event: MouseEvent) => {
    const target: any = event.target;
    if (
      target &&
      target.nodeName === 'MARK' &&
      target?.dataset?.color === 'yellow'
    ) {
      const highlightedText = target.textContent;
      onHighlightedTextClick?.(highlightedText);
    }
  };

  const onlineEditor = useEditor(
    {
      extensions,
      editorProps: { ...DdocEditorProps, handleClick },
      autofocus: 'start',
      onUpdate: _editor => {
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
    editorProps: { ...DdocEditorProps, handleClick },
    autofocus: 'start',
    onUpdate: _editor => {
      if (editor?.isEmpty) {
        return;
      }
      onChange?.(_editor.editor.getJSON());
    },
  });

  const collaborationCleanupRef = useRef<() => void>(() => {});

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

  // const focusEditor = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
  //   if (ref.current?.contains(e.target as Node)) return;
  //   editor?.chain().focus().run();
  // };

  // useEffect(() => {
  //   editor?.chain().focus();
  // }, []);

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
        });
      }
    };
    editor.on('selectionUpdate', handleSelection);
    return () => {
      editor.off('selectionUpdate', handleSelection);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || !threads?.length) return;
    threads.forEach(selectedData => {
      const { from, to } = selectedData;
      editor
        .chain()
        .setTextSelection({ from, to })
        .setHighlight({ color: 'yellow' })
        .run();
    });
  }, [editor, threads]);

  const startCollaboration = async () => {
    let _username = username;
    let _isEns = false;

    if (walletAddress) {
      const { name, isEns } = await getAddressName(
        walletAddress,
        ENS_RESOLUTION_URL,
      );

      _username = name;
      _isEns = isEns;
    }
    connect(_username, _isEns);
  };

  useEffect(() => {
    if (enableCollaboration) {
      startCollaboration();
    } else {
      collaborationCleanupRef.current();
    }
  }, [enableCollaboration]);

  const debouncedAutoSave = useMemo(
    () =>
      debounce((editor, onAutoSave) => {
        onAutoSave({
          editorJSONData: editor.getJSON(),
        });
      }, 1000),
    [onAutoSave],
  );

  useEffect(() => {
    if (editor && onAutoSave) {
      // Bind the update handler only once
      const handleUpdate = () => {
        debouncedAutoSave(editor, onAutoSave);
      };

      editor.on('update', handleUpdate);

      // Cleanup function to remove the handler
      return () => {
        editor.off('update', handleUpdate);
      };
    }
  }, [editor, onAutoSave, debouncedAutoSave]);

  useEffect(() => {
    onCollaboratorChange?.(editor?.storage?.collaborationCursor?.users);
  }, [editor?.storage?.collaborationCursor?.users]);

  return {
    editor,
    // focusEditor,
    ref,
    loading,
    connect,
    ydoc,
  };
};
