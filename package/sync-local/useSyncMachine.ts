/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect } from 'react';
import syncMachine from './syncMachine';
import * as Y from 'yjs';
import { useSelector } from '@xstate/react';
import { SyncMachineContext } from '.';
import { fromUint8Array } from 'js-base64';
import { removeAwarenessStates } from 'y-protocols/awareness.js';
import { useMachine } from '@xstate-ninja/react';

export interface IConnectConf {
  username?: string;
  roomKey: string;
  roomId: string;
  isOwner: boolean;
  ownerEdSecret?: string;
  contractAddress?: string;
  ownerAddress?: string;
  isEns?: boolean;
  wsUrl: string;
  roomInfo?: {
    documentTitle: string;
    portalAddress: string;
    commentKey: string;
  };
}

const awarenessSelector = (state: any) => state.context.awareness;
const isReadySelector = (state: any) =>
  Boolean(state.context.isReady && state.context.awareness);

const isConnectedSelector = (state: any) => state.context.isConnected;

const errorMessageSelector = (state: any) => state.context.errorMessage;
const hasContentInitialisedSelector = (state: any) =>
  state.context.initalDocumentDecryptionState === 'done';

export const useSyncMachine = (config: Partial<SyncMachineContext>) => {
  const [state, send, actorRef] = useMachine(syncMachine, {
    context: {
      ...config,
    },
    devTools: true,
  });

  const awareness = useSelector(actorRef, awarenessSelector);
  const isReady = useSelector(actorRef, isReadySelector);
  const isConnected = useSelector(actorRef, isConnectedSelector);
  const error = useSelector(actorRef, errorMessageSelector);

  const hasCollabContentInitialised = useSelector(
    actorRef,
    hasContentInitialisedSelector,
  );

  const connect = useCallback(
    (connectConfig: IConnectConf) => {
      send({
        type: 'CONNECT',
        data: {
          initialUpdate: fromUint8Array(Y.encodeStateAsUpdate(config.ydoc!)),
          ...connectConfig,
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.ydoc],
  );

  const disconnect = useCallback(() => {
    send({
      type: 'DISCONNECT',
      data: {},
    });
  }, [send]);

  const terminateSession = useCallback(() => {
    send({
      type: 'TERMINATE_SESSION',
      data: {},
    });
  }, [send]);

  useEffect(() => {
    if (
      config.ydoc &&
      !awareness &&
      isConnected &&
      hasCollabContentInitialised
    ) {
      send({
        type: 'INIT_AWARENESS',
        data: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.ydoc, awareness, isConnected, hasCollabContentInitialised]);

  useEffect(() => {
    if (!isReady || !config.ydoc) return;

    const updateHandler = (update: any, origin: any) => {
      if (origin === 'self' || !isReady) return;
      if (config.onLocalUpdate && typeof config.onLocalUpdate === 'function') {
        config.onLocalUpdate(
          fromUint8Array(Y.encodeStateAsUpdate(config.ydoc!)),
          fromUint8Array(update),
        );
      }
      send({
        type: 'SEND_UPDATE',
        data: {
          update,
        },
      });
    };

    config.ydoc?.on('update', updateHandler);
    return () => {
      config.ydoc?.off('update', updateHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.ydoc, isReady]);

  useEffect(() => {
    if (!awareness) return;

    if (
      typeof window !== 'undefined' &&
      typeof window.addEventListener === 'function'
    ) {
      window.addEventListener('beforeunload', () => {
        removeAwarenessStates(
          awareness,
          [config.ydoc!.clientID],
          'window unload',
        );
      });
    }

    return () => {
      removeAwarenessStates(awareness, [config.ydoc!.clientID], 'hook unmount');
      awareness?.off('update');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awareness !== undefined]);

  return {
    connect,
    disconnect,
    isConnected,
    isReady,
    error,
    terminateSession,
    awareness,
    hasCollabContentInitialised,
    state,
  };
};
