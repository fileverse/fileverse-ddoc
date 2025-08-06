/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo } from 'react';
import syncMachine from './syncMachine';
import * as Y from 'yjs';
import { useMachine } from '@xstate/react';
import { SyncMachineContext } from '.';
import { fromUint8Array, toUint8Array } from 'js-base64';

const useSyncMachine = (props: Partial<SyncMachineContext>) => {
  // const [ydoc] = useState(props.ydoc);
  const [state, send] = useMachine(syncMachine, {
    context: {
      ...props,
      // ydoc,
    },
  });

  const { awareness, isConnected } = state.context;

  const connect = useCallback(
    (username: string, roomKey: CryptoKey) => {
      console.log(
        'Calling connect function',
        fromUint8Array(Y.encodeStateAsUpdate(props.ydoc!)),
        '<<<<< initial update',
      );
      send({
        type: 'CONNECT',
        data: {
          username,
          initialUpdate: fromUint8Array(Y.encodeStateAsUpdate(props.ydoc!)),
          roomKey,
        },
      });
    },
    [send, state],
  );

  const disconnect = useCallback(() => {
    send({
      type: 'DISCONNECT',
      data: {},
    });
  }, [send]);

  const machine = useMemo(() => [state, send], [state, send]);

  console.log(state.context, 'state.context');

  const isReady = useMemo(() => {
    return !!(state.context.isReady && state.context.awareness);
  }, [state.context.isReady, state.context.awareness]);

  useEffect(() => {
    if (props.ydoc && !awareness && state.context.isConnected) {
      send({
        type: 'INIT_AWARENESS',
        data: null,
      });
    }
  }, [props.ydoc, awareness, isConnected, send]);

  useEffect(() => {
    if (!isReady || !props.ydoc) return;
    const updateHandler = (update: any, origin: any) => {
      if (origin === 'self') return;
      send({
        type: 'SEND_UPDATE',
        data: {
          update,
        },
      });
    };

    props.ydoc?.on('update', updateHandler);
    return () => {
      props.ydoc?.off('update', updateHandler);
    };
  }, [props.ydoc, isReady, send]);

  const getYjsEncodedState = useCallback(() => {
    return fromUint8Array(Y.encodeStateAsUpdate(props.ydoc!));
  }, [props.ydoc]);

  const applyYjsEncodedState = useCallback(
    (update: string) => {
      if (!update) return;
      Y.applyUpdate(props.ydoc!, toUint8Array(update));
    },
    [props.ydoc],
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
  };
};

export default useSyncMachine;
