/* eslint-disable @typescript-eslint/no-explicit-any */
import ReconnectingWebSocket, {
  UrlProvider,
  CloseEvent,
  ErrorEvent,
} from 'partysocket/ws';
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
  private _onHandShakeError: ((err: Error) => void) | null = null;
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
  private collaborationUcan?: ucans.Ucan;
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
      const error = new Error('Lost connection to websocket server');
      error.name = 'SocketConnectionLostError';

      this._onError?.(error);
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
      collaborationToken: await this.buildSessionToken(),
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
    if (this._webSocketStatus !== SocketStatusEnum.CONNECTED) return;
    const args = {
      data: {
        position: awarenessUpdate,
      },
    };
    return await this._buildRequest('/documents/awareness', args);
  }

  public disconnect = (reason: string, code: number) => {
    this._webSocketStatus = SocketStatusEnum.CLOSED;
    if (!this._webSocket) return;
    this._webSocket.onopen = null;
    this._webSocket.removeEventListener('message', this._processMessage);
    this._webSocket.close(code, reason);
    this._webSocketStatus = SocketStatusEnum.CLOSED;
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
    this.disconnect('Session terminated', 1000);
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

  private isUcanValid(ucan: ucans.Ucan) {
    const payload = ucan.payload;
    const now = Math.floor(Date.now() / 1000);
    const bufferSeconds = 60;

    return (
      (!payload.nbf || payload.nbf <= now) &&
      (!payload.exp || payload.exp > now + bufferSeconds)
    );
  }

  private async getOwnerToken() {
    if (!this.ownerKeyPair || !this.contractAddress)
      throw new Error('SocketClient: No owner key pair or contract address');

    if (this.ownerUcan && this.isUcanValid(this.ownerUcan)) {
      return ucans.encode(this.ownerUcan);
    }

    this.ownerUcan = await ucans.build({
      audience: this._websocketServiceDid,
      issuer: this.ownerKeyPair,
      lifetimeInSeconds: 3600, // 1 Hour
      notBefore: Math.floor(Date.now() / 1000) - 60,
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

  private buildSessionToken = async () => {
    if (!this._websocketServiceDid) {
      throw new Error(
        'SocketClient: Server did not response with the server DID',
      );
    }
    if (this.collaborationUcan && this.isUcanValid(this.collaborationUcan)) {
      return ucans.encode(this.collaborationUcan);
    }
    const keyPair = this.getCollaborationKeyPair();

    this.collaborationUcan = await ucans.build({
      audience: this._websocketServiceDid,
      issuer: keyPair,
      lifetimeInSeconds: 3600, // 1 Hour
      notBefore: Math.floor(Date.now() / 1000) - 60,
      capabilities: [
        {
          with: {
            scheme: 'storage',
            hierPart: this.roomId,
          },
          can: { namespace: 'collaboration', segments: ['COLLABORATE'] },
        },
      ],
    });

    return ucans.encode(this.collaborationUcan);
  };

  private _handleHandShake = async (message: any) => {
    this._websocketServiceDid = message.data.server_did;

    if (this._webSocketStatus !== SocketStatusEnum.CONNECTED || !this.roomId) {
      throw new Error(
        'Cannot establish handshake. WebSocket not connected or roomId not defined',
      );
    }

    const token = await this.buildSessionToken();
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
    if (response.statusCode !== 200) {
      const message =
        (response?.err || 'Unknown error') +
        `, statusCode: ${response?.statusCode}`;

      const error = new Error(message);

      this._onHandShakeError?.(error);
      return;
    }
    if (!response.is_handshake_response) {
      console.error('SocketAPI: handshake response is not valid', response);
      this.disconnect('Handshake failed', response?.statusCode || 400);
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
    this.disconnect('Session terminated', 1000);
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
        console.error('SocketAPI: socket closed', e);
        this._webSocketStatus = SocketStatusEnum.CLOSED;
        this._onDisconnection?.(e);
      };
      this._webSocket.onerror = (e: ErrorEvent | Event) => {
        console.error('SocketAPI: socket error', e);
        this._webSocketStatus = SocketStatusEnum.CLOSED;
        if (
          this._webSocket &&
          this._webSocket.retryCount === WEBSOCKET_CONFIG.maxRetries
        ) {
          let errorMessage = 'Failed to connect to Socket';

          if (e instanceof ErrorEvent) {
            errorMessage += `, errorMessage: ${e?.message || 'Unknown message'}, errorName: ${e?.error?.name || 'Unknown name'}`;
          } else {
            if (e.target instanceof WebSocket) {
              const ws = e.target as WebSocket;
              errorMessage += `, readyState: ${ws?.readyState || 'Unknown ready state'}, wsUrl: ${ws?.url || 'Unknown url'}`;
            } else {
              errorMessage += `, errorMessage: 'Unknown error'`;
            }
          }

          const error = new Error(errorMessage);
          error.name = 'SocketConnectionFailedError';
          this._onError?.(error);
        }
      };
    });
  }

  public async init(config: ISocketInitConfig) {
    this._onConnect = config.onConnect;
    this._onDisconnection = config.onDisconnect;
    this._machineEventHandler = config.onWsEvent;
    this._onError = config.onError;
    this._onHandShakeError = config.onHandShakeError;
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
