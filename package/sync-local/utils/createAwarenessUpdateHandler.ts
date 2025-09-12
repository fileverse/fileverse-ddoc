import { encodeAwarenessUpdate, type Awareness } from 'y-protocols/awareness';
import { SyncMachineContext } from '../types';
import { toUint8Array } from 'js-base64';
import { crypto as cryptoUtils } from '../crypto';

export const createAwarenessUpdateHandler = (
  awareness: Awareness,
  context: SyncMachineContext,
) => {
  return ({
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

    if (context.isConnected && context.socketClient) {
      const encryptedUpdate = cryptoUtils.encryptData(
        toUint8Array(context.roomKey),
        update,
      );
      context.socketClient.broadcastAwareness(encryptedUpdate);
    }
  };
};
