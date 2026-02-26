import { encodeAwarenessUpdate, type Awareness } from 'y-protocols/awareness';
import { toUint8Array } from 'js-base64';
import { crypto as cryptoUtils } from '../crypto';
import { debounce } from '../../utils/debounce';
import { SocketClient } from '../socketClient';

export const createAwarenessUpdateHandler = (
  awareness: Awareness,
  socketClient: SocketClient,
  roomKey: string,
) => {
  return debounce(
    ({
      added,
      updated,
      removed,
    }: {
      added: number[];
      updated: number[];
      removed: number[];
    }) => {
      const changedClients = added.concat(updated).concat(removed);
      const update = encodeAwarenessUpdate(awareness, changedClients);

      if (socketClient.isConnected) {
        const encryptedUpdate = cryptoUtils.encryptData(
          toUint8Array(roomKey),
          update,
        );
        socketClient.broadcastAwareness(encryptedUpdate);
      }
    },
    100,
  );
};
