import { Sender } from 'xstate';
import {
  SocketStatusEnum,
  SyncMachineContext,
  SyncMachinEvent,
} from '../types';
import * as Y from 'yjs';
import { fromUint8Array, toUint8Array } from 'js-base64';
import { objectToFile } from '../utils/objectToFile';
import { uploadFileToIPFS } from '../utils/uploadFileToIPFS';
import { fetchIpfsJsonContent } from '../utils/fetchIpfsJsonContent';

export const syncMachineServices = {
  connectSocket: (context: SyncMachineContext) => {
    return async (send: Sender<SyncMachinEvent>) => {
      const { socketClient, roomId, username, onError } = context;

      if (!socketClient) {
        throw new Error('WebSocket has not been initialized');
      }

      await socketClient.init({
        roomId,
        username,
        onConnect: () => send({ type: 'SYNC_LATEST_COMMIT', data: null }),
        onDisconnect: () => send({ type: 'DISCONNECTED', data: null }),
        onWsEvent: (message) => {
          if (!message?.event_type) {
            throw new Error('Message is not an event');
          }
          send({ type: message.event_type, data: message });
        },
        onError: (e) => {
          console.log('error triggered by socket onError');
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
        const { socketClient, cryptoUtils } = context;
        const updateToSend = cryptoUtils.encryptData(
          toUint8Array(context.roomKey),
          nextUpdate,
        );
        const response = await socketClient?.sendUpdate({
          update: updateToSend,
        });
        const updateId = response?.data.id;
        return { updateId, queueOffset };
      }
    };
  },

  processCommit: (context: SyncMachineContext) => {
    return async (send: Sender<SyncMachinEvent>) => {
      console.log(context);
      if (context.uncommittedUpdatesIdList.length >= 10) {
        console.log(
          'commit is happening now >>>>',
          context.uncommittedUpdatesIdList,
        );
        const updates = context.uncommittedUpdatesIdList;

        const commitContent = {
          data: context.cryptoUtils.encryptData(
            toUint8Array(context.roomKey),
            Y.encodeStateAsUpdate(context.ydoc),
          ),
        };
        const file = objectToFile(commitContent, 'commit');
        const { ipfsHash } = await uploadFileToIPFS(file);
        console.log(ipfsHash, 'ipfsHash');
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
    return async () => {
      const latestCommit = await context.socketClient?.fetchLatestCommit();

      const history = latestCommit?.data.history[0];
      let decryptedCommit;
      if (history?.data) {
        const content = history.data;
        decryptedCommit = context.cryptoUtils.decryptData(
          toUint8Array(context.roomKey),
          content,
        );
      }
      const updates: Uint8Array[] = [];

      if (history?.cid) {
        const content = await fetchIpfsJsonContent(history?.cid);
        if (content?.data) {
          const decryptedContent = context.cryptoUtils.decryptData(
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
      // const lsContents =
      //  localStorage.getItem(context.roomId);
      const localUpdates: string[] = [];
      // lsContents ? JSON.parse(lsContents) : [];
      const machineInitialUpdate = context.initialUpdate;
      console.log('machine initial update', machineInitialUpdate);
      if (localUpdates.length > 0) {
        console.log('their are contents in local storage');
        const t = localUpdates.map((u: string) => toUint8Array(u));
        let merged: Uint8Array;
        if (machineInitialUpdate) {
          console.log('merging machine local state before connecting');
          merged = Y.mergeUpdates([...t, toUint8Array(machineInitialUpdate)]);
        } else {
          merged = Y.mergeUpdates(t);
        }

        updates.push(merged);
        unbroadcastedUpdate = fromUint8Array(merged);
      } else if (machineInitialUpdate) {
        console.log('we have machine machine initail update');
        updates.push(toUint8Array(machineInitialUpdate));
        unbroadcastedUpdate = machineInitialUpdate;
      }
      if (decryptedCommit) updates.push(decryptedCommit);
      if (encryptedUpdates.length > 0) {
        console.log('you have uncommitted chnages', encryptedUpdates.length);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        encryptedUpdates.forEach((encryptedUpdate: any) => {
          const data = context.cryptoUtils.decryptData(
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
        console.log('merged all >>>>>', updates.length);
      }
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

        const updateToSend = context.cryptoUtils.encryptData(
          toUint8Array(context.roomKey),
          toUint8Array(update),
        );
        const response = await context.socketClient?.sendUpdate({
          update: updateToSend,
        });
        const updateId = response?.data.id;
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
      console.log('trying to commit', { isNewDoc: context.isNewDoc });
      if (context.isNewDoc) return;
      console.log('committing ', context.uncommittedUpdatesIdList.length);
      const localContent = context.cryptoUtils.encryptData(
        toUint8Array(context.roomKey),
        Y.encodeStateAsUpdate(context.ydoc),
      );

      if (context.uncommittedUpdatesIdList.length >= 10) {
        // console.log(
        //   'commit changes after syning from IPFS. uncommittedChanges',
        //   context.uncommittedUpdatesIdList.length,
        // );
        const commitContent = {
          data: localContent,
        };
        const file = objectToFile(commitContent, 'commit');
        const { ipfsHash } = await uploadFileToIPFS(file);
        const updates = context.uncommittedUpdatesIdList;
        await context?.socketClient?.commitUpdates({
          updates,
          cid: ipfsHash,
        });
        // console.log('it should clear the UPDATES from commitLocalContents');
        send({ type: 'CLEAR_UNCOMMITED_UPDATES', data: null });
      }
      // console.log('should now broadcast user local comments');
      if (event.data.unbroadcastedUpdate) {
        console.log('broadcasting local updates');
        const encryptedUpdate = context.cryptoUtils.encryptData(
          toUint8Array(context.roomKey),
          toUint8Array(event.data.unbroadcastedUpdate),
        );
        const response = await context.socketClient?.sendUpdate({
          update: encryptedUpdate,
        });
        const updateId = response?.data.id;
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
