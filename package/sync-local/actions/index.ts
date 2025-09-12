import {
  SocketStatusEnum,
  SyncMachineContext,
  SyncMachinEvent,
} from '../types';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as decoding from 'lib0/decoding';
import { toUint8Array } from 'js-base64';
import * as Y from 'yjs';
import { createAwarenessUpdateHandler } from '../utils/createAwarenessUpdateHandler';
import { SocketClient } from '../socketClient';
import { crypto as cryptoUtils } from '../crypto';
export const awarenessUpdateHandler = (
  context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  if (context.awareness) {
    const key = context.roomKey;
    const encryptedPosition = event.data.event.data.position as string;
    if (key) {
      const decrypted = cryptoUtils.decryptData(
        toUint8Array(key),
        encryptedPosition,
      );

      const decryptedPosition = new Uint8Array(decrypted);
      const decoder = decoding.createDecoder(decryptedPosition);
      const len = decoding.readVarUint(decoder);

      for (let i = 0; i < len; i++) {
        decoding.readVarUint(decoder); // clientId
        decoding.readVarUint(decoder); // clock
      }
      awarenessProtocol.applyAwarenessUpdate(
        context.awareness,
        decryptedPosition,
        null,
      );
    }
  }
  return {};
};

export const initAwarenessHandler = (context: SyncMachineContext) => {
  const awareness = new awarenessProtocol.Awareness(context.ydoc);
  const handler = createAwarenessUpdateHandler(awareness, context);
  awareness.on('update', handler);
  context.socketClient?.registerAwareness(awareness);
  return { awareness, _awarenessUpdateHandler: handler };
};

export const updateConnectionStateHandler = (context: SyncMachineContext) => {
  const isConnected =
    context.socketClient?._webSocketStatus === SocketStatusEnum.CONNECTED;
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
    roomId: event.data.roomId,
    isOwner: event.data.isOwner,
    isEns: event.data.isEns,
    wsUrl: event.data.wsUrl,
    onCollaborationCommit: context.onCollaborationCommit,
    onFetchCommitContent: context.onFetchCommitContent,
    onSessionTerminated: context.onSessionTerminated,
    onUnMergedUpdates: context.onUnMergedUpdates,
  };
};

export const yjsUpdateHandler = (
  context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  if (!context.ydoc) {
    throw new Error('Ydoc is not available');
  }

  let encryptedUpdate: string | undefined;
  if (event.data.event_type === 'CONTENT_UPDATE') {
    encryptedUpdate = event.data.event.data.data;
  }

  if (!encryptedUpdate) return {};

  const update = cryptoUtils.decryptData(
    toUint8Array(context.roomKey),
    encryptedUpdate,
  );
  Y.applyUpdate(context.ydoc, update, 'self');

  if (context.isOwner) {
    const list = [
      ...context.uncommittedUpdatesIdList,
      event.data.event.data.id,
    ];

    return {
      uncommittedUpdatesIdList: list,
    };
  } else {
    return {
      uncommittedUpdatesIdList: [],
    };
  }
};

export const roomMemberUpdateHandler = (context: SyncMachineContext) => {
  // const userInfo = context.socketClient?.roomMembers.find(
  //   (m) => m.username === context.username,
  // );
  // const isOwner = userInfo?.role === 'owner';
  return {
    roomMembers: context.socketClient?.roomMembers ?? [],
    // isOwner,
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
  const id = event.data.updateId;
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
  const newUpdateQueue = context.updateQueue.splice(offset);
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
  const isConnected =
    context.socketClient?._webSocketStatus === SocketStatusEnum.CONNECTED;
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
  const newList = [...context.contentTobeAppliedQueue, remoteContent];

  return {
    contentTobeAppliedQueue: newList,
  };
};

export const applyContentsFromRemote = (context: SyncMachineContext) => {
  if (context.contentTobeAppliedQueue.length <= 0) return {};

  const contents = context.contentTobeAppliedQueue.map((content) => {
    return toUint8Array(content);
  });
  const mergedContents = Y.mergeUpdates(contents);

  Y.applyUpdate(context.ydoc, mergedContents);
  return {
    contentTobeAppliedQueue: [],
  };
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

export const setCommitMessageErrorHandler = (
  _context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  console.error('commit error message', event.data);
  return {
    errorMessage: 'Failed to create latest commit',
  };
};

export const setUpdateErrorMessageHandler = (
  _context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  console.error('Failed to process update', event.data);
  return {
    errorMessage: 'Failed to process update',
  };
};

export const setConnectionErrorMessageHandler = (
  _context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  console.error('connection error', event.data);
  return {
    errorMessage: 'Failed to establish websocket connection',
  };
};

export const setIpfsQueryErrorMessageHandler = (
  _context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  console.error('error from fetching commit on IPFS', event.data);
  return {
    errorMessage: 'Error fetching commit from IPFS',
  };
};

export const setInitialCommitErrorMessageHandler = (
  _context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  console.error('error committinng initial content', event.data);
  return {
    errorMessage: 'Error committing local contents',
  };
};

export const setInitialUpdateErrorMessageHandler = (
  _context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  console.error('error broadcasting initial content', event.data);
  return {
    errorMessage: 'Error broadcasting initial local contents',
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
export const handleDisconnectionDueToError = (
  context: SyncMachineContext,
  event: SyncMachinEvent,
) => {
  if (event.data.error) {
    return {
      errorCount: context.errorCount + 1,
      errorMessage: event.data.error,
    };
  }
  return {};
};

export const terminateSessionHandler = (context: SyncMachineContext) => {
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
