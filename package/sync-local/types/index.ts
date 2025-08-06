import { SocketClient } from "../socketClient";
import * as Y from "yjs";

export interface IRoomMember {
  user_id: string;
  username: string;
  role: "owner" | "editor";
}

export interface SendUpdateResponse {
  data: {
    agent_id: string;
    commit_cid: string | null;
    created_at: number;
    data: string;
    document_id: string;
    id: string;
    update_snapshot_ref: string | null;
    update_type: string;
  };
  is_handshake_response: boolean;
  status: boolean;
  status_code: number;
}

export interface CommitResponse {
  data: {
    agent_id: string;
    cid: string;
    created_at: number;
    data: any | null;
    document_id: string;
    updates: string[];
  };
  is_handshake_response: boolean;
  status: boolean;
  status_code: number;
}

export interface SyncMachineContext {
  ydoc: Y.Doc;
  socketClient: SocketClient | null;
  roomId: string;
  username: string;
  roomMembers: IRoomMember[];
  isConnected: boolean;
  awareness: any;
  _awarenessUpdateHandler: (({ added, updated, removed }: any) => void) | null;
  onError: ((e: string) => void) | null;
  roomKey: CryptoKey | null;
  wsProvider: string;
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
}
export interface ErrorResponseMessage {
  status: boolean;
  status_code: number;
  seq_id: string | null;
  is_handshake_response: boolean;
  err: string;
  err_detail: { [key: string]: any } | null;
}

export interface SuccessResponseMessage {
  status: boolean;
  status_code: number;
  seq_id: string | null;
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
  seq_id: string;
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
  username: string;
}

export enum SocketStatusEnum {
  CLOSED = "CLOSED",
  CONNECTED = "CONNECTED",
  CONNECTING = "CONNECTING",
  DISCONNECTING = "DISCONNECTING",
  DISCONNECTED = "DISCONNECTED",
}

export interface RoomMember {
  username: string;
  user_id: string;
  role: "owner" | "editor";
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
