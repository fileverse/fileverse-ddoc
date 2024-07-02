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
import { getAddressName } from './utils/getAddressName';

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
}: Partial<DdocProps>) => {
  const [ydoc] = useState(new Y.Doc());
  const [loading, setLoading] = useState(false);
  const [extensions, setExtensions] = useState([
    ...(defaultExtensions as AnyExtension[]),
  ]);
  const initialContentSetRef = useRef(false);

  const onlineEditor = useEditor(
    {
      extensions,
      editorProps: DdocEditorProps,
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
    editorProps: DdocEditorProps,
    autofocus: 'start',
    onUpdate: (_editor) => {
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
          name: username,
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

  const startCollaboration = async () => {
    let _username = username;
    let _isEns = false;

    if (walletAddress) {
      const { name, isEns } = await getAddressName(
        walletAddress,
        'https://eth-mainnet.g.alchemy.com/v2/uzKE0HT-Vc3LmUAA_dNVEt2rO8LtJGA3',
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
