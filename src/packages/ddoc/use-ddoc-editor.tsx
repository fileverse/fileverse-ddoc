import { useEffect, useState, useRef, useMemo } from 'react';
import { WebrtcProvider } from 'y-webrtc';
import { PluginMetaData, DdocProps, DdocEditorProps } from './types';
import * as Y from 'yjs';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { defaultExtensions } from './extensions/default-extension';
import { AnyExtension, useEditor } from '@tiptap/react';
import { IndexeddbPersistence } from 'y-indexeddb';

const usercolors = [
  '#30bced',
  '#6eeb83',
  '#fa69d1',
  '#ecd444',
  '#ee6352',
  '#db3041',
  '#0ad7f2',
  '#1bff39'
];

export const useDdocEditor = ({
  isPreviewMode,
  data,
  enableCollaboration,
  collaborationId
}: DdocProps) => {
  const [pluginMetaData, setPluginMetaData] = useState<PluginMetaData>({
    plugin: {
      title: 'Untitled'
    }
  });

  const [ydoc] = useState(new Y.Doc());
  const [loading, setLoading] = useState(false);
  const [extensions, setExtensions] = useState([
    ...(defaultExtensions as AnyExtension[])
  ]);

  const onlineEditor = useEditor(
    {
      extensions,
      editorProps: DdocEditorProps,
      autofocus: 'start'
    },
    [extensions]
  );

  const offlineEditor = useEditor({
    extensions,
    editorProps: DdocEditorProps,
    autofocus: 'start'
  });

  const connect = (username: string) => {
    if (!enableCollaboration || !collaborationId || !username) {
      throw new Error('docId or username is not provided');
    }

    setLoading(true);
    const provider = new WebrtcProvider(collaborationId, ydoc, {
      signaling: [
        'wss://fileverse-signaling-server-0529292ff51c.herokuapp.com/'
      ]
    });

    setExtensions([
      ...extensions,
      Collaboration.configure({
        document: ydoc
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name: username,
          color: usercolors[Math.floor(Math.random() * usercolors.length)]
        }
      })
    ]);

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 100); // this is a hack to dynamically set tiptap extension -  wait for tiptap to re-render the online editor with new extensions before rendering the editor

    return () => {
      clearTimeout(timeout);
      provider.destroy();
      ydoc.destroy();
      setLoading(false);
    };
  };

  useEffect(() => {
    if (!collaborationId) return;
    new IndexeddbPersistence(collaborationId, ydoc);
  }, [collaborationId]);

  const ref = useRef<HTMLDivElement>(null);

  const editor = useMemo(() => {
    if (enableCollaboration && collaborationId && onlineEditor && !loading) {
      return onlineEditor;
    } else {
      return offlineEditor;
    }
  }, [onlineEditor, offlineEditor, loading]);

  const focusEditor = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (ref.current?.contains(e.target as Node)) return;
    editor?.chain().focus().run();
  };

  useEffect(() => {
    editor?.chain().focus();
  }, []);

  useEffect(() => {
    editor?.setEditable(!isPreviewMode);
  }, [isPreviewMode]);

  useEffect(() => {
    if (data && editor) {
      editor?.commands.setContent(data.editorJSONData);
      setPluginMetaData(data.metaData);
    }
  }, [data, editor]);

  return {
    editor,
    pluginMetaData,
    setPluginMetaData,
    focusEditor,
    ref,
    loading,
    connect
  };
};
