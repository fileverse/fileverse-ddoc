/* eslint-disable @typescript-eslint/no-explicit-any */
import { Data } from '../../types';
import { SocketClient } from '../socketClient';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';

export enum SyncStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  SYNCING = 'syncing',
  CONNECTED = 'connected',
  PROCESSING = 'processing',
  DISCONNECTING = 'disconnecting',
}

export interface SyncManagerConfig {
  ydoc: Y.Doc;
  onError?: (e: Error) => void;
  onCollaborationConnectCallback?: (response: any) => void;
  onCollaborationCommit?: (file: File) => Promise<string>;
  onFetchCommitContent?: (cid: string) => Promise<any>;
  onSessionTerminated?: () => void;
  onUnMergedUpdates?: (state: boolean) => void;
  onLocalUpdate?: (
    updatedDocContent: Data['editorJSONData'],
    updateChunk: string,
  ) => void;
}

export interface ConnectConfig {
  username?: string;
  roomKey: string;
  roomId: string;
  isOwner: boolean;
  ownerEdSecret?: string;
  contractAddress?: string;
  ownerAddress?: string;
  isEns?: boolean;
  wsUrl: string;
  roomInfo?: {
    documentTitle: string;
    portalAddress: string;
    commentKey: string;
  };
}

export interface SyncManagerSnapshot {
  status: SyncStatus;
  isConnected: boolean;
  isReady: boolean;
  errorMessage: string;
  awareness: Awareness | null;
  initialDocumentDecryptionState: 'done' | 'pending';
}

export interface IRoomMember {
  userId: string;
  username: string;
  role: 'owner' | 'editor';
}

export enum ServerErrorCode {
  AUTH_TOKEN_MISSING = 'AUTH_TOKEN_MISSING',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_TERMINATED = 'SESSION_TERMINATED',
  SESSION_DID_MISSING = 'SESSION_DID_MISSING',
  DOCUMENT_ID_MISSING = 'DOCUMENT_ID_MISSING',
  UPDATE_DATA_MISSING = 'UPDATE_DATA_MISSING',
  COMMIT_UNAUTHORIZED = 'COMMIT_UNAUTHORIZED',
  COMMIT_MISSING_DATA = 'COMMIT_MISSING_DATA',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',
  DB_ERROR = 'DB_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface AckResponse<T = Record<string, any>> {
  status: boolean;
  statusCode: number;
  data?: T;
  error?: string;
  errorCode?: ServerErrorCode;
}

export interface SendUpdateResponse
  extends AckResponse<{
    id: string;
    documentId: string;
    data: string;
    updateType: string;
    commitCid: string | null;
    createdAt: number;
  }> { }

export interface CommitResponse
  extends AckResponse<{
    cid: string;
    createdAt: number;
    documentId: string;
    updates: string[];
  }> { }

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
  contentTobeAppliedQueue: Array<{ data: string; id?: string }>;
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
