/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs';
import { fromUint8Array, toUint8Array } from 'js-base64';
import { Awareness, removeAwarenessStates } from 'y-protocols/awareness.js';

import { SocketClient } from './socketClient';
import { crypto as cryptoUtils } from './crypto';
import { objectToFile } from './utils/objectToFile';
import { createAwarenessUpdateHandler } from './utils/createAwarenessUpdateHandler';
import {
  SyncStatus,
  SyncManagerConfig,
  ConnectConfig,
  SyncManagerSnapshot,
} from './types';

const MAX_RETRIES = 3;

export class SyncManager {
  // --- Reactive state (triggers notify on change) ---
  private _status: SyncStatus = SyncStatus.DISCONNECTED;
  private _isConnected = false;
  private _isReady = false;
  private _errorMessage = '';
  private _awareness: Awareness | null = null;
  private _initialDocumentDecryptionState: 'done' | 'pending' = 'pending';

  // --- Internal state ---
  private socketClient: SocketClient | null = null;
  private roomKey = '';
  private roomKeyBytes: Uint8Array | null = null;
  private isOwner = false;
  private updateQueue: Uint8Array[] = [];
  private uncommittedUpdatesIdList: string[] = [];
  private contentTobeAppliedQueue: Array<{ data: string; id?: string }> = [];
  private isProcessing = false;
  private errorCount = 0;
  private _awarenessUpdateHandler:
    | ((
        changes: {
          added: number[];
          updated: number[];
          removed: number[];
        },
        origin: any,
      ) => void)
    | null = null;

  // --- Config (from constructor) ---
  private ydoc: Y.Doc;
  private onError?: (e: Error) => void;
  private onCollaborationConnectCallback?: (response: any) => void;
  private onCollaborationCommit?: (file: File) => Promise<string>;
  private onFetchCommitContent?: (cid: string) => Promise<any>;
  private onSessionTerminated?: () => void;
  private onUnMergedUpdates?: (state: boolean) => void;
  private onLocalUpdate?: (
    updatedDocContent: string,
    updateChunk: string,
  ) => void;

  constructor(
    config: SyncManagerConfig,
    private onStateChange: (snapshot: SyncManagerSnapshot) => void,
  ) {
    this.ydoc = config.ydoc;
    this.onError = config.onError;
    this.onCollaborationConnectCallback = config.onCollaborationConnectCallback;
    this.onCollaborationCommit = config.onCollaborationCommit;
    this.onFetchCommitContent = config.onFetchCommitContent;
    this.onSessionTerminated = config.onSessionTerminated;
    this.onUnMergedUpdates = config.onUnMergedUpdates;
    this.onLocalUpdate = config.onLocalUpdate;
  }

  private notify() {
    this.onStateChange({
      status: this._status,
      isConnected: this._isConnected,
      isReady: this._isReady,
      errorMessage: this._errorMessage,
      awareness: this._awareness,
      initialDocumentDecryptionState: this._initialDocumentDecryptionState,
    });
  }

  private setStatus(status: SyncStatus) {
    if (this._status === status) return;
    this._status = status;
    this._isConnected = status !== SyncStatus.DISCONNECTED && status !== SyncStatus.DISCONNECTING;
    this.notify();
  }

  // ─── Public API ───

  async connect(config: ConnectConfig): Promise<void> {
    if (this._status !== SyncStatus.DISCONNECTED) return;

    this.roomKey = config.roomKey;
    this.roomKeyBytes = toUint8Array(config.roomKey);
    this.isOwner = config.isOwner;

    const initialUpdate = fromUint8Array(Y.encodeStateAsUpdate(this.ydoc));

    this.socketClient = new SocketClient({
      wsUrl: config.wsUrl,
      roomKey: config.roomKey,
      roomId: config.roomId,
      ownerEdSecret: config.ownerEdSecret,
      contractAddress: config.contractAddress,
      ownerAddress: config.ownerAddress,
      onCollaborationConnectCallback:
        this.onCollaborationConnectCallback || (() => {}),
      onError: this.onError,
      roomInfo: config.roomInfo,
    });

    this.setStatus(SyncStatus.CONNECTING);

    try {
      await this.connectSocket();
      // After successful handshake, sync latest commit
      this.setStatus(SyncStatus.SYNCING);
      await this.syncLatestCommit(initialUpdate);

      // Verify socket is still alive after sync
      if (!this.socketClient?.isConnected) {
        throw new Error('Socket disconnected during sync');
      }

      // Apply any queued remote contents received during sync
      this.applyQueuedRemoteContents();

      this._isReady = true;
      this.setStatus(SyncStatus.CONNECTED);

      // If there are queued local updates, process them
      if (this.updateQueue.length > 0) {
        this.processUpdateQueue().catch((err) => {
          console.error('SyncManager: processUpdateQueue failed', err);
        });
      }
    } catch (err) {
      console.error('SyncManager: connect failed', err);
      this.onError?.(err instanceof Error ? err : new Error(String(err)));
      await this.disconnectInternal();
    }
  }

  async disconnect(): Promise<void> {
    if (
      this._status === SyncStatus.DISCONNECTED ||
      this._status === SyncStatus.DISCONNECTING
    )
      return;
    await this.disconnectInternal();
  }

  async terminateSession(): Promise<void> {
    if (this._status === SyncStatus.DISCONNECTED) return;

    try {
      if (this._awareness) {
        removeAwarenessStates(
          this._awareness,
          [this.ydoc.clientID],
          'session terminated',
        );
      }
      if (this.isOwner) {
        await this.socketClient?.terminateSession();
      } else {
        this.socketClient?.disconnect();
        this.onSessionTerminated?.();
      }
    } finally {
      this.reset();
      this.setStatus(SyncStatus.DISCONNECTED);
    }
  }

  enqueueLocalUpdate(update: Uint8Array): void {
    this.updateQueue.push(update);
    if (
      this._isConnected &&
      this._isReady &&
      !this.isProcessing &&
      this._status !== SyncStatus.SYNCING
    ) {
      this.processUpdateQueue();
    }
  }

  initializeAwareness(): void {
    if (this._awareness || !this.socketClient) return;
    try {
      const awareness = new Awareness(this.ydoc);
      const handler = createAwarenessUpdateHandler(
        awareness,
        this.socketClient,
        this.roomKey,
      );
      awareness.on('update', handler);
      this.socketClient.registerAwareness(awareness);
      this._awareness = awareness;
      this._awarenessUpdateHandler = handler;
      this.notify();
    } catch (err) {
      console.error('SyncManager: failed to initialize awareness', err);
    }
  }

  forceCleanup(): void {
    // Broadcast awareness removal BEFORE tearing down handler/socket
    if (this._awareness) {
      removeAwarenessStates(this._awareness, [this.ydoc.clientID], 'cleanup');
    }
    if (this._awareness && this._awarenessUpdateHandler) {
      this._awareness.off('update', this._awarenessUpdateHandler);
    }
    if (this._awareness) {
      this._awareness.destroy();
    }
    // Always tear down socket — even if already CLOSED —
    // to prevent socket.io auto-reconnection
    this.socketClient?.disconnect();
    this.reset();
    this._status = SyncStatus.DISCONNECTED;
    this.notify();
  }

  // ─── Internal methods ───

  private connectSocket(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.socketClient) {
        reject(new Error('SyncManager: socketClient not initialized'));
        return;
      }

      let settled = false;

      this.socketClient.connectSocket({
        onConnect: () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        },
        onDisconnect: () => {
          if (!settled) {
            settled = true;
            reject(new Error('Socket disconnected during connection'));
            return;
          }
          // Socket disconnected after connection was established
          this.disconnect();
        },
        onHandShakeError: (e) => {
          this.onError?.(e);
          if (!settled) {
            settled = true;
            reject(e);
            return;
          }
          this.disconnect();
        },
        onContentUpdate: (payload) => {
          this.handleRemoteContentUpdate(payload);
        },
        onMembershipChange: () => {
          // Room membership changes are handled by socketClient internally
        },
        onSessionTerminated: () => {
          this.onSessionTerminated?.();
          this.reset();
          this.setStatus(SyncStatus.DISCONNECTED);
        },
        onError: (e) => {
          console.error('SyncManager: socket error', e);
          this.onError?.(e);
          if (!settled) {
            settled = true;
            reject(e);
            return;
          }
          this.disconnect();
        },
      })?.catch(() => { /* handled via callbacks */ });
    });
  }

  private async syncLatestCommit(initialUpdate: string): Promise<void> {
    await this.withRetry(async () => {
      const latestCommit = await this.socketClient?.fetchLatestCommit();
      const history = latestCommit?.data?.history?.[0];
      let decryptedCommit: Uint8Array | undefined;

      if (history?.data) {
        try {
          decryptedCommit = cryptoUtils.decryptData(
            this.roomKeyBytes!,
            history.data,
          );
        } catch (err) {
          console.warn(
            'SyncManager: failed to decrypt commit data, skipping',
            err,
          );
        }
      }

      const updates: Uint8Array[] = [];

      if (history?.cid && this.onFetchCommitContent) {
        const content = await this.onFetchCommitContent(history.cid);
        if (content?.data) {
          try {
            const decryptedContent = cryptoUtils.decryptData(
              this.roomKeyBytes!,
              content.data,
            );
            updates.push(decryptedContent);
          } catch (err) {
            console.warn(
              'SyncManager: failed to decrypt commit content, skipping',
              err,
            );
          }
        }
      }

      const uncommittedChanges =
        await this.socketClient?.getUncommittedChanges();
      const encryptedUpdates = uncommittedChanges?.data?.history;
      const uncommittedChangesId: string[] = [];
      let unbroadcastedUpdate: string | null = null;

      if (initialUpdate) {
        updates.push(toUint8Array(initialUpdate));
        unbroadcastedUpdate = initialUpdate;
      }
      if (decryptedCommit) updates.push(decryptedCommit);

      if (encryptedUpdates && encryptedUpdates.length > 0) {
        if (this.isOwner && typeof this.onUnMergedUpdates === 'function') {
          this.onUnMergedUpdates(true);
        }
        for (const encryptedUpdate of encryptedUpdates) {
          try {
            const data = cryptoUtils.decryptData(
              this.roomKeyBytes!,
              encryptedUpdate.data,
            );
            uncommittedChangesId.push(encryptedUpdate.id);
            updates.push(data);
          } catch (err) {
            console.warn(
              'SyncManager: failed to decrypt uncommitted update, skipping',
              err,
            );
          }
        }
      }

      if (updates.length) {
        const mergedState = Y.mergeUpdates(updates);
        Y.applyUpdate(this.ydoc, mergedState, 'self');
      }

      if (this.isOwner && typeof this.onUnMergedUpdates === 'function') {
        this.onUnMergedUpdates(false);
      }

      this._initialDocumentDecryptionState = 'done';
      this.notify();

      this.uncommittedUpdatesIdList = uncommittedChangesId;

      // Owner: commit local contents if enough uncommitted updates
      if (this.isOwner) {
        await this.commitLocalContents(
          uncommittedChangesId,
          unbroadcastedUpdate,
        );
      } else {
        await this.broadcastLocalContents(unbroadcastedUpdate);
      }
    }, 'syncLatestCommit');
  }

  private async commitLocalContents(
    ids: string[],
    unbroadcastedUpdate: string | null,
  ): Promise<void> {
    if (ids.length >= 10) {
      if (typeof this.onCollaborationCommit !== 'function') {
        console.debug(
          'SyncManager: no commit function provided, skipping commit',
        );
      } else {
        const localContent = cryptoUtils.encryptData(
          this.roomKeyBytes!,
          Y.encodeStateAsUpdate(this.ydoc),
        );
        const file = objectToFile({ data: localContent }, 'commit');
        const ipfsHash = await this.onCollaborationCommit(file);

        if (!ipfsHash) {
          throw new Error('Failed to upload commit to IPFS: no hash returned');
        }

        const commitResponse = await this.socketClient?.commitUpdates({
          updates: ids,
          cid: ipfsHash,
        });

        if (!commitResponse?.status) {
          const errorMsg = commitResponse?.error || 'Server rejected commit';
          throw new Error(
            `Failed to commit local contents: ${errorMsg}${commitResponse?.statusCode ? ` (${commitResponse.statusCode})` : ''}`,
          );
        }

        this.uncommittedUpdatesIdList = [];
      }
    }

    // Broadcast unbroadcasted update
    if (unbroadcastedUpdate) {
      const encryptedUpdate = cryptoUtils.encryptData(
        this.roomKeyBytes!,
        toUint8Array(unbroadcastedUpdate),
      );
      const response = await this.socketClient?.sendUpdate({
        update: encryptedUpdate,
      });

      if (!response?.status) {
        const errorMsg = response?.error || 'Server rejected update';
        throw new Error(
          `Failed to broadcast local contents: ${errorMsg}${response?.statusCode ? ` (${response.statusCode})` : ''}`,
        );
      }

      const updateId = response?.data?.id;
      if (updateId) {
        this.uncommittedUpdatesIdList.push(updateId);
      }
    }
  }

  private async broadcastLocalContents(
    unbroadcastedUpdate: string | null,
  ): Promise<void> {
    if (!unbroadcastedUpdate) return;

    const updateToSend = cryptoUtils.encryptData(
      this.roomKeyBytes!,
      toUint8Array(unbroadcastedUpdate),
    );
    const response = await this.socketClient?.sendUpdate({
      update: updateToSend,
    });

    if (!response?.status) {
      const errorMsg = response?.error || 'Server rejected update';
      throw new Error(
        `Failed to broadcast local contents: ${errorMsg}${response?.statusCode ? ` (${response.statusCode})` : ''}`,
      );
    }
  }

  private async processUpdateQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.setStatus(SyncStatus.PROCESSING);

    try {
      while (this.updateQueue.length > 0) {
        if (!this._isConnected) break;
        await this.processNextUpdate();

        // If owner and enough uncommitted updates, commit
        if (this.isOwner && this.uncommittedUpdatesIdList.length >= 10) {
          await this.processCommit();
        }
      }

      // Commit remote-only accumulated updates
      if (this._isConnected && this.isOwner && this.uncommittedUpdatesIdList.length >= 10) {
        await this.processCommit();
      }

      // Back to connected if still connected
      if (this._isConnected) {
        this.errorCount = 0;
        this._errorMessage = '';
        this.setStatus(SyncStatus.CONNECTED);
      } else {
        await this.disconnectInternal();
      }
    } catch (err) {
      console.error('SyncManager: processUpdateQueue failed', err);
      await this.disconnectInternal();
    } finally {
      this.isProcessing = false;
    }
  }

  private async processNextUpdate(): Promise<void> {
    if (this.updateQueue.length === 0 || !this.roomKey) return;

    const queueOffset = this.updateQueue.length;
    const nextUpdate = Y.mergeUpdates(this.updateQueue);
    const updateToSend = cryptoUtils.encryptData(
      this.roomKeyBytes!,
      nextUpdate,
    );

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.socketClient?.sendUpdate({
          update: updateToSend,
        });

        if (!response?.status) {
          const errorMsg = response?.error || 'Server rejected update';
          throw new Error(
            `Failed to send update: ${errorMsg}${response?.statusCode ? ` (${response.statusCode})` : ''}`,
          );
        }

        const updateId = response?.data?.id;
        if (updateId) {
          this.uncommittedUpdatesIdList.push(updateId);
        }
        // Remove processed updates from queue
        this.updateQueue = this.updateQueue.slice(queueOffset);
        this.errorCount = 0;
        this._errorMessage = '';
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.errorCount++;
        this._errorMessage = `Failed to process update: ${lastError.message}`;
        this.notify();
        console.error(
          `SyncManager: processNextUpdate attempt ${attempt + 1} failed`,
          err,
        );
      }
    }

    throw lastError || new Error('processNextUpdate failed after retries');
  }

  private async processCommit(): Promise<void> {
    if (
      !this.onCollaborationCommit ||
      typeof this.onCollaborationCommit !== 'function'
    ) {
      console.debug(
        'SyncManager: no commit function provided, skipping commit',
      );
      return;
    }

    if (this.uncommittedUpdatesIdList.length < 10) return;

    const updates = [...this.uncommittedUpdatesIdList];

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const commitContent = {
          data: cryptoUtils.encryptData(
            this.roomKeyBytes!,
            Y.encodeStateAsUpdate(this.ydoc),
          ),
        };
        const file = objectToFile(commitContent, 'commit');
        const ipfsHash = await this.onCollaborationCommit(file);

        if (!ipfsHash) {
          throw new Error('Failed to upload commit to IPFS: no hash returned');
        }

        const response = await this.socketClient?.commitUpdates({
          updates,
          cid: ipfsHash,
        });

        if (!response?.status) {
          const errorMsg = response?.error || 'Server rejected commit';
          throw new Error(
            `Failed to commit updates: ${errorMsg}${response?.statusCode ? ` (${response.statusCode})` : ''}`,
          );
        }

        this.uncommittedUpdatesIdList = [];
        this.errorCount = 0;
        this._errorMessage = '';
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.errorCount++;
        this._errorMessage = `Failed to create latest commit: ${lastError.message}`;
        this.notify();
        console.error(
          `SyncManager: processCommit attempt ${attempt + 1} failed`,
          err,
        );
      }
    }

    throw lastError || new Error('processCommit failed after retries');
  }

  private handleRemoteContentUpdate(payload: {
    id: string;
    data: string;
    createdAt: number;
    roomId: string;
  }): void {
    if (this._status === SyncStatus.SYNCING || this._status === SyncStatus.CONNECTING) {
      // Queue for later application
      this.contentTobeAppliedQueue.push({
        data: payload.data,
        id: payload.id,
      });
      return;
    }

    this.applyRemoteYjsUpdate(payload.data, payload.id);

    if (this.isOwner && !this.isProcessing && this._isReady) {
      // Check if we need to commit
      if (this.uncommittedUpdatesIdList.length >= 10) {
        this.processUpdateQueue().catch((err) => {
          console.error('SyncManager: processUpdateQueue failed', err);
        });
      }
    }
  }

  private applyRemoteYjsUpdate(encrypted: string, id?: string): void {
    if (!this.ydoc) return;

    let update: Uint8Array;
    try {
      update = cryptoUtils.decryptData(this.roomKeyBytes!, encrypted);
    } catch (err) {
      console.warn('SyncManager: failed to decrypt update, skipping', err);
      return;
    }
    try {
      Y.applyUpdate(this.ydoc, update, 'self');
    } catch (err) {
      console.error(
        'SyncManager: failed to apply remote Yjs update, skipping',
        err,
      );
      return;
    }
    try {
      if (this.onLocalUpdate && typeof this.onLocalUpdate === 'function') {
        this.onLocalUpdate(
          fromUint8Array(Y.encodeStateAsUpdate(this.ydoc)),
          fromUint8Array(update),
        );
      }
    } catch (err) {
      console.error('SyncManager: onLocalUpdate callback threw', err);
    }

    if (this.isOwner && id) {
      this.uncommittedUpdatesIdList.push(id);
    }
  }

  private applyQueuedRemoteContents(): void {
    if (this.contentTobeAppliedQueue.length === 0) return;

    const decryptedContents: Uint8Array[] = [];
    const queuedUpdateIds: string[] = [];

    for (const item of this.contentTobeAppliedQueue) {
      try {
        const decrypted = cryptoUtils.decryptData(
          this.roomKeyBytes!,
          item.data,
        );
        decryptedContents.push(decrypted);
        if (item.id) {
          queuedUpdateIds.push(item.id);
        }
      } catch (err) {
        console.warn(
          'SyncManager: failed to decrypt queued remote content, skipping',
          err,
        );
      }
    }

    this.contentTobeAppliedQueue = [];

    if (decryptedContents.length === 0) return;

    const mergedContents = Y.mergeUpdates(decryptedContents);

    try {
      Y.applyUpdate(this.ydoc, mergedContents);
    } catch (err) {
      console.error(
        'SyncManager: failed to apply queued remote contents, skipping',
        err,
      );
      return;
    }
    try {
      if (this.onLocalUpdate && typeof this.onLocalUpdate === 'function') {
        this.onLocalUpdate(
          fromUint8Array(Y.encodeStateAsUpdate(this.ydoc)),
          fromUint8Array(mergedContents),
        );
      }
    } catch (err) {
      console.error('SyncManager: onLocalUpdate callback threw', err);
    }

    if (this.isOwner && queuedUpdateIds.length > 0) {
      this.uncommittedUpdatesIdList.push(...queuedUpdateIds);
    }
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    label: string,
  ): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await fn();
        this.errorCount = 0;
        this._errorMessage = '';
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.errorCount++;
        this._errorMessage = `${label} failed: ${lastError.message}`;
        this.notify();
        console.error(
          `SyncManager: ${label} attempt ${attempt + 1} failed`,
          err,
        );

        if (attempt === MAX_RETRIES) break;

        // Check if we should keep retrying
        if (!this._isConnected && label !== 'syncLatestCommit') break;
      }
    }

    throw lastError || new Error(`${label} failed after retries`);
  }

  private async disconnectInternal(): Promise<void> {
    this.setStatus(SyncStatus.DISCONNECTING);

    // Broadcast awareness removal BEFORE tearing down handler/socket
    if (this._awareness) {
      removeAwarenessStates(this._awareness, [this.ydoc.clientID], 'disconnect');
    }

    if (this._awareness && this._awarenessUpdateHandler) {
      this._awareness.off('update', this._awarenessUpdateHandler);
    }
    if (this._awareness) {
      this._awareness.destroy();
    }

    // Disconnect socket AFTER broadcasting removal
    this.socketClient?.disconnect();

    this.reset();
    this.setStatus(SyncStatus.DISCONNECTED);
  }

  private reset(): void {
    this.socketClient = null;
    this._isConnected = false;
    this._awareness = null;
    this._awarenessUpdateHandler = null;
    this.uncommittedUpdatesIdList = [];
    this.updateQueue = [];
    this.contentTobeAppliedQueue = [];
    this.isProcessing = false;
    this.errorCount = 0;
    this._errorMessage = '';
    this._isReady = false;
    this._initialDocumentDecryptionState = 'pending';
    this.roomKey = '';
    this.roomKeyBytes = null;
    this.isOwner = false;
  }
}
