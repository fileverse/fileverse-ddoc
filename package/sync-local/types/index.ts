/* eslint-disable @typescript-eslint/no-explicit-any */
import { Data } from '../../types';
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

export interface IAuthArgs {
  collaborationToken: string;
  documentId: string;
  ownerToken?: string;
  ownerAddress?: string;
  contractAddress?: string;
  sessionDid?: string;
  roomInfo?: string;
}
