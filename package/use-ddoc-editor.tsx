/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from 'react';
import { DdocProps, DdocEditorProps } from './types';
import Collaboration from '@tiptap/extension-collaboration';
import { defaultExtensions } from './extensions/default-extension';
import { AnyExtension, useEditor } from '@tiptap/react';
import { getCursor } from './utils/cursor';
import { getAddressName, getTrimmedName } from './utils/getAddressName';
import SlashCommand from './components/slash-comand';
import { useSyncMachine } from '@fileverse-dev/sync';
import { SyncCursor } from './extensions/sync-cursor';

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
  ensResolutionUrl,
  onError,
  setCharacterCount,
  setWordCount,
  collaborationKey,
  yjsUpdate,
  onDisconnectionDueToSyncError,
}: Partial<DdocProps>) => {
  const [extensions, setExtensions] = useState([
    ...(defaultExtensions as AnyExtension[]),
    SlashCommand(onError),
  ]);
  const initialContentSetRef = useRef(false);
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [isEns, setIsEns] = useState(false);

  const {
    machine,
    connect: connectMachine,
    isReady: isCollaborationReady,
    ydoc,
    getYjsEncodedState,
    applyYjsEncodedState,
    error: syncError,
  } = useSyncMachine({
    roomId: collaborationId,
    roomKey: collaborationKey,
    wsProvider: 'wss://dev-sync.fileverse.io/',
  });

  const editor = useEditor(
    {
      extensions: [
        ...extensions,
        Collaboration.configure({
          document: ydoc,
        }),
      ],
      editorProps: {
        ...DdocEditorProps,
        handleDOMEvents: {
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
      },
      autofocus: 'start',
      shouldRerenderOnTransaction: true,
      immediatelyRender: false,
    },
    [extensions, ydoc],
  );
  const connect = (username: string | null | undefined, isEns = false) => {
    if (!enableCollaboration || !collaborationId) {
      throw new Error('docId or username is not provided');
    }
    setIsEns(isEns);
    connectMachine(username as string);
  };

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    editor?.setEditable(!isPreviewMode);
  }, [isPreviewMode, editor]);
  useEffect(() => {
    if (
      (initialContent || yjsUpdate) &&
      editor &&
      !initialContentSetRef.current
    ) {
      setIsContentLoading(true);
      queueMicrotask(() => {
        if (yjsUpdate) {
          applyYjsEncodedState(yjsUpdate);
        } else if (initialContent) {
          editor.commands.setContent(initialContent);
        }
        setIsContentLoading(false);
      });

      initialContentSetRef.current = true;
    }

    setTimeout(() => {
      initialContentSetRef.current = false;
      if (editor && initialContent === undefined) {
        setIsContentLoading(false);
      }
    });
  }, [initialContent, editor, yjsUpdate]);

  const isSyncFetchingFromIpfs = !!(machine[0] as any).value
    ?.syncing_latest_commit;

  useEffect(() => {
    if (isCollaborationReady) {
      setExtensions([
        ...extensions.filter(extension => extension.name !== 'history'),
        SyncCursor.configure({
          provider: machine[0],
          user: {
            name:
              username && username.length > 20
                ? getTrimmedName(username, 7, 15)
                : username,
            color: usercolors[Math.floor(Math.random() * usercolors.length)],
            isEns,
          },
          render: getCursor,
        }),
      ]);
    }
  }, [isCollaborationReady]);

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

  const isStateMachineDisconnected =
    (machine[0] as any).value === 'disconnected';

  useEffect(() => {
    if (enableCollaboration) {
      startCollaboration();
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
    const handler = () => {
      onChange?.(getYjsEncodedState());
    };
    if (ydoc) {
      ydoc.on('update', handler);
    }
    return () => ydoc?.off('update', handler);
  }, [ydoc]);

  useEffect(() => {
    if (yjsUpdate) {
      applyYjsEncodedState(yjsUpdate);
    }
  }, [yjsUpdate]);

  useEffect(() => {
    if (syncError && isStateMachineDisconnected) {
      onDisconnectionDueToSyncError?.(syncError);
    }
  }, [syncError]);
  return {
    editor,
    isContentLoading,
    ref,
    connect,
    ydoc,
    isCollaborationReady,
    syncError,
    isSyncFetchingFromIpfs,
  };
};
