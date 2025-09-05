/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo } from 'react';
import syncMachine from './syncMachine';
import * as Y from 'yjs';

import { useMachine, useSelector } from '@xstate/react';
import { SyncMachineContext } from '.';
import { fromUint8Array, toUint8Array } from 'js-base64';
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
  extraInfo?: {
    documentTitle: string;
    portalAddress: string;
    commentKey: string;
  };
}

const contextSelector = (state: any) => state.context;

export const useSyncMachine = (config: Partial<SyncMachineContext>) => {
  const [state, send, actorRef] = useMachine(syncMachine, {
    context: {
      ...config,
    },
  });

  const context = useSelector(actorRef, contextSelector);

  const { awareness, isConnected } = state.context;

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
    [send, config.ydoc !== undefined],
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

  const machine = useMemo(() => [state, send], [state, send]);

  const isReady = useMemo(() => {
    return !!(state.context.isReady && state.context.awareness);
  }, [state.context.isReady, state.context.awareness]);

  useEffect(() => {
    if (config.ydoc && !awareness && isConnected) {
      send({
        type: 'INIT_AWARENESS',
        data: null,
      });
    }
  }, [config.ydoc, awareness, isConnected, send]);

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
  }, [config.ydoc, isReady, send]);

  const getYjsEncodedState = useCallback(() => {
    return fromUint8Array(Y.encodeStateAsUpdate(config.ydoc!));
  }, [config.ydoc]);

  const applyYjsEncodedState = useCallback(
    (update: string) => {
      if (!update) return;
      Y.applyUpdate(config.ydoc!, toUint8Array(update));
    },
    [config.ydoc],
  );

  const error = useMemo(() => {
    if (state.context.errorCount > 0) {
      return {
        message: state.context.errorMessage,
      };
    }
    return null;
  }, [state.context.errorCount, state.context.errorMessage]);

  return {
    machine,
    connect,
    disconnect,
    isConnected,
    isReady,
    getYjsEncodedState,
    applyYjsEncodedState,
    error,
    context,
    terminateSession,
  };
};
