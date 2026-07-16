/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react';
import { removeAwarenessStates } from 'y-protocols/awareness.js';

import { SyncManager } from './SyncManager';
import {
  SyncManagerConfig,
  CollabConnectionConfig,
  CollabState,
} from './types';

const INITIAL_STATE: CollabState = { status: 'idle' };

export const useSyncManager = (config: SyncManagerConfig) => {
  const [collabState, setCollabState] = useState<CollabState>(INITIAL_STATE);

  const managerRef = useRef<SyncManager | null>(null);
  const hasReachedReadyRef = useRef(false);

  if (!managerRef.current) {
    managerRef.current = new SyncManager(config, setCollabState);
  }

  const manager = managerRef.current;

  // Keep refs fresh on every render to prevent stale closures
  manager.updateRefs(config.services, config.callbacks, config.onLocalUpdate);

  const isConnected = manager.isConnected;
  const awareness = manager.awareness;

  // Local ydoc update listener — use isConnected (covers ready, syncing,
  // reconnecting) so local edits are queued during reconnection instead of
  // being dropped.  enqueueLocalUpdate only processes the queue when status
  // is 'ready', so queued updates are held safely until then.
  useEffect(() => {
    if (!isConnected || !config.ydoc) return;

    const updateHandler = (update: Uint8Array, origin: any) => {
      if (origin === 'self' || origin === 'remote' || !manager.isConnected)
        return;
      // Skip origins from external providers (e.g. y-indexeddb).
      // Guard against ref.current being null — otherwise a default-origin
      // transact (origin === null) would collide with an uninitialised
      // provider ref in collab mode and get filtered out.
      if (
        config.ignoredOrigins?.some(
          (ref) => ref.current !== null && ref.current === origin,
        )
      )
        return;
      manager.enqueueLocalUpdate(update);
    };

    config.ydoc.on('update', updateHandler);
    return () => {
      config.ydoc.off('update', updateHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.ydoc, isConnected]);

  // Awareness cleanup — on unmount + beforeunload
  useEffect(() => {
    if (!awareness) return;

    const beforeUnloadHandler = () => {
      removeAwarenessStates(awareness, [config.ydoc.clientID], 'window unload');
    };

    if (
      typeof window !== 'undefined' &&
      typeof window.addEventListener === 'function'
    ) {
      window.addEventListener('beforeunload', beforeUnloadHandler);
    }

    return () => {
      removeAwarenessStates(awareness, [config.ydoc.clientID], 'hook unmount');
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

  // Hard tab-close: beacon the last pending edits (local y-indexeddb covers same-device
  // reopen; this closes the cross-device tail). pagehide fires on mobile/bfcache where
  // beforeunload does not.
  useEffect(() => {
    const onPageHide = () => {
      managerRef.current?.fireBeacon();
    };
    if (
      typeof window !== 'undefined' &&
      typeof window.addEventListener === 'function'
    ) {
      window.addEventListener('pagehide', onPageHide);
    }
    return () => {
      if (
        typeof window !== 'undefined' &&
        typeof window.removeEventListener === 'function'
      ) {
        window.removeEventListener('pagehide', onPageHide);
      }
    };
  }, []);

  const connect = useCallback(
    (connectConfig: CollabConnectionConfig) => {
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

  const updateTitle = useCallback(
    (args: { encryptedTitle: string; documentTitle: string }) => {
      manager.updateTitle(args).catch((err) => {
        console.error('useSyncManager: updateTitle failed', err);
      });
    },
    [manager],
  );

  const isSyncing = collabState.status === 'syncing';
  const isReady = collabState.status === 'ready' && !!awareness;

  if (collabState.status === 'idle' || collabState.status === 'connecting') {
    hasReachedReadyRef.current = false;
  } else if (collabState.status === 'ready') {
    hasReachedReadyRef.current = true;
  }

  // Reconnecting can now happen during initial sync, before content has loaded.
  // Only treat reconnecting as initialized after this connection reached ready.
  const hasCollabContentInitialised =
    collabState.status === 'ready' ||
    (collabState.status === 'reconnecting' && hasReachedReadyRef.current);

  return {
    state: collabState,
    connect,
    disconnect,
    terminateSession,
    updateTitle,
    isReady,
    isSyncing,
    awareness,
    hasCollabContentInitialised,
  };
};
