/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { removeAwarenessStates } from 'y-protocols/awareness.js';

import { SyncManager } from './SyncManager';
import {
  SyncManagerConfig,
  SyncManagerSnapshot,
  SyncStatus,
  ConnectConfig,
} from './types';

const INITIAL_SNAPSHOT: SyncManagerSnapshot = {
  status: SyncStatus.DISCONNECTED,
  isConnected: false,
  isReady: false,
  errorMessage: '',
  awareness: null,
  initialDocumentDecryptionState: 'pending',
};

function snapshotReducer(
  prev: SyncManagerSnapshot,
  next: SyncManagerSnapshot,
): SyncManagerSnapshot {
  if (
    prev.status === next.status &&
    prev.isConnected === next.isConnected &&
    prev.isReady === next.isReady &&
    prev.errorMessage === next.errorMessage &&
    prev.awareness === next.awareness &&
    prev.initialDocumentDecryptionState === next.initialDocumentDecryptionState
  ) {
    return prev;
  }
  return next;
}

export const useSyncManager = (config: SyncManagerConfig) => {
  const [snapshot, dispatch] = useReducer(snapshotReducer, INITIAL_SNAPSHOT);

  const managerRef = useRef<SyncManager | null>(null);

  if (!managerRef.current) {
    managerRef.current = new SyncManager(config, dispatch);
  }

  const manager = managerRef.current;

  const {
    status,
    isConnected,
    isReady,
    errorMessage,
    awareness,
    initialDocumentDecryptionState,
  } = snapshot;


  const hasCollabContentInitialised = initialDocumentDecryptionState === 'done';

  // Awareness init — when connected and content has been initialised
  useEffect(() => {
    if (
      config.ydoc &&
      !awareness &&
      isConnected &&
      hasCollabContentInitialised
    ) {
      manager.initializeAwareness();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.ydoc, awareness, isConnected, hasCollabContentInitialised]);

  // Local ydoc update listener — when ready, listen for ydoc update events
  useEffect(() => {
    if (!isReady || !config.ydoc) return;

    const updateHandler = (update: Uint8Array, origin: any) => {
      if (origin === 'self' || !isReady) return;
      manager.enqueueLocalUpdate(update);
    };

    config.ydoc.on('update', updateHandler);
    return () => {
      config.ydoc.off('update', updateHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.ydoc, isReady]);

  // Awareness cleanup — on unmount + beforeunload
  useEffect(() => {
    if (!awareness) return;

    const beforeUnloadHandler = () => {
      removeAwarenessStates(
        awareness,
        [config.ydoc.clientID],
        'window unload',
      );
    };

    if (
      typeof window !== 'undefined' &&
      typeof window.addEventListener === 'function'
    ) {
      window.addEventListener('beforeunload', beforeUnloadHandler);
    }

    return () => {
      removeAwarenessStates(
        awareness,
        [config.ydoc.clientID],
        'hook unmount',
      );
      if (
        typeof window !== 'undefined' &&
        typeof window.removeEventListener === 'function'
      ) {
        window.removeEventListener('beforeunload', beforeUnloadHandler);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awareness !== undefined]);

  // Force cleanup on unmount (replaces useRtcWebsocketDisconnector)
  useEffect(() => {
    return () => {
      managerRef.current?.forceCleanup();
    };
  }, []);

  const connect = useCallback(
    (connectConfig: ConnectConfig) => {
      manager.connect(connectConfig).catch((err) => {
        console.error('useSyncManager: connect failed', err);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.ydoc],
  );

  const disconnect = useCallback(() => {
    manager.disconnect();
  }, [manager]);

  const terminateSession = useCallback(() => {
    manager.terminateSession();
  }, [manager]);

  return {
    connect,
    disconnect,
    terminateSession,
    isConnected,
    isReady: isReady && !!awareness,
    error: errorMessage,
    awareness,
    hasCollabContentInitialised,
    status,
  };
};
