/* eslint-disable @typescript-eslint/no-explicit-any */
import { SocketClient } from '../socketClient';
import * as Y from 'yjs';

export interface IRoomMember {
  userId: string;
  username: string;
  role: 'owner' | 'editor';
}

export interface SendUpdateResponse {
  data: {
    agent_id: string;
    commitCid: string | null;
    created_at: number;
    data: string;
    documentId: string;
    id: string;
    update_snapshot_ref: string | null;
    updateType: string;
  };
  is_handshake_response: boolean;
  status: boolean;
  statusCode: number;
}

export interface CommitResponse {
  data: {
    agent_id: string;
    cid: string;
    created_at: number;
    data: any | null;
    documentId: string;
    updates: string[];
  };
  is_handshake_response: boolean;
  status: boolean;
  statusCode: number;
}

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
  onError: ((e: string) => void) | null;
  roomKey: string;
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
  onCollaborationConnectCallback: (response: any) => void;
}
export interface ErrorResponseMessage {
  status: boolean;
  statusCode: number;
  seqId: string | null;
  is_handshake_response: boolean;
  err: string;
  err_detail: { [key: string]: any } | null;
}

export interface SuccessResponseMessage {
  status: boolean;
  statusCode: number;
  seqId: string | null;
  is_handshake_response: boolean;
  data: { [key: string]: any };
}

export interface EventMessage {
  type: string;
  event_type: string;
  event: { data: any; roomId: string };
}

export type RequestResponse = ErrorResponseMessage | SuccessResponseMessage;
export type OnMessagePayloadType = RequestResponse | EventMessage;

export type EventHandler = (message: EventMessage) => void;
export type DisconnectHandler = (e: CloseEvent | ErrorEvent) => void;
export type ConnectHandler = () => void;

export interface PartialRequest {
  cmd: string;
  args: { [key: string]: any };
}

export interface RequestPayload extends PartialRequest {
  seqId: string;
}

export type SequenceResponseCB = (data: RequestResponse) => void;

export interface SequenceToRequestMapValue {
  callback: SequenceResponseCB;
}

export type SequenceToRequestMap = {
  [key: string]: SequenceToRequestMapValue;
};

export type Update = Uint8Array;

export interface ISocketInitConfig {
  onConnect: ConnectHandler;
  onDisconnect: DisconnectHandler;
  onError: (err: string) => void;
  onWsEvent: EventHandler;
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
  collaborationDid?: string;
  roomInfo?: string;
}
