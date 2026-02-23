import { useState, useEffect, useRef } from 'react';
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

  const yjsIndexeddbProviderRef = useRef<IndexeddbPersistence | null>(null);

  const initialiseYjsIndexedDbProvider = async () => {
    const provider = yjsIndexeddbProviderRef.current;
    if (provider) {
      await provider.destroy();
    }
    if (enableIndexeddbSync && ddocId) {
      try {
        const newYjsIndexeddbProvider = new IndexeddbPersistence(ddocId, ydoc);
        // Wait for the database to be ready and synced
        await newYjsIndexeddbProvider.whenSynced;
        yjsIndexeddbProviderRef.current = newYjsIndexeddbProvider;
      } catch (error) {
        console.error('IndexedDB initialization failed:', error);
        onIndexedDbError?.(
          error instanceof Error ? error : new Error(String(error)),
        );
        // Don't rethrow - allow editor to continue without persistence
      }
    }
  };

  const onChangeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (update: Uint8Array, origin: any) => {
      if (origin === 'self') return;
      const chunk = fromUint8Array(update);

      // Debounce the expensive full-state encoding.
      // The incremental chunk is tiny and fires immediately via the second arg.
      // The full Y.Doc encoding (first arg) is O(n) and only needed for
      // persistence — batching it avoids encoding on every keystroke.
      if (onChangeDebounceRef.current) {
        clearTimeout(onChangeDebounceRef.current);
      }
      onChangeDebounceRef.current = setTimeout(() => {
        onChangeDebounceRef.current = null;
        onChange?.(fromUint8Array(Y.encodeStateAsUpdate(ydoc)), chunk);
      }, 300);
    };
    if (ydoc) {
      ydoc.on('update', handler);
    }
    return () => {
      ydoc?.off('update', handler);
      if (onChangeDebounceRef.current) {
        clearTimeout(onChangeDebounceRef.current);
      }
    };
  }, [ydoc]);

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
