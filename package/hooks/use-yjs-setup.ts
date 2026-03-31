import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useSyncManager } from '../sync-local/useSyncManager';
import { fromUint8Array } from 'js-base64';
import {
  CollaborationProps,
  CollabServices,
  CollabCallbacks,
} from '../sync-local/types';
import {
  EDITOR_CONTENT_CHANGE,
  EditorChangeMetadata,
  INDEXEDDB_REHYDRATION_CHANGE,
} from '../editor-change-metadata';
import { DdocProps } from '../types';

interface UseYjsSetupArgs {
  onChange?: DdocProps['onChange'];
  enableIndexeddbSync?: boolean;
  ddocId?: string;
  collaboration?: CollaborationProps;
  onIndexedDbError?: (error: Error) => void;
}

export const useYjsSetup = ({
  onChange,
  enableIndexeddbSync,
  ddocId,
  collaboration,
  onIndexedDbError,
}: UseYjsSetupArgs) => {
  const [ydoc] = useState(new Y.Doc());
  const [isIndexeddbSynced, setIsIndexeddbSynced] =
    useState(!enableIndexeddbSync);

  const collabEnabled = collaboration?.enabled === true;
  const services: CollabServices | undefined = collabEnabled
    ? collaboration.services
    : undefined;
  const callbacks: CollabCallbacks | undefined = collabEnabled
    ? collaboration.on
    : undefined;

  const {
    connect,
    isReady,
    isSyncing,
    terminateSession,
    awareness,
    hasCollabContentInitialised,
    state: collabState,
  } = useSyncManager({
    ydoc,
    services,
    callbacks,
    onLocalUpdate: onChange,
  });

  const yjsIndexeddbProviderRef = useRef<IndexeddbPersistence | null>(null);

  const initialiseYjsIndexedDbProvider = useCallback(async () => {
    const provider = yjsIndexeddbProviderRef.current;
    if (provider) {
      await provider.destroy();
    }
    if (enableIndexeddbSync && ddocId) {
      setIsIndexeddbSynced(false);
      try {
        const newYjsIndexeddbProvider = new IndexeddbPersistence(ddocId, ydoc);
        // Capture the provider before sync resolves so origin checks can detect IndexedDB replay.
        yjsIndexeddbProviderRef.current = newYjsIndexeddbProvider;
        // Wait for the database to be ready and synced
        await newYjsIndexeddbProvider.whenSynced;
        setIsIndexeddbSynced(true);
      } catch (error) {
        console.error('IndexedDB initialization failed:', error);
        yjsIndexeddbProviderRef.current = null;
        setIsIndexeddbSynced(true);
        onIndexedDbError?.(
          error instanceof Error ? error : new Error(String(error)),
        );
        // Don't rethrow - allow editor to continue without persistence
      }
    } else {
      setIsIndexeddbSynced(true);
    }
  }, [enableIndexeddbSync, ddocId, ydoc, onIndexedDbError]);

  const onChangeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pendingChangeMetaRef = useRef<EditorChangeMetadata>(
    EDITOR_CONTENT_CHANGE,
  );

  // Immediately flush any pending debounced onChange.
  // Call this after critical structural changes (tab create/delete/rename/reorder)
  // to ensure persistence happens before a potential page refresh.
  const flushPendingUpdate = useCallback(
    (changeMeta: EditorChangeMetadata = EDITOR_CONTENT_CHANGE) => {
      if (onChangeDebounceRef.current) {
        clearTimeout(onChangeDebounceRef.current);
        onChangeDebounceRef.current = null;
      }
      onChange?.(fromUint8Array(Y.encodeStateAsUpdate(ydoc)), '', changeMeta);
    },
    [ydoc, onChange],
  );

  const getChangeMeta = useCallback((origin: unknown): EditorChangeMetadata => {
    // Classify IndexedDB replay separately so refresh does not look like a first edit.
    if (
      yjsIndexeddbProviderRef.current &&
      origin === yjsIndexeddbProviderRef.current
    ) {
      return INDEXEDDB_REHYDRATION_CHANGE;
    }

    return EDITOR_CONTENT_CHANGE;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (update: Uint8Array, origin: any) => {
      if (origin === 'self') return;
      const chunk = fromUint8Array(update);
      pendingChangeMetaRef.current = getChangeMeta(origin);

      // Debounce the expensive full-state encoding.
      // The incremental chunk is tiny and fires immediately via the second arg.
      // The full Y.Doc encoding (first arg) is O(n) and only needed for
      // persistence — batching it avoids encoding on every keystroke.
      if (onChangeDebounceRef.current) {
        clearTimeout(onChangeDebounceRef.current);
      }
      onChangeDebounceRef.current = setTimeout(() => {
        onChangeDebounceRef.current = null;
        // Forward change metadata so the consumer can decide whether to sync this update.
        onChange?.(
          fromUint8Array(Y.encodeStateAsUpdate(ydoc)),
          chunk,
          pendingChangeMetaRef.current,
        );
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
  }, [getChangeMeta, onChange, ydoc]);

  return {
    ydoc,
    onConnect: connect,
    isReady,
    isSyncing,
    terminateSession,
    awareness,
    hasCollabContentInitialised,
    isIndexeddbSynced,
    initialiseYjsIndexedDbProvider,
    refreshYjsIndexedDbProvider: initialiseYjsIndexedDbProvider,
    flushPendingUpdate,
    collabState,
  };
};
