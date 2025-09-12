/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect } from 'react';
import syncMachine from './syncMachine';
import * as Y from 'yjs';

import { useMachine, useSelector } from '@xstate/react';
import { SyncMachineContext } from '.';
import { fromUint8Array, toUint8Array } from 'js-base64';
import { removeAwarenessStates } from 'y-protocols/awareness.js';
// import { Awareness } from 'y-protocols/awareness.js';
// import uuid from 'react-uuid';
interface IConnectConf {
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

// const contextSelector = (state: any) => state.context;

const awarenessSelector = (state: any) => state.context.awareness;
const isReadySelector = (state: any) =>
  state.context.isReady && state.context.awareness;

const isConnectedSelector = (state: any) => state.context.isConnected;

const errorMessageSelector = (state: any) => state.context.errorMessage;

export const useSyncMachine = (config: Partial<SyncMachineContext>) => {
  const [, send, actorRef] = useMachine(syncMachine, {
    context: {
      ...config,
    },
  });

  const awareness = useSelector(actorRef, awarenessSelector);
  const isReady = useSelector(actorRef, isReadySelector);
  const isConnected = useSelector(actorRef, isConnectedSelector);
  const error = useSelector(actorRef, errorMessageSelector);

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
    [config.ydoc !== undefined],
  );

  const disconnect = useCallback(() => {
    send({
      type: 'DISCONNECT',
      data: {},
    });
  }, []);

  const terminateSession = useCallback(() => {
    send({
      type: 'TERMINATE_SESSION',
      data: {},
    });
  }, []);

  useEffect(() => {
    if (config.ydoc && !awareness && isConnected) {
      send({
        type: 'INIT_AWARENESS',
        data: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.ydoc !== undefined, awareness !== undefined, isConnected]);

  useEffect(() => {
    if (!isReady || !config.ydoc) return;

    const updateHandler = (update: any, origin: any) => {
      if (origin === 'self') return;
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
  }, [config.ydoc !== undefined, isReady]);

  const getYjsEncodedState = useCallback(() => {
    return fromUint8Array(Y.encodeStateAsUpdate(config.ydoc!));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.ydoc !== undefined]);

  const applyYjsEncodedState = useCallback(
    (update: string) => {
      if (!update) return;
      Y.applyUpdate(config.ydoc!, toUint8Array(update));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.ydoc !== undefined],
  );

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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awareness]);

  return {
    connect,
    disconnect,
    isConnected,
    isReady,
    getYjsEncodedState,
    applyYjsEncodedState,
    error,
    terminateSession,
    awareness,
  };
};
