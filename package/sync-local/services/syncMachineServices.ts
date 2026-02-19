import { Sender } from 'xstate';
import {
  SocketStatusEnum,
  SyncMachineContext,
  SyncMachinEvent,
} from '../types';
import * as Y from 'yjs';
import { fromUint8Array, toUint8Array } from 'js-base64';
import { objectToFile } from '../utils/objectToFile';

import { crypto as cryptoUtils } from '../crypto';

export const syncMachineServices = {
  connectSocket: (context: SyncMachineContext) => {
    return async (send: Sender<SyncMachinEvent>) => {
      const { socketClient, roomId, onError } = context;

      if (!socketClient) {
        throw new Error('WebSocket has not been initialized');
      }

      await socketClient.init({
        roomId,
        onConnect: () => {
          send({ type: 'SYNC_LATEST_COMMIT', data: null });
        },
        onDisconnect: () => send({ type: 'DISCONNECTED', data: null }),
        onHandShakeError: (e) => {
          send({ type: 'DISCONNECT', data: { error: 'Network error' } });
          onError?.(e);
        },
        onContentUpdate: (payload) => {
          send({
            type: 'CONTENT_UPDATE',
            data: { event: { data: payload } },
          });
        },
        onMembershipChange: (payload) => {
          send({ type: 'ROOM_MEMBERSHIP_CHANGE', data: payload });
        },
        onSessionTerminated: () => {
          send({ type: 'SESSION_TERMINATED', data: null });
        },
        onError: (e) => {
          console.log('error triggered by socket onError', e);
          send({ type: 'DISCONNECT', data: { error: 'Network error' } });
          onError?.(e);
        },
      });
    };
  },

  disconnectSocket: (context: SyncMachineContext) => {
    return async () => {
      const { socketClient, awareness, _awarenessUpdateHandler } = context;

      if (socketClient?._webSocketStatus === SocketStatusEnum.CONNECTED) {
        socketClient.disconnect();
      }
      awareness?.off('update', _awarenessUpdateHandler);
    };
  },

  processNextUpdate: (context: SyncMachineContext) => {
    return async () => {
      if (context.updateQueue.length > 0 && context.roomKey) {
        const queueOffset = context.updateQueue.length;
        const nextUpdate = Y.mergeUpdates(context.updateQueue);
        const { socketClient } = context;
        const updateToSend = cryptoUtils.encryptData(
          toUint8Array(context.roomKey),
          nextUpdate,
        );
        const response = await socketClient?.sendUpdate({
          update: updateToSend,
        });
        const updateId = response?.data?.id;
        return { updateId, queueOffset };
      }
    };
  },

  processCommit: (context: SyncMachineContext) => {
    return async (send: Sender<SyncMachinEvent>) => {
      if (
        !context.onCollaborationCommit ||
        typeof context.onCollaborationCommit !== 'function'
      ) {
        console.debug(
          'syncmachine: no commit function provided, skipping commit',
        );
        return;
      }
      if (context.uncommittedUpdatesIdList.length >= 10) {
        console.debug(
          'syncmachine: committing updates',
          context.uncommittedUpdatesIdList.length,
        );
        const updates = context.uncommittedUpdatesIdList;

        const commitContent = {
          data: cryptoUtils.encryptData(
            toUint8Array(context.roomKey),
            Y.encodeStateAsUpdate(context.ydoc),
          ),
        };
        const file = objectToFile(commitContent, 'commit');
        if (typeof context.onCollaborationCommit !== 'function') {
          console.log(
            'syncmachine: no commit function provided, skipping commit',
          );
          return;
        }
        const ipfsHash = await context.onCollaborationCommit(file);
        const response = await context?.socketClient?.commitUpdates({
          updates,
          cid: ipfsHash,
        });

        if (!response?.status) return;

        send({ type: 'CLEAR_UNCOMMITED_UPDATES', data: null });
      }
    };
  },
  syncLatestCommitFromIpfs: (context: SyncMachineContext) => {
    return async (send: Sender<SyncMachinEvent>) => {
      const latestCommit = await context.socketClient?.fetchLatestCommit();

      const history = latestCommit?.data.history[0];
      let decryptedCommit;
      if (history?.data) {
        const content = history.data;
        decryptedCommit = cryptoUtils.decryptData(
          toUint8Array(context.roomKey),
          content,
        );
      }
      const updates: Uint8Array[] = [];

      if (history?.cid) {
        const content = await context.onFetchCommitContent(history?.cid);
        if (content?.data) {
          const decryptedContent = cryptoUtils.decryptData(
            toUint8Array(context.roomKey),
            content.data,
          );
          updates.push(decryptedContent);
        }
      }

      const uncommittedChanges =
        await context.socketClient?.getUncommittedChanges();
      const encryptedUpdates = uncommittedChanges?.data.history;
      const uncommittedChangesId: string[] = [];
      let unbroadcastedUpdate = null;

      const localUpdates: string[] = [];
      const machineInitialUpdate = context.initialUpdate;

      if (localUpdates.length > 0) {
        const t = localUpdates.map((u: string) => toUint8Array(u));
        let merged: Uint8Array;
        if (machineInitialUpdate) {
          merged = Y.mergeUpdates([...t, toUint8Array(machineInitialUpdate)]);
        } else {
          merged = Y.mergeUpdates(t);
        }

        updates.push(merged);
        unbroadcastedUpdate = fromUint8Array(merged);
      } else if (machineInitialUpdate) {
        updates.push(toUint8Array(machineInitialUpdate));
        unbroadcastedUpdate = machineInitialUpdate;
      }
      if (decryptedCommit) updates.push(decryptedCommit);
      if (encryptedUpdates.length > 0) {
        if (
          context.isOwner &&
          typeof context.onUnMergedUpdates === 'function'
        ) {
          context.onUnMergedUpdates(true);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        encryptedUpdates.forEach((encryptedUpdate: any) => {
          const data = cryptoUtils.decryptData(
            toUint8Array(context.roomKey),
            encryptedUpdate.data,
          );
          uncommittedChangesId.push(encryptedUpdate.id);
          updates.push(data);
        });
      }

      if (updates.length) {
        const mergedState = Y.mergeUpdates(updates);
        Y.applyUpdate(context.ydoc, mergedState, 'self');
      }
      if (context.isOwner && typeof context.onUnMergedUpdates === 'function') {
        context.onUnMergedUpdates(false);
      }
      send({ type: 'SET_DOCUMENT_DECRYPTION_STATE', data: 'done' });
      return {
        ids: uncommittedChangesId,
        unbroadcastedUpdate,
      };
    };
  },
  broadcastLocalContents: (
    context: SyncMachineContext,
    event: SyncMachinEvent,
  ) => {
    return async () => {
      if (event.data.unbroadcastedUpdate) {
        const update = event.data.unbroadcastedUpdate;

        const updateToSend = cryptoUtils.encryptData(
          toUint8Array(context.roomKey),
          toUint8Array(update),
        );
        const response = await context.socketClient?.sendUpdate({
          update: updateToSend,
        });
        const updateId = response?.data?.id;
        return !!updateId;
      } else {
        return true;
      }
    };
  },
  commitLocalContents: (
    context: SyncMachineContext,
    event: SyncMachinEvent,
  ) => {
    return async (send: Sender<SyncMachinEvent>) => {
      if (context.isNewDoc) return;

      const localContent = cryptoUtils.encryptData(
        toUint8Array(context.roomKey),
        Y.encodeStateAsUpdate(context.ydoc),
      );

      if (context.uncommittedUpdatesIdList.length >= 10) {
        const commitContent = {
          data: localContent,
        };
        const file = objectToFile(commitContent, 'commit');
        if (typeof context.onCollaborationCommit !== 'function') {
          console.log(
            'syncmachine: no commit function provided, skipping commit',
          );
          return;
        }
        const ipfsHash = await context.onCollaborationCommit(file);
        const updates = context.uncommittedUpdatesIdList;
        await context?.socketClient?.commitUpdates({
          updates,
          cid: ipfsHash,
        });
        send({ type: 'CLEAR_UNCOMMITED_UPDATES', data: null });
      }
      if (event.data.unbroadcastedUpdate) {
        const encryptedUpdate = cryptoUtils.encryptData(
          toUint8Array(context.roomKey),
          toUint8Array(event.data.unbroadcastedUpdate),
        );
        const response = await context.socketClient?.sendUpdate({
          update: encryptedUpdate,
        });
        const updateId = response?.data?.id;
        return updateId;
      }
    };
  },
  verifyConnectionState: (context: SyncMachineContext) => {
    return async (send: Sender<SyncMachinEvent>) => {
      if (!context.isConnected) {
        send({ type: 'DISCONNECT', data: null });
      }
      return;
    };
  },
};
