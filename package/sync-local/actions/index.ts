/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { SyncMachineContext, SyncMachinEvent } from '../types';
import * as awarenessProtocol from 'y-protocols/awareness';

import { fromUint8Array, toUint8Array } from 'js-base64';
import { applyUpdate, encodeStateAsUpdate, mergeUpdates } from 'yjs';
import { createAwarenessUpdateHandler } from '../utils/createAwarenessUpdateHandler';
import { SocketClient } from '../socketClient';
import { crypto as cryptoUtils } from '../crypto';

export const initAwarenessHandler = (context: SyncMachineContext) => {
  const awareness = new awarenessProtocol.Awareness(context.ydoc);
  const handler = createAwarenessUpdateHandler(
    awareness,
    context.socketClient!,
    context.roomKey,
  );
  awareness.on('update', handler);
  context.socketClient?.registerAwareness(awareness);
  return { awareness, _awarenessUpdateHandler: handler };
};

export const updateConnectionStateHandler = (context: SyncMachineContext) => {
  const isConnected = context.socketClient?.isConnected ?? false;
  return {
    isConnected,
  };
};

export const websocketInitializer = (
  context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  if (!event.data.wsUrl) {
    throw new Error('sync-machine: wss url is not provided');
  }
  if (!event.data.roomKey) {
    throw new Error('sync-machine: room key is not provided');
  }

  return {
    socketClient: new SocketClient({
      wsUrl: event.data.wsUrl,
      roomKey: event.data.roomKey,
      ownerEdSecret: event.data.ownerEdSecret,
      contractAddress: event.data.contractAddress,
      ownerAddress: event.data.ownerAddress,
      onCollaborationConnectCallback: context.onCollaborationConnectCallback,
      roomInfo: event.data.roomInfo,
    }),

    initialUpdate: event.data.initialUpdate,
    roomKey: event.data.roomKey,
    roomKeyBytes: toUint8Array(event.data.roomKey),
    roomId: event.data.roomId,
    isOwner: event.data.isOwner,
    isEns: event.data.isEns,
    wsUrl: event.data.wsUrl,
    onCollaborationCommit: context.onCollaborationCommit,
    onFetchCommitContent: context.onFetchCommitContent,
    onSessionTerminated: context.onSessionTerminated,
    onUnMergedUpdates: context.onUnMergedUpdates,
    onLocalUpdate: context.onLocalUpdate,
  };
};

export const yjsUpdateHandler = (
  context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  if (!context.ydoc) {
    throw new Error('Ydoc is not available');
  }

  const encryptedUpdate: string | undefined = event.data?.event?.data?.data;

  if (!encryptedUpdate) return {};

  let update: Uint8Array;
  try {
    update = cryptoUtils.decryptData(context.roomKeyBytes!, encryptedUpdate);
  } catch (err) {
    console.warn('sync-machine: failed to decrypt update, skipping', err);
    return {};
  }
  applyUpdate(context.ydoc, update, 'self');
  if (context.onLocalUpdate && typeof context.onLocalUpdate === 'function') {
    context.onLocalUpdate(
      fromUint8Array(encodeStateAsUpdate(context.ydoc)),
      fromUint8Array(update),
    );
  }

  if (context.isOwner) {
    const list = [
      ...context.uncommittedUpdatesIdList,
      event.data.event.data.id,
    ];

    return {
      uncommittedUpdatesIdList: list,
    };
  } else {
    return {};
  }
};

export const roomMemberUpdateHandler = (context: SyncMachineContext) => {
  return {
    roomMembers: context.socketClient?.roomMembers ?? [],
  };
};

export const stateResetHandler = () => ({
  roomMembers: [],
  isConnected: false,
  awareness: null,
  _awarenessUpdateHandler: null,
  socketClient: null,
});
export const registerUpdateHandler = (
  context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  const id = event?.data?.updateId;
  if (!id) return {};
  const list = [...context.uncommittedUpdatesIdList, id];
  return {
    uncommittedUpdatesIdList: list,
  };
};

export const removeLastProcessedUpdate = (
  context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  const offset = event.data.queueOffset;
  const newUpdateQueue = context.updateQueue.slice(offset);
  return {
    updateQueue: newUpdateQueue,
  };
};

export const clearUncommitedUpdatesHandler = () => {
  return {
    uncommittedUpdatesIdList: [],
  };
};

export const addUpdateToQueueHandler = (
  context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  const list = [...context.updateQueue, event.data.update];
  return {
    updateQueue: list,
  };
};
export const updateConnectionReadyStateHandler = (
  _context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  return {
    isReady: event.data,
  };
};

export const setNewDocFlagHandler = (
  _context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  return {
    isNewDoc: event.data,
  };
};

export const commitUncommittedIdsHandler = (
  _context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  return {
    uncommittedUpdatesIdList: event.data.ids || [],
  };
};

export const setConnectionActiveStateHandler = (
  context: SyncMachineContext,
) => {
  const isConnected = context.socketClient?.isConnected ?? false;
  return {
    isConnected,
  };
};

export const setMachineReadyStateHandler = () => {
  return {
    isReady: true,
  };
};

export const addRemoteContentToQueueHandler = (
  context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  const remoteContent = event.data.event.data.data;
  const remoteContentId = event.data.event.data.id;
  const newList = [
    ...context.contentTobeAppliedQueue,
    { data: remoteContent, id: remoteContentId },
  ];

  return {
    contentTobeAppliedQueue: newList,
  };
};

export const applyContentsFromRemote = (context: SyncMachineContext) => {
  if (context.contentTobeAppliedQueue.length <= 0) return {};

  const decryptedContents: Uint8Array[] = [];
  const queuedUpdateIds: string[] = [];

  for (const item of context.contentTobeAppliedQueue) {
    try {
      const decrypted = cryptoUtils.decryptData(
        context.roomKeyBytes!,
        item.data,
      );
      decryptedContents.push(decrypted);
      if (item.id) {
        queuedUpdateIds.push(item.id);
      }
    } catch (err) {
      console.warn(
        'sync-machine: failed to decrypt queued remote content, skipping',
        err,
      );
    }
  }

  if (decryptedContents.length === 0) {
    return { contentTobeAppliedQueue: [] };
  }

  const mergedContents = mergeUpdates(decryptedContents);

  applyUpdate(context.ydoc, mergedContents);
  if (context.onLocalUpdate && typeof context.onLocalUpdate === 'function') {
    context.onLocalUpdate(
      fromUint8Array(encodeStateAsUpdate(context.ydoc)),
      fromUint8Array(mergedContents),
    );
  }

  const result: Record<string, any> = {
    contentTobeAppliedQueue: [],
  };

  if (context.isOwner && queuedUpdateIds.length > 0) {
    result.uncommittedUpdatesIdList = [
      ...context.uncommittedUpdatesIdList,
      ...queuedUpdateIds,
    ];
  }

  return result;
};

export const clearErrorCountHandler = () => {
  return {
    errorCount: 0,
    errorMessage: '',
  };
};
export const updateErrorCountHandler = (context: SyncMachineContext) => {
  return {
    errorCount: context.errorCount + 1,
  };
};

function extractErrorMessage(eventData: any, fallback: string): string {
  if (eventData?.message) return `${fallback}: ${eventData.message}`;
  if (typeof eventData === 'string') return `${fallback}: ${eventData}`;
  return fallback;
}

export const setCommitMessageErrorHandler = (
  _context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  console.error('commit error message', event.data);
  return {
    errorMessage: extractErrorMessage(
      event.data,
      'Failed to create latest commit',
    ),
  };
};

export const setUpdateErrorMessageHandler = (
  _context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  console.error('Failed to process update', event.data);
  return {
    errorMessage: extractErrorMessage(event.data, 'Failed to process update'),
  };
};

export const setConnectionErrorMessageHandler = (
  _context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  console.error('connection error', event.data);
  return {
    errorMessage: extractErrorMessage(
      event.data,
      'Failed to establish websocket connection',
    ),
  };
};

export const setIpfsQueryErrorMessageHandler = (
  _context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  console.error('error from fetching commit on IPFS', event.data);
  return {
    errorMessage: extractErrorMessage(
      event.data,
      'Error fetching commit from IPFS',
    ),
  };
};

export const setInitialCommitErrorMessageHandler = (
  _context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  console.error('error committing initial content', event.data);
  return {
    errorMessage: extractErrorMessage(
      event.data,
      'Error committing local contents',
    ),
  };
};

export const setInitialUpdateErrorMessageHandler = (
  _context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  console.error('error broadcasting initial content', event.data);
  return {
    errorMessage: extractErrorMessage(
      event.data,
      'Error broadcasting initial local contents',
    ),
  };
};
export const disconnectedStateHandler = () => {
  return {
    socketClient: null,
    roomMembers: [],
    isConnected: false,
    awareness: null,
    _awarenessUpdateHandler: null,
    uncommittedUpdatesIdList: [],
    updateQueue: [],
  };
};

export const terminateSessionHandler = (context: SyncMachineContext) => {
  if (context.awareness) {
    awarenessProtocol.removeAwarenessStates(
      context.awareness,
      [context.ydoc!.clientID],
      'session terminated',
    );
  }
  if (context.isOwner) {
    context.socketClient?.terminateSession();
  } else {
    context.onSessionTerminated?.();
  }

  return {
    socketClient: null,
    roomId: '',
    roomMembers: [],
    isConnected: false,
    awareness: null,
    _awarenessUpdateHandler: null,
    roomKey: '',
    roomKeyBytes: null,
    wsUrl: '',
    uncommittedUpdatesIdList: [],
    updateQueue: [],
    isOwner: false,
    isReady: false,
    isNewDoc: false,
    contentTobeAppliedQueue: [],
    initialUpdate: null,
    errorCount: 0,
    errorMessage: '',
  };
};

export const setDocumentDecryptionStateHandler = (
  _: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  return {
    initialDocumentDecryptionState: event.data,
  };
};
