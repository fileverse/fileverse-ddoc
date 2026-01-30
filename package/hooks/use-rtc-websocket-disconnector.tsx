import { useEffect, useRef } from 'react';
import { SocketStatusEnum } from '../sync-local/types';

export const useRtcWebsocketDisconnector = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  syncState: any,
  enableCollaboration: boolean | undefined,
) => {
  const shouldDisconnectRef = useRef<boolean | undefined>(false);
  shouldDisconnectRef.current = enableCollaboration;
  const stateRef = useRef<null | typeof syncState>(null);
  stateRef.current = syncState;
  useEffect(() => {
    return () => {
      if (shouldDisconnectRef.current && stateRef.current) {
        const { socketClient, awareness, _awarenessUpdateHandler } =
          stateRef.current.context;
        if (socketClient?._webSocketStatus === SocketStatusEnum.CONNECTED) {
          socketClient.disconnect('Socket disconnected by user', 1000);
        }
        awareness?.off('update', _awarenessUpdateHandler);
      }
    };
  }, []);
};
