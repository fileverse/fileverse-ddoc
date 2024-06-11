import { useEffect, useState, useRef } from 'react';
import { WebrtcProvider } from 'y-webrtc';
import { PluginMetaData, DdocProps, DdocEditorProps } from './types';
import * as Y from 'yjs';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { defaultExtensions } from './extensions/default-extension';
import { AnyExtension, useEditor } from '@tiptap/react';

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
  data,
  enableCollaboration,
  collaborationId,
}: DdocProps) => {
  const [pluginMetaData, setPluginMetaData] = useState<PluginMetaData>({
    plugin: {
      title: 'Untitled',
    },
  });
  const [ydoc] = useState(new Y.Doc());
  const providerRef = useRef<WebrtcProvider | null>(null);

  const extensions = [
    ...(defaultExtensions as AnyExtension[]),
    Collaboration.configure({
      document: ydoc,
    }),
  ];

  useEffect(() => {
    if (collaborationId && enableCollaboration) {
      const provider = new WebrtcProvider(
        collaborationId || 'default-room',
        ydoc,
        {
          signaling: [
            'wss://fileverse-signaling-server-0529292ff51c.herokuapp.com/',
          ],
        }
      );
      providerRef.current = provider;
      return () => {
        provider.destroy();
        ydoc.destroy();
      };
    }
  }, [collaborationId, ydoc]);

  useEffect(() => {
    if (enableCollaboration && collaborationId) {
      const collaborationCursorExists = extensions.some(
        (extension) => extension.name === 'collaborationCursor'
      );

      if (!collaborationCursorExists) {
        extensions.push(
          CollaborationCursor.configure({
            provider: providerRef.current,
            user: {
              color: usercolors[Math.floor(Math.random() * usercolors.length)],
            },
          })
        );
      }
    }
  }, [providerRef.current]);

  const editor = useEditor(
    {
      extensions,
      editorProps: DdocEditorProps,
      autofocus: 'start',
    }
    // [extensions]
  );

  const ref = useRef<HTMLDivElement>(null);

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
      setPluginMetaData(data.metaData)
    }
  }, [data, editor]);

  return {
    editor,
    pluginMetaData,
    setPluginMetaData,
    focusEditor,
    ref,
  };
};
