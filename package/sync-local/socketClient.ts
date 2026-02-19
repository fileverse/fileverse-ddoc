/* eslint-disable @typescript-eslint/no-explicit-any */
import { io, Socket } from 'socket.io-client';
import * as ucans from '@ucans/ucans';

import {
  ISocketInitConfig,
  RoomMember,
  SocketStatusEnum,
  SendUpdateResponse,
  CommitResponse,
  IAuthArgs,
  AckResponse,
} from './types';
import { generateKeyPairFromSeed } from '@stablelib/ed25519';
import { fromUint8Array, toUint8Array } from 'js-base64';
import { crypto } from './crypto';
import { Awareness, applyAwarenessUpdate } from 'y-protocols/awareness.js';

import * as decoding from 'lib0/decoding';

interface ISocketClientConfig {
  wsUrl: string;
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
  private _socketUrl: string;
  private _socket: Socket | null = null;
  _webSocketStatus: SocketStatusEnum = SocketStatusEnum.CLOSED;
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
    this._socketUrl = config.wsUrl || 'ws://localhost:5000';
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

  registerAwareness(awareness: Awareness) {
    this.awareness = awareness;
  }

  private _emitWithAck<T = any>(
    event: string,
    args: any,
  ): Promise<AckResponse<T>> {
    return new Promise((resolve, reject) => {
      if (
        this._webSocketStatus !== SocketStatusEnum.CONNECTED ||
        !this._socket
      ) {
        const error = new Error('Lost connection to websocket server');
        error.name = 'SocketConnectionLostError';
        this._onError?.(error);
        reject(error);
        return;
      }

      this._socket.emit(event, args, (response: AckResponse<T>) => {
        resolve(response);
      });
    });
  }

  private async _fetchRoomMembers() {
    const data = await this._emitWithAck<{ peers: string[] }>(
      '/documents/peers/list',
      { documentId: this.roomId },
    );

    if (!data || !data.status) {
      throw new Error('Failed to fetch room members');
    }

    this.roomMembers = data.data?.peers as any;
  }

  public async sendUpdate({ update }: { update: string }) {
    const args = {
      data: update,
      documentId: this.roomId,
      collaborationToken: await this.buildSessionToken(),
    };

    return (await this._emitWithAck(
      '/documents/update',
      args,
    )) as SendUpdateResponse;
  }

  async commitUpdates({ updates, cid }: { updates: string[]; cid: string }) {
    const args = {
      updates,
      cid,
      documentId: this.roomId,
      ownerToken: await this.getOwnerToken(),
      contractAddress: this.contractAddress,
      ownerAddress: this.ownerAddress,
    };
    return (await this._emitWithAck(
      '/documents/commit',
      args,
    )) as CommitResponse;
  }

  async fetchLatestCommit() {
    const args = {
      documentId: this.roomId,
      offset: 0,
      limit: 1,
      sort: 'desc',
    };

    return await this._emitWithAck('/documents/commit/history', args);
  }

  async getUncommittedChanges() {
    const args = {
      documentId: this.roomId,
      limit: 1000,
      offset: 0,
      filters: { committed: false },
      sort: 'desc',
    };
    return await this._emitWithAck('/documents/update/history', args);
  }

  public async broadcastAwareness(awarenessUpdate: string) {
    if (this._webSocketStatus !== SocketStatusEnum.CONNECTED || !this._socket)
      return;
    const args = {
      documentId: this.roomId,
      data: {
        position: awarenessUpdate,
      },
    };
    this._socket.emit('/documents/awareness', args, () => {
      console.log('awareness update sent');
    });
  }

  public disconnect = () => {
    this._webSocketStatus = SocketStatusEnum.CLOSED;
    if (!this._socket) return;
    this._socket.disconnect();
    this._socket = null;
    this._webSocketStatus = SocketStatusEnum.CLOSED;
  };

  public terminateSession = async () => {
    const ownerToken = await this.getOwnerToken();
    const args = {
      documentId: this.roomId,
      ownerToken,
      ownerAddress: this.ownerAddress,
      contractAddress: this.contractAddress,
      sessionDid: this.collaborationKeyPair?.did(),
    };
    await this._emitWithAck('/documents/terminate', args);
    this.disconnect();
  };

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

  private _handleHandShake = async (
    message: { server_did: string; message: string },
    config: ISocketInitConfig,
  ) => {
    this._websocketServiceDid = message.server_did;

    if (this._webSocketStatus !== SocketStatusEnum.CONNECTED || !this.roomId) {
      throw new Error(
        'Cannot establish handshake. WebSocket not connected or roomId not defined',
      );
    }

    const token = await this.buildSessionToken();
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

    const response = await this._emitWithAck('/auth', args);

    this._onCollaborationConnectCallback?.({
      data: response,
      roomKey: this.roomKey,
    });

    if (response.statusCode !== 200) {
      const message =
        (response?.error || 'Unknown error') +
        `, statusCode: ${response?.statusCode}`;

      const error = new Error(message);

      config.onHandShakeError(error);
      return;
    }

    config.onConnect();
  };

  private _handleAwarenessUpdate = (data: { data: any; roomId: string }) => {
    if (!this.awareness) return;

    const key = this.roomKey;
    const encryptedPosition = data.data.position as string;
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
  };

  public connectSocket(config: ISocketInitConfig) {
    if (
      this._webSocketStatus === SocketStatusEnum.CONNECTED ||
      this._webSocketStatus === SocketStatusEnum.CONNECTING
    ) {
      return;
    }

    this._webSocketStatus = SocketStatusEnum.CONNECTING;

    return new Promise<void>((resolve) => {
      this._socket = io(this._socketUrl, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1500,
        reconnectionDelayMax: 10000,
        timeout: 6000,
        transports: ['websocket'],
      });

      this._socket.on('connect', () => {
        this._webSocketStatus = SocketStatusEnum.CONNECTED;
        resolve();
      });

      // Server handshake event — triggers auth flow
      this._socket.on('/server/handshake', (message) => {
        this._handleHandShake(message, config);
      });

      // Server broadcast listeners
      this._socket.on('/document/content_update', (data) => {
        config.onContentUpdate(data);
      });

      this._socket.on('/document/awareness_update', (data) => {
        this._handleAwarenessUpdate(data);
      });

      this._socket.on('/room/membership_change', (data) => {
        this._fetchRoomMembers().catch(console.error);
        config.onMembershipChange(data);
      });

      this._socket.on('/session/terminated', (data) => {
        config.onSessionTerminated(data);
        this._onSessionTerminated();
      });

      this._socket.on('disconnect', () => {
        console.error('SocketAPI: socket disconnected');
        this._webSocketStatus = SocketStatusEnum.CLOSED;
        config.onDisconnect();
      });

      this._socket.on('connect_error', (err) => {
        console.error('SocketAPI: socket connect error', err);
        this._webSocketStatus = SocketStatusEnum.CLOSED;

        const error = new Error(
          `Failed to connect to Socket, errorMessage: ${err?.message || 'Unknown error'}`,
        );
        error.name = 'SocketConnectionFailedError';
        this._onError?.(error);
      });

      this._socket.on('reconnect_failed', () => {
        console.error('SocketAPI: reconnection failed');
        this._webSocketStatus = SocketStatusEnum.CLOSED;
        const error = new Error('Failed to reconnect to Socket');
        error.name = 'SocketConnectionFailedError';
        this._onError?.(error);
      });

      this._socket.on('reconnect', () => {
        this._webSocketStatus = SocketStatusEnum.CONNECTED;
      });
    });
  }

  public async init(config: ISocketInitConfig) {
    this._onError = config.onError;
    this.roomId = config.roomId;

    await this.connectSocket(config);
  }

  private _onSessionTerminated = () => {
    this.disconnect();
    this.resetSocketClient();
  };

  private resetSocketClient = () => {
    this._webSocketStatus = SocketStatusEnum.CLOSED;
    this._socket = null;
    this._websocketServiceDid = '';
    this.roomId = '';
    this.roomMembers = [];
  };
}
