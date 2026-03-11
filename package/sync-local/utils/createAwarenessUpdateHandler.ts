import { encodeAwarenessUpdate, type Awareness } from 'y-protocols/awareness';
import { toUint8Array } from 'js-base64';
import { crypto as cryptoUtils } from '../crypto';
import { SocketClient } from '../socketClient';

export const createAwarenessUpdateHandler = (
  awareness: Awareness,
  socketClient: SocketClient,
  roomKey: string,
) => {
  let pending: number[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  const THROTTLE_MS = 50;

  const flush = () => {
    timer = null;
    if (pending.length === 0) return;

    const clients = pending;
    pending = [];

    const update = encodeAwarenessUpdate(awareness, clients);
    if (socketClient.isConnected) {
      const encryptedUpdate = cryptoUtils.encryptData(
        toUint8Array(roomKey),
        update,
      );
      socketClient.broadcastAwareness(encryptedUpdate);
    }
  };

  return (
    {
      added,
      updated,
      removed,
    }: { added: number[]; updated: number[]; removed: number[] },
    origin: any,
  ) => {
    // Only broadcast local awareness changes (skip remote echoes)
    if (origin === 'remote') return;

    const changedClients = added.concat(updated).concat(removed);
    // Accumulate unique client IDs across throttle window
    for (const id of changedClients) {
      if (!pending.includes(id)) pending.push(id);
    }

    // Leading + trailing throttle
    if (!timer) {
      flush(); // Send immediately (leading edge)
      timer = setTimeout(flush, THROTTLE_MS); // Also send trailing
    }
  };
};
