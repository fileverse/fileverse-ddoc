/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo } from 'react';
import syncMachine from './syncMachine';
import * as Y from 'yjs';

import { useMachine, useSelector } from '@xstate/react';
import { SyncMachineContext } from '.';
import { fromUint8Array, toUint8Array } from 'js-base64';

const contextSelector = (state: any) => state.context;

const useSyncMachine = (config: Partial<SyncMachineContext>) => {
  // const yAwarenessRef = useRef<Awareness>(new Awareness(ydoc!));

  const [state, send, actorRef] = useMachine(syncMachine, {
    context: {
      ...config,
    },
  });

  const context = useSelector(actorRef, contextSelector);

  const { awareness, isConnected } = state.context;

  const connect = useCallback(
    (username: string, roomKey: string, roomId: string, isOwner: boolean) => {
      send({
        type: 'CONNECT',
        data: {
          username,
          initialUpdate: fromUint8Array(Y.encodeStateAsUpdate(config.ydoc!)),
          roomKey,
          roomId,
          isOwner,
        },
      });
    },
    [send, state, config.ydoc],
  );

  const disconnect = useCallback(() => {
    send({
      type: 'DISCONNECT',
      data: {},
    });
  }, [send]);

  const machine = useMemo(() => [state, send], [state, send]);

  // console.log(context);

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
    // ydoc,
    isReady,
    getYjsEncodedState,
    applyYjsEncodedState,
    error,
    context,
  };
};

export default useSyncMachine;
