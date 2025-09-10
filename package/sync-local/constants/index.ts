import { SyncMachineContext } from '../types';
import * as Y from 'yjs';

export const initialContext: SyncMachineContext = {
  socketClient: null,
  roomId: '',
  username: '',
  ydoc: new Y.Doc(),
  roomMembers: [],
  isConnected: false,
  awareness: null,
  _awarenessUpdateHandler: null,
  onError: null,
  roomKey: '',
  wsUrl: '',
  uncommittedUpdatesIdList: [],
  updateQueue: [],
  isOwner: false,
  isNewDoc: false,
  isReady: false,
  contentTobeAppliedQueue: [],
  initialUpdate: null,
  errorCount: 0,
  errorMaxRetryCount: 3,
  errorMessage: '',
  onCollaborationConnectCallback: () => {},
  onCollaborationCommit: () => Promise.resolve(''),
  onFetchCommitContent: () => Promise.resolve({}),
  onSessionTerminated: () => {},
};
export const STORAGE_API =
  'https://dev-fileverse-storage.herokuapp.com/upload/public';
export const IPFS_GATEWAYS = [
  'https://dev-ipfs.fileverse.io',
  'https://gateway.pinata.cloud',
];
