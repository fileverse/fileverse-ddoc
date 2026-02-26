/* eslint-disable @typescript-eslint/no-explicit-any */
import { Data } from '../../types';
import { SocketClient } from '../socketClient';
import * as Y from 'yjs';

export interface IRoomMember {
  userId: string;
  username: string;
  role: 'owner' | 'editor';
}

export interface AckResponse<T = Record<string, any>> {
  status: boolean;
  statusCode: number;
  data?: T;
  error?: string;
}

export interface SendUpdateResponse
  extends AckResponse<{
    id: string;
    documentId: string;
    data: string;
    updateType: string;
    commitCid: string | null;
    createdAt: number;
  }> {}

export interface CommitResponse
  extends AckResponse<{
    cid: string;
    createdAt: number;
    documentId: string;
    updates: string[];
  }> {}

export interface SyncMachineContext {
  ydoc: Y.Doc;
  socketClient: SocketClient | null;
  roomId: string;
  username: string;
  roomMembers: IRoomMember[];
  isConnected: boolean;
  awareness: any;
  _awarenessUpdateHandler:
    | (({
        added,
        updated,
        removed,
      }: {
        added: number[];
        updated: number[];
        removed: number[];
      }) => void)
    | null;
  onError: ((e: Error) => void) | null;
  roomKey: string;
  roomKeyBytes: Uint8Array | null;
  wsUrl: string;
  uncommittedUpdatesIdList: string[];
  isOwner: boolean;
  updateQueue: Uint8Array[];
  isReady: boolean;
  isNewDoc: boolean;
  contentTobeAppliedQueue: string[];
  initialUpdate: string | null;
  errorCount: number;
  errorMaxRetryCount: number;
  errorMessage: string;
  initialDocumentDecryptionState: 'done' | 'pending';
  onCollaborationConnectCallback: (response: any) => void;
  onCollaborationCommit: (file: File) => Promise<string>;
  onFetchCommitContent: (cid: string) => Promise<any>;
  onSessionTerminated: () => void;
  onUnMergedUpdates: (state: boolean) => void;
  onLocalUpdate?: (
    updatedDocContent: Data['editorJSONData'],
    updateChunk: string,
  ) => void;
}

export type Update = Uint8Array;

export interface ISocketInitConfig {
  onConnect: () => void;
  onDisconnect: () => void;
  onError: (err: Error) => void;
  onHandShakeError: (err: Error) => void;
  onContentUpdate: (data: {
    id: string;
    data: string;
    createdAt: number;
    roomId: string;
  }) => void;
  onMembershipChange: (data: {
    action: string;
    user: { role: string };
    roomId: string;
  }) => void;
  onSessionTerminated: (data: { roomId: string }) => void;
  roomId: string;
}

export enum SocketStatusEnum {
  CLOSED = 'CLOSED',
  CONNECTED = 'CONNECTED',
  CONNECTING = 'CONNECTING',
  DISCONNECTING = 'DISCONNECTING',
  DISCONNECTED = 'DISCONNECTED',
}

export interface RoomMember {
  username: string;
  userId: string;
  role: 'owner' | 'editor';
}

export type IAesKey = string;

export type SyncMachinEvent = {
  type: string;
  data: any;
};
export interface IpfsUploadResponse {
  ipfsUrl: string;
  ipfsHash: string;
  ipfsStorage: string;
  cachedUrl: string;
  fileSize: number;
  mimetype: string;
}

export interface IAuthArgs {
  collaborationToken: string;
  documentId: string;
  ownerToken?: string;
  ownerAddress?: string;
  contractAddress?: string;
  sessionDid?: string;
  roomInfo?: string;
}
