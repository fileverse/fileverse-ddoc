/* eslint-disable @typescript-eslint/no-explicit-any */
import ReconnectingWebSocket, { UrlProvider, CloseEvent } from 'partysocket/ws';
import * as ucans from '@ucans/ucans';
import { v1 as uuidv1 } from 'uuid';

import {
  ConnectHandler,
  DisconnectHandler,
  ISocketInitConfig,
  EventHandler,
  RequestPayload,
  RoomMember,
  SequenceResponseCB,
  SequenceToRequestMap,
  SequenceToRequestMapValue,
  SocketStatusEnum,
  // Update,
  SendUpdateResponse,
  CommitResponse,
  IAuthArgs,
} from './types';
import { WEBSOCKET_CONFIG } from './constants/config';
import { generateKeyPairFromSeed } from '@stablelib/ed25519';
import { fromUint8Array, toUint8Array } from 'js-base64';
import { crypto } from './crypto';
import { Awareness, applyAwarenessUpdate } from 'y-protocols/awareness.js';

import * as decoding from 'lib0/decoding';

interface ISocketClientConfig {
  wsUrl: UrlProvider;
  roomKey: string;
  ownerEdSecret?: string;
  contractAddress?: string;
  ownerAddress?: string;
  onCollaborationConnectCallback: (response: any) => void;
  roomInfo?: {
    documentTitle: string;
    portalAddress: string;
    commentKey: string;
  };
}
export class SocketClient {
  private _websocketUrl: UrlProvider;
  private _machineEventHandler: EventHandler | null = null;
  private _onConnect: ConnectHandler | null = null;
  private _onDisconnection: DisconnectHandler | null = null;
  private _sequenceCallbackMap: SequenceToRequestMap = {};
  _webSocketStatus: SocketStatusEnum = SocketStatusEnum.CLOSED;
  private _webSocket: ReconnectingWebSocket | null = null;
  private _websocketServiceDid = '';
  private roomId = '';

  roomMembers: RoomMember[] = [];
  private collaborationKeyPair: ucans.EdKeypair | null = null;
  private ownerKeyPair?: ucans.EdKeypair;
  private contractAddress?: string;
  private ownerUcan?: ucans.Ucan;
  private ownerAddress?: string;
  private roomKey: string;
  private roomInfo?: {
    documentTitle: string;
    portalAddress: string;
    commentKey: string;
  };
  private awareness: Awareness | null = null;

  _onError: ISocketInitConfig['onError'] | null = null;
  _onCollaborationConnectCallback:
    | ISocketClientConfig['onCollaborationConnectCallback']
    | null = null;
  constructor(config: ISocketClientConfig) {
    this._websocketUrl = config.wsUrl || 'ws://localhost:5000';
    this._processMessage = this._processMessage.bind(this);
    const { secretKey: ucanSecret } = generateKeyPairFromSeed(
      toUint8Array(config.roomKey),
    );

    this.roomKey = config.roomKey;

    this.collaborationKeyPair = ucans.EdKeypair.fromSecretKey(
      fromUint8Array(ucanSecret),
    );

    if (config.ownerEdSecret)
      this.ownerKeyPair = ucans.EdKeypair.fromSecretKey(config.ownerEdSecret);

    if (config.contractAddress) this.contractAddress = config.contractAddress;
    if (config.ownerAddress) this.ownerAddress = config.ownerAddress;
    if (config.onCollaborationConnectCallback)
      this._onCollaborationConnectCallback =
        config.onCollaborationConnectCallback;
    if (config.roomInfo) this.roomInfo = config.roomInfo;
  }

  private _getSequenceIdCallback(id: string): SequenceToRequestMapValue {
    return this._sequenceCallbackMap[id];
  }

  private _removeSequenceIdFromMap(id: string) {
    delete this._sequenceCallbackMap[id];
  }

  registerAwareness(awareness: Awareness) {
    this.awareness = awareness;
  }

  private _registerSequenceCallback(
    seq: string,
    callback: SequenceResponseCB,
  ): void {
    this._sequenceCallbackMap[seq] = { callback };
  }

  private async _sendNetworkRequest(
    data: string,
    seqId?: string,
  ): Promise<any> {
    if (
      this._webSocketStatus !== SocketStatusEnum.CONNECTED ||
      !this._webSocket
    ) {
      console.error('cannot make network request, websocket is not connected');
      return;
    }

    return new Promise((resolve) => {
      if (!this._webSocket) {
        resolve(null);
        return;
      }
      this._webSocket.send(data);
      if (seqId) {
        this._registerSequenceCallback(seqId, resolve);
      } else {
        resolve(null);
      }
    });
  }

  private async _fetchRoomMembers() {
    const data: any = await this._buildRequest('/documents/peers/list', {});

    if (!data || !data.status) {
      throw new Error('Failed to fetch room members');
    }

    this.roomMembers = data.data.peers;
  }

  public async sendUpdate({ update }: { update: string }) {
    const args = {
      data: update,
      update_snapshot_ref: null,
      collaborationToken: await this.buildToken(),
    };

    return (await this._buildRequest(
      '/documents/update',
      args,
    )) as SendUpdateResponse;
  }

  async commitUpdates({ updates, cid }: { updates: string[]; cid: string }) {
    const args = {
      updates,
      cid,
      ownerToken: await this.getOwnerToken(),
      contractAddress: this.contractAddress,
      ownerAddress: this.ownerAddress,
    };
    return (await this._buildRequest(
      '/documents/commit',
      args,
    )) as CommitResponse;
  }

  async fetchLatestCommit() {
    const args = {
      offset: 0,
      limit: 1,
      sort: 'desc',
    };

    return await this._buildRequest('/documents/commit/history', args);
  }

  async getUncommittedChanges() {
    const args = {
      limit: 1000,
      offset: 0,
      filters: { committed: false },
      sort: 'desc',
    };
    return await this._buildRequest('/documents/update/history', args);
  }

  public async broadcastAwareness(awarenessUpdate: string) {
    const args = {
      data: {
        position: awarenessUpdate,
      },
    };
    return await this._buildRequest('/documents/awareness', args);
  }

  public disconnect = () => {
    this._webSocketStatus = SocketStatusEnum.DISCONNECTING;
    if (!this._webSocket) return;
    this._webSocket.onopen = null;
    this._webSocket.removeEventListener('message', this._processMessage);
    this._webSocket.close(1000, 'auth failed');
    this._webSocketStatus = SocketStatusEnum.DISCONNECTED;
  };

  public terminateSession = async () => {
    const ownerToken = await this.getOwnerToken();
    const args = {
      ownerToken,
      ownerAddress: this.ownerAddress,
      contractAddress: this.contractAddress,
      sessionDid: this.collaborationKeyPair?.did(),
    };
    await this._buildRequest('/documents/terminate', args);
    this.disconnect();
  };

  private async _buildRequest(cmd: string, args: any) {
    if (!this.roomId) {
      throw new Error(`Cannot perform action without room id: ${this.roomId}`);
    }

    const seqId = uuidv1();
    const req: RequestPayload = {
      cmd,
      args: {
        documentId: this.roomId,
        ...args,
      },
      seqId: seqId,
    };
    return await this._sendNetworkRequest(JSON.stringify(req), seqId);
  }

  private getCollaborationKeyPair() {
    if (!this.collaborationKeyPair)
      throw new Error('No collaboration key pair');
    return this.collaborationKeyPair;
  }

  private async getOwnerToken() {
    if (!this.ownerKeyPair || !this.contractAddress) return undefined;

    if (this.ownerUcan && !ucans.isExpired(this.ownerUcan))
      return ucans.encode(this.ownerUcan);

    this.ownerUcan = await ucans.build({
      audience: this._websocketServiceDid,
      issuer: this.ownerKeyPair,
      lifetimeInSeconds: 7 * 86400,
      capabilities: [
        {
          with: {
            scheme: 'storage',
            hierPart: this.contractAddress.toLowerCase(),
          },
          can: { namespace: 'collaboration', segments: ['CREATE'] },
        },
      ],
    });

    return ucans.encode(this.ownerUcan);
  }

  private buildToken = async () => {
    if (!this._websocketServiceDid) {
      throw new Error('Server did not response with the server DID');
    }
    const keyPair = this.getCollaborationKeyPair();

    const ucan = await ucans.build({
      audience: this._websocketServiceDid,
      issuer: keyPair,
      lifetimeInSeconds: 7 * 86400,
      capabilities: [
        {
          with: {
            scheme: 'storage',
            hierPart: 'collaboration',
          },
          can: { namespace: 'collaboration', segments: ['COLLABORATE'] },
        },
      ],
    });
    const token = ucans.encode(ucan);
    return token;
  };

  private _handleHandShake = async (message: any) => {
    this._websocketServiceDid = message.data.server_did;

    if (this._webSocketStatus !== SocketStatusEnum.CONNECTED || !this.roomId) {
      throw new Error(
        'Cannot establish handshake. WebSocket not connected or roomId not defined',
      );
    }

    const token = await this.buildToken();
    const seqId = uuidv1();
    const args: IAuthArgs = {
      collaborationToken: token,
      sessionDid: this.collaborationKeyPair?.did(),
      documentId: this.roomId,
    };

    if (this.roomInfo)
      args.roomInfo = crypto.encryptData(
        toUint8Array(this.roomKey),
        new TextEncoder().encode(JSON.stringify(this.roomInfo)),
      );

    if (this.ownerKeyPair) args.ownerToken = await this.getOwnerToken();
    if (this.ownerAddress) args.ownerAddress = this.ownerAddress;
    if (this.contractAddress) args.contractAddress = this.contractAddress;

    const req: RequestPayload = {
      cmd: '/auth',
      args,
      seqId: seqId,
    };
    const response: any = await this._sendNetworkRequest(
      JSON.stringify(req),
      seqId,
    );
    this._onCollaborationConnectCallback?.({
      data: response,
      roomKey: this.roomKey,
    });
    if (!response.is_handshake_response) {
      this.disconnect();
      return;
    }
    this._onConnect?.();
  };

  private _executeRequestCallback = (data: any) => {
    const callbackMap = this._getSequenceIdCallback(data.seqId);

    if (callbackMap && typeof callbackMap.callback === 'function') {
      this._removeSequenceIdFromMap(data.seqId);
      delete data.seqId;
      callbackMap.callback(data);
      return;
    }
  };

  private _dispatchEventHandler = async (message: any) => {
    switch (message.type) {
      case 'ROOM_UPDATE': {
        if (message.event_type === 'ROOM_MEMBERSHIP_CHANGE') {
          await this._fetchRoomMembers();
        }
        break;
      }
      case 'SESSION_TERMINATION': {
        this._onSessionTerminated();
        break;
      }
      default:
        break;
    }
  };

  private _onSessionTerminated = () => {
    this.disconnect();
    this.resetSocketClient();
  };

  private async _processMessage(event: MessageEvent) {
    if (!event.data) throw new Error('Failed to get message data');

    const message = JSON.parse(event.data);

    if (message.seqId) {
      this._executeRequestCallback(message);
      return;
    }
    if (message.is_handshake_response) {
      this._handleHandShake(message);
      return;
    }

    if (message.event_type === 'AWARENESS_UPDATE') {
      await this._dispatchEventHandler(message);
      if (this.awareness) {
        const key = this.roomKey;
        const encryptedPosition = message.event.data.position as string;
        if (key) {
          const decrypted = crypto.decryptData(
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
          applyAwarenessUpdate(this.awareness, decryptedPosition, null);
        }
      }
      return;
    }

    if (message.event) {
      await this._dispatchEventHandler(message);
      this._machineEventHandler?.(message);
    }
  }

  private _clearSequenceCallbackMap() {
    this._sequenceCallbackMap = {};
  }

  public connectSocket() {
    if (
      this._webSocketStatus === SocketStatusEnum.CONNECTED ||
      this._webSocketStatus === SocketStatusEnum.CONNECTING
    ) {
      return;
    }

    this._webSocketStatus = SocketStatusEnum.CONNECTING;

    return new Promise<void>((resolve) => {
      this._webSocket = new ReconnectingWebSocket(
        this._websocketUrl,
        [],
        WEBSOCKET_CONFIG,
      );
      this._webSocket.addEventListener('message', this._processMessage);
      this._webSocket.onopen = () => {
        this._webSocketStatus = SocketStatusEnum.CONNECTED;
        this._clearSequenceCallbackMap();
        resolve();
      };
      this._webSocket.onclose = (e: CloseEvent) => {
        this._webSocketStatus = SocketStatusEnum.CLOSED;
        this._onDisconnection?.(e);
      };
      this._webSocket.onerror = (e) => {
        console.error('SocketAPI: socket error', e);
        this._webSocketStatus = SocketStatusEnum.CLOSED;
        this._onError?.('Failed to connect to Socket');
      };
    });
  }

  public async init(config: ISocketInitConfig) {
    this._onConnect = config.onConnect;
    this._onDisconnection = config.onDisconnect;
    this._machineEventHandler = config.onWsEvent;
    this._onError = config.onError;
    this.roomId = config.roomId;

    await this.connectSocket();
  }

  private resetSocketClient = () => {
    this._webSocketStatus = SocketStatusEnum.CLOSED;
    this._webSocket = null;
    this._websocketServiceDid = '';
    this.roomId = '';
    this.roomMembers = [];
  };
}
