/* eslint-disable @typescript-eslint/no-explicit-any */
import ReconnectingWebSocket, {
  UrlProvider,
  CloseEvent,
  // ErrorEvent,
} from 'partysocket/ws';
import * as ucans from '@ucans/ucans';
import { v1 as uuidv1 } from 'uuid';
import { fromUint8Array } from 'js-base64';
import { decryptData, encryptData } from './crypto/encryptData';
import {
  ConnectHandler,
  DisconnectHandler,
  IAesKey,
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
} from './types';
import { WEBSOCKET_CONFIG } from './constants/config';

export class SocketClient {
  private _websocketUrl: UrlProvider;
  private _machineEventHandler: EventHandler | null = null;
  private _onConnect: ConnectHandler | null = null;
  private _onDisconnection: DisconnectHandler | null = null;
  private _sequenceCallbackMap: SequenceToRequestMap = {};
  _webSocketStatus: SocketStatusEnum = SocketStatusEnum.CLOSED;
  private _webSocket: ReconnectingWebSocket | null = null;
  private isWebSocketReady = false;
  private _websocketServiceDid = '';
  private isAuthenticated = false;
  private roomId = '';
  private clientUcanKeyPair: ucans.EdKeypair | null = null;
  private clientUsername = '';
  roomMembers: RoomMember[] = [];
  private key: IAesKey = ''; // replace with proper keys
  _onError: ISocketInitConfig['onError'] | null = null;
  roomKey: CryptoKey | null = null;

  constructor(url: UrlProvider, roomKey: CryptoKey) {
    this._websocketUrl = url || 'ws://localhost:5000';
    this._processMessage = this._processMessage.bind(this);
    this.roomKey = roomKey;
    const didSecret = localStorage.getItem('sync_auth_keys');
    if (didSecret) {
      this.clientUcanKeyPair = ucans.EdKeypair.fromSecretKey(
        JSON.parse(didSecret).secret.trim(),
      );
    }
  }

  private async _decryptMessage(response: string) {
    if (!this.roomKey)
      throw new Error('Cannot decrypt request without a room key');
    const parsedResponse = JSON.parse(response);

    if (!parsedResponse?.event?.data?.data) return parsedResponse;
    if (parsedResponse.event.data.data.position) {
      parsedResponse.event.data.data.position = await decryptData(
        parsedResponse?.event.data.data.position,
        this.roomKey,
      );
    } else {
      parsedResponse.event.data.data = await decryptData(
        parsedResponse?.event.data.data,
        this.roomKey,
      );
    }
    return parsedResponse;
  }

  private _getSequenceIdCallback(id: string): SequenceToRequestMapValue {
    return this._sequenceCallbackMap[id];
  }

  private _removeSequenceIdFromMap(id: string) {
    delete this._sequenceCallbackMap[id];
  }

  private _registerSequenceCallback(
    seq: string,
    callback: SequenceResponseCB,
  ): void {
    this._sequenceCallbackMap[seq] = { callback };
  }
  private async _encryptSensitiveData(data: string) {
    if (!this.roomKey)
      throw new Error('Cannot encrypt request without a room key');

    const encryption = await encryptData(data, this.roomKey);
    return encryption;
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
    };

    return (await this._buildRequest(
      '/documents/update',
      args,
    )) as SendUpdateResponse;
  }

  async commitUpdates({
    updates,
    cid,
    data,
  }: {
    updates: string[];
    cid: string;
    data: string;
  }) {
    const args = {
      updates,
      cid,
      data,
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

  public async broadcastAwareness(awarenessUpdate: Uint8Array) {
    const args = {
      data: {
        position: await this._encryptSensitiveData(
          fromUint8Array(awarenessUpdate),
        ),
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

  private async _buildRequest(cmd: string, args: any) {
    if (!this.roomId) {
      throw new Error(`Cannot perform action without room id: ${this.roomId}`);
    }

    const seqId = uuidv1();
    const req: RequestPayload = {
      cmd,
      args: {
        document_id: this.roomId,
        ...args,
      },
      seq_id: seqId,
    };
    return await this._sendNetworkRequest(JSON.stringify(req), seqId);
  }

  private async getOrCreateKeyPair() {
    if (this.clientUcanKeyPair) {
      return this.clientUcanKeyPair;
    }

    const pair = await ucans.EdKeypair.create({ exportable: true });
    const secret = await pair.export();
    const did = pair.did();
    localStorage.setItem('sync_auth_keys', JSON.stringify({ secret, did }));
    this.clientUcanKeyPair = pair;
    return pair;
  }

  private buildToken = async () => {
    if (!this._websocketServiceDid) {
      throw new Error('Server did not response with the server DID');
    }
    const keyPair = await this.getOrCreateKeyPair();
    const token_ucan = await ucans.build({
      audience: this._websocketServiceDid,
      issuer: keyPair,
      capabilities: [
        {
          with: {
            scheme: 'fileverse',
            hierPart: `//solo.fileverse.io/doc/${this.roomId}`,
          },
          can: { namespace: 'crud', segments: ['EDIT'] },
        },
      ],
    });
    const token = ucans.encode(token_ucan);
    return token;
  };

  private _handleHandShake = async (message: any) => {
    this._websocketServiceDid = message.data.server_did;
    if (this._webSocketStatus !== SocketStatusEnum.CONNECTED || !this.roomId) {
      throw new Error(
        'Cannot establish handshake. WebSocket not connected or roomId not defined',
      );
    }
    if (!this.clientUsername) {
      throw new Error('User name is required to establish handshake');
    }
    const token = await this.buildToken();
    const seqId = uuidv1();
    const req: RequestPayload = {
      cmd: '/auth',
      args: {
        username: this.clientUsername,
        token: token,
        document_id: this.roomId,
      },
      seq_id: seqId,
    };
    const response: any = await this._sendNetworkRequest(
      JSON.stringify(req),
      seqId,
    );
    if (!response.is_handshake_response) {
      this.disconnect();
      return;
    }
    this.isAuthenticated = true;
    this._onConnect?.();
  };

  private _executeRequestCallback = (data: any) => {
    const callbackMap = this._getSequenceIdCallback(data.seq_id);

    if (callbackMap && typeof callbackMap.callback === 'function') {
      this._removeSequenceIdFromMap(data.seq_id);
      delete data.seq_id;
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
      }
      // eslint-disable-next-line no-fallthrough
      default:
        break;
    }
  };

  private async _processMessage(event: MessageEvent) {
    if (!event.data) throw new Error('Failed to get message data');
    const message = await this._decryptMessage(event.data);
    if (message.seq_id) {
      this._executeRequestCallback(message);
      return;
    }
    if (message.is_handshake_response) {
      this._handleHandShake(message);
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
    console.log('connectSocket');
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
        this.isWebSocketReady = false;
        this._webSocketStatus = SocketStatusEnum.CONNECTED;
        this._clearSequenceCallbackMap();
        resolve();
      };
      this._webSocket.onclose = (e: CloseEvent) => {
        this._webSocketStatus = SocketStatusEnum.CLOSED;
        this.isWebSocketReady = false;
        this._onDisconnection?.(e);
      };
      this._webSocket.onerror = (e) => {
        console.error('SocketAPI: socket error', e);
        this._webSocketStatus = SocketStatusEnum.CLOSED;
        this.isWebSocketReady = false;
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
    this.clientUsername = config.username;
    await this.connectSocket();
  }
}
