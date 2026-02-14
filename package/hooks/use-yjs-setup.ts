import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { JSONContent } from '@tiptap/react';
import { useSyncMachine } from '../sync-local/useSyncMachine';
import { useRtcWebsocketDisconnector } from './use-rtc-websocket-disconnector';
import { fromUint8Array } from 'js-base64';
import { DdocProps } from '../types';

interface UseYjsSetupArgs {
  onChange?: (
    updatedDocContent: string | JSONContent,
    updateChunk: string,
  ) => void;
  enableIndexeddbSync?: boolean;
  ddocId?: string;
  enableCollaboration?: boolean;
  onIndexedDbError?: (error: Error) => void;
  onCollabError?: DdocProps['onCollabError'];
  onCollaborationConnectCallback?: DdocProps['onCollaborationConnectCallback'];
  onCollaborationCommit?: DdocProps['onCollaborationCommit'];
  onFetchCommitContent?: DdocProps['onFetchCommitContent'];
  onCollabSessionTermination?: () => void;
  onUnMergedUpdates?: (state: boolean) => void;
}

export const useYjsSetup = ({
  onChange,
  enableIndexeddbSync,
  ddocId,
  enableCollaboration,
  onIndexedDbError,
  onCollabError,
  onCollaborationConnectCallback,
  onCollaborationCommit,
  onFetchCommitContent,
  onCollabSessionTermination,
  onUnMergedUpdates,
}: UseYjsSetupArgs) => {
  const [ydoc] = useState(new Y.Doc());

  const {
    connect,
    isReady,
    terminateSession,
    awareness,
    hasCollabContentInitialised,
    state: syncState,
  } = useSyncMachine({
    onError: onCollabError,
    ydoc,
    onCollaborationConnectCallback,
    onCollaborationCommit,
    onFetchCommitContent,
    onSessionTerminated: onCollabSessionTermination,
    onUnMergedUpdates,
    onLocalUpdate: onChange,
  });

  useRtcWebsocketDisconnector(syncState, enableCollaboration);

  const providerRef = useRef<IndexeddbPersistence | null>(null);

  const initialiseYjsIndexedDbProvider = useCallback(async () => {
    const provider = providerRef.current;
    if (provider) {
      await provider.destroy();
    }

    if (enableIndexeddbSync && ddocId) {
      try {
        const newProvider = new IndexeddbPersistence(ddocId, ydoc);
        await newProvider.whenSynced;
        providerRef.current = newProvider;
      } catch (error) {
        console.error('IndexedDB initialization failed:', error);
        onIndexedDbError?.(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
  }, [enableIndexeddbSync, ddocId, ydoc, onIndexedDbError]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (update: Uint8Array, origin: any) => {
      if (origin === 'self') return;
      onChange?.(
        fromUint8Array(Y.encodeStateAsUpdate(ydoc)),
        fromUint8Array(update),
      );
    };

    ydoc.on('update', handler);
    return () => {
      ydoc.off('update', handler);
    };
  }, [ydoc, onChange]);

  return {
    ydoc,
    onConnect: connect,
    isReady,
    terminateSession,
    awareness,
    hasCollabContentInitialised,
    initialiseYjsIndexedDbProvider,
    refreshYjsIndexedDbProvider: initialiseYjsIndexedDbProvider,
  };
};
