/* eslint-disable @typescript-eslint/no-explicit-any */
import { Data, IDocCollabUsers } from '../../types';
import * as Y from 'yjs';

// ─── Collaboration prop types ───

/** Connection identity — changes to these trigger reconnect */
export interface CollabConnectionConfig {
  roomKey: string;
  roomId: string;
  wsUrl: string;
  isOwner: boolean;
  ownerEdSecret?: string;
  contractAddress?: string;
  ownerAddress?: string;
  roomInfo?: {
    documentTitle: string;
    portalAddress: string;
    commentKey: string;
  };
}

/** Session metadata — changes to these update awareness, NOT reconnect */
export interface CollabSessionMeta {
  username: string;
  isEns?: boolean;
}

/** Storage integrations the sync engine depends on */
export interface CollabServices {
  commitToStorage?: (file: File) => Promise<string>;
  fetchFromStorage?: (cid: string) => Promise<any>;
}

// ─── State Machine Types ───

export type CollabErrorCode =
  | 'CONNECTION_FAILED'
  | 'AUTH_FAILED'
  | 'SYNC_FAILED'
  | 'TIMEOUT'
  | 'UNKNOWN';

export type CollabError = {
  code: CollabErrorCode;
  message: string;
  recoverable: boolean;
};

export type CollabStatus =
  | 'idle'
  | 'connecting'
  | 'syncing'
  | 'ready'
  | 'reconnecting'
  | 'error'
  | 'terminated';

export type CollabState =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'syncing'; hasUnmergedPeerUpdates: boolean }
  | { status: 'ready' }
  | { status: 'reconnecting'; attempt: number; maxAttempts: number }
  | { status: 'error'; error: CollabError }
  | { status: 'terminated'; reason?: string };

export type CollabEvent =
  | { type: 'CONNECT' }
  | { type: 'AUTH_SUCCESS' }
  | { type: 'SYNC_COMPLETE' }
  | { type: 'SET_UNMERGED_UPDATES'; hasUpdates: boolean }
  | { type: 'SOCKET_DROPPED' }
  | { type: 'RECONNECTED' }
  | { type: 'RETRY_EXHAUSTED' }
  | { type: 'ERROR'; error: CollabError }
  | { type: 'SESSION_TERMINATED'; reason?: string }
  | { type: 'RESET' };

export interface CollabContext {
  hasUnmergedPeerUpdates: boolean;
  reconnectAttempt: number;
  maxReconnectAttempts: number;
  error: CollabError | null;
  terminationReason?: string;
}

/** Event callbacks the consumer reacts to */
export interface CollabCallbacks {
  onStateChange?: (state: CollabState) => void;
  onError?: (error: CollabError) => void;
  onCollaboratorsChange?: (collaborators: IDocCollabUsers[]) => void;
  onHandshakeData?: (data: { data: AckResponse; roomKey: string }) => void;
}

/** Discriminated union — TypeScript enforces config+services only when enabled */
export type CollaborationProps =
  | { enabled: false }
  | {
    enabled: true;
    connection: CollabConnectionConfig;
    session: CollabSessionMeta;
    services: CollabServices;
    on?: CollabCallbacks;
  };

// ─── Internal sync types ───

export interface SyncManagerConfig {
  ydoc: Y.Doc;
  services?: CollabServices;
  callbacks?: CollabCallbacks;
  onLocalUpdate?: (
    updatedDocContent: Data['editorJSONData'],
    updateChunk: string,
  ) => void;
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
  onHandshakeSuccess: () => void;
  onDisconnect: () => void;
  onSocketDropped: () => void;
  onError: (err: Error) => void;
  onHandShakeError: (err: Error, statusCode?: number) => void;
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
  onReconnectFailed: () => void;
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
