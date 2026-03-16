/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs';
import { fromUint8Array, toUint8Array } from 'js-base64';
import { Awareness, removeAwarenessStates } from 'y-protocols/awareness.js';

import { SocketClient } from './socketClient';
import { crypto as cryptoUtils } from './crypto';
import { objectToFile } from './utils/objectToFile';
import { createAwarenessUpdateHandler } from './utils/createAwarenessUpdateHandler';
import {
  SyncManagerConfig,
  CollabConnectionConfig,
  CollabServices,
  CollabCallbacks,
  CollabStatus,
  CollabState,
  CollabEvent,
  CollabContext,
  CollabError,
} from './types';
import {
  transition,
  deriveCollabState,
  createCollabError,
  INITIAL_CONTEXT,
} from './collabStateMachine';

const MAX_RETRIES = 3;

export class SyncManager {
  // --- State machine ---
  private _status: CollabStatus = 'idle';
  private _context: CollabContext = { ...INITIAL_CONTEXT };
  private _awareness: Awareness | null = null;

  // --- Internal state ---
  private socketClient: SocketClient | null = null;
  private roomKey = '';
  private roomKeyBytes: Uint8Array | null = null;
  private isOwner = false;
  private updateQueue: Uint8Array[] = [];
  private uncommittedUpdatesIdList: string[] = [];
  private contentTobeAppliedQueue: Array<{ data: string; id?: string }> = [];
  private isProcessing = false;
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
  private servicesRef: CollabServices | undefined;
  private callbacksRef: CollabCallbacks | undefined;
  private onLocalUpdate?: (
    updatedDocContent: string,
    updateChunk: string,
  ) => void;

  constructor(
    config: SyncManagerConfig,
    private onCollabStateChange: (state: CollabState) => void,
  ) {
    this.ydoc = config.ydoc;
    this.servicesRef = config.services;
    this.callbacksRef = config.callbacks;
    this.onLocalUpdate = config.onLocalUpdate;
  }

  /** Called by useSyncManager on every render to keep refs fresh */
  updateRefs(
    services: CollabServices | undefined,
    callbacks: CollabCallbacks | undefined,
    onLocalUpdate?: (updatedDocContent: string, updateChunk: string) => void,
  ) {
    this.servicesRef = services;
    this.callbacksRef = callbacks;
    this.onLocalUpdate = onLocalUpdate;
  }

  // ─── Derived properties ───

  get isConnected(): boolean {
    return (
      this._status === 'syncing' ||
      this._status === 'ready' ||
      this._status === 'reconnecting'
    );
  }

  get isReady(): boolean {
    return this._status === 'ready';
  }

  get awareness(): Awareness | null {
    return this._awareness;
  }

  get status(): CollabStatus {
    return this._status;
  }

  get collabState(): CollabState {
    return deriveCollabState(this._status, this._context);
  }

  // ─── State machine core ───

  private send(event: CollabEvent): boolean {
    const result = transition(this._status, event, this._context);
    if (!result) {
      console.warn(
        `SyncManager: invalid transition (${this._status}, ${event.type}) — ignored`,
      );
      return false;
    }

    const prevStatus = this._status;

    // Exit actions
    this.runExitActions(prevStatus, result.status);

    // Update state
    this._status = result.status;
    this._context = { ...this._context, ...result.context };

    // Entry actions
    this.runEntryActions(result.status, prevStatus);

    // Notify consumer
    const state = deriveCollabState(this._status, this._context);
    this.callbacksRef?.onStateChange?.(state);
    this.onCollabStateChange(state);

    return true;
  }

  private runExitActions(from: CollabStatus, to: CollabStatus): void {
    if (from === 'ready' && to === 'reconnecting') {
      this.cleanupAwareness();
    }
    if (to === 'idle') {
      this.cleanupAwareness();
    }
  }

  private runEntryActions(to: CollabStatus, from: CollabStatus): void {
    if (to === 'ready' && from === 'syncing') {
      this.initializeAwareness();
    }
    if (to === 'error') {
      const error = this._context.error;
      if (error) {
        this.callbacksRef?.onError?.(error);
      }
    }
  }

  // ─── Public API ───

  async connect(config: CollabConnectionConfig): Promise<void> {
    if (this._status !== 'idle') return;

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
      onHandshakeData: this.callbacksRef?.onHandshakeData,
      roomInfo: config.roomInfo,
    });

    this.send({ type: 'CONNECT' });

    try {
      await this.connectSocket();
      // After successful handshake, transition to syncing
      this.send({ type: 'AUTH_SUCCESS' });

      await this.syncLatestCommit(initialUpdate);

      // Yield to allow React to render the unmerged-updates toast
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify socket is still alive after sync
      if (!this.socketClient?.isConnected) {
        throw new Error('Socket disconnected during sync');
      }

      // Apply any queued remote contents received during sync
      this.applyQueuedRemoteContents();

      // Transition to ready — awareness is initialized in entry action
      this.send({ type: 'SYNC_COMPLETE' });

      // If there are queued local updates, process them
      if (this.updateQueue.length > 0) {
        this.processUpdateQueue().catch((err) => {
          console.error('SyncManager: processUpdateQueue failed', err);
        });
      }
    } catch (err) {
      console.error('SyncManager: connect failed', err);
      const error = err instanceof Error ? err : new Error(String(err));
      this.handleConnectionError(error);
    }
  }

  async disconnect(): Promise<void> {
    if (this._status === 'idle' || this._status === 'terminated') return;
    await this.disconnectInternal();
  }

  async terminateSession(): Promise<void> {
    if (this._status === 'idle') return;

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
      }
    } finally {
      this.resetInternalState();
      this.send({
        type: 'SESSION_TERMINATED',
        reason: 'User terminated session',
      });
      // After terminated, reset to idle for potential reuse
      this.send({ type: 'RESET' });
    }
  }

  enqueueLocalUpdate(update: Uint8Array): void {
    this.updateQueue.push(update);
    if (this._status === 'ready' && !this.isProcessing) {
      this.processUpdateQueue();
    }
  }

  forceCleanup(): void {
    // Broadcast awareness removal BEFORE tearing down handler/socket
    if (this._awareness) {
      removeAwarenessStates(this._awareness, [this.ydoc.clientID], 'cleanup');
    }
    this.cleanupAwareness();

    // Always tear down socket — even if already CLOSED —
    // to prevent socket.io auto-reconnection
    this.socketClient?.disconnect();
    this.resetInternalState();
    this._status = 'idle';
    this._context = { ...INITIAL_CONTEXT };

    const state = deriveCollabState(this._status, this._context);
    this.onCollabStateChange(state);
  }

  // ─── Internal methods ───

  private handleConnectionError(error: Error): void {
    const errorName = error.name || '';
    const errorMessage = error.message || '';

    let collabError: CollabError;

    if (
      errorName === 'SocketConnectionTimeoutError' ||
      errorMessage.includes('timed out')
    ) {
      collabError = createCollabError('TIMEOUT', error.message);
    } else if (
      errorName === 'SocketConnectionFailedError' ||
      errorMessage.includes('Failed to reconnect')
    ) {
      collabError = createCollabError('CONNECTION_FAILED', error.message);
    } else if (
      errorMessage.includes('statusCode: 401') ||
      errorMessage.includes('AUTH_')
    ) {
      collabError = createCollabError('AUTH_FAILED', error.message);
    } else if (
      errorMessage.includes('sync') ||
      errorMessage.includes('decrypt')
    ) {
      collabError = createCollabError('SYNC_FAILED', error.message);
    } else {
      collabError = createCollabError('UNKNOWN', error.message);
    }

    // Clean up socket
    this.socketClient?.disconnect();
    this.resetInternalState();

    this.send({ type: 'ERROR', error: collabError });
  }

  private async handleReconnection(): Promise<void> {
    try {
      this.send({ type: 'RECONNECTED' });

      const initialUpdate = fromUint8Array(Y.encodeStateAsUpdate(this.ydoc));
      await this.syncLatestCommit(initialUpdate);

      if (!this.socketClient?.isConnected) {
        throw new Error('Socket disconnected during re-sync');
      }

      this.applyQueuedRemoteContents();

      // Transition to ready — awareness re-initialized in entry action
      this.send({ type: 'SYNC_COMPLETE' });

      // Process any updates queued during disconnect
      if (this.updateQueue.length > 0) {
        this.processUpdateQueue().catch((err) => {
          console.error(
            'SyncManager: post-reconnect processUpdateQueue failed',
            err,
          );
        });
      }
    } catch (err) {
      console.error('SyncManager: reconnection handling failed', err);
      const error = err instanceof Error ? err : new Error(String(err));
      this.handleConnectionError(error);
    }
  }

  private connectSocket(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.socketClient) {
        reject(new Error('SyncManager: socketClient not initialized'));
        return;
      }

      let settled = false;

      this.socketClient
        .connectSocket({
          onHandshakeSuccess: () => {
            if (!settled) {
              settled = true;
              resolve();
            } else {
              // Reconnection: socket dropped then reconnected
              // Only send SOCKET_DROPPED if not already in reconnecting state
              // (onSocketDropped may have already transitioned us)
              if (this._status !== 'reconnecting') {
                this.send({ type: 'SOCKET_DROPPED' });
              }
              this.handleReconnection();
            }
          },
          onDisconnect: () => {
            if (!settled) {
              settled = true;
              reject(new Error('Socket disconnected during connection'));
              return;
            }
            // Intentional disconnect after connection was established
            this.disconnect();
          },
          onSocketDropped: () => {
            if (this._status === 'ready') {
              this.send({ type: 'SOCKET_DROPPED' });
            }
          },
          onHandShakeError: (e, statusCode) => {
            // Classify error by statusCode
            if (statusCode === 404) {
              this.socketClient?.disconnect();
              this.resetInternalState();
              this.send({
                type: 'SESSION_TERMINATED',
                reason: 'Session not found',
              });
              if (!settled) {
                settled = true;
                // Don't reject — the state machine handles this
                resolve();
              }
              return;
            }

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
            this.resetInternalState();
            this.send({
              type: 'SESSION_TERMINATED',
              reason: 'Terminated by owner',
            });
          },
          onReconnectFailed: () => {
            if (this._status === 'reconnecting') {
              this.send({ type: 'RETRY_EXHAUSTED' });
            } else if (this._status === 'ready') {
              // Safety net: disconnect event was missed, go straight to error
              const error = createCollabError(
                'CONNECTION_FAILED',
                'Connection lost and reconnection failed',
              );
              this.send({ type: 'ERROR', error });
            }
            // Also reject the initial connection promise if it hasn't settled
            if (!settled) {
              settled = true;
              const error = new Error(
                'Failed to connect to collaboration server',
              );
              error.name = 'SocketConnectionFailedError';
              reject(error);
            }
          },
          onError: (e) => {
            console.error('SyncManager: socket error', e);
            if (!settled) {
              settled = true;
              reject(e);
              return;
            }
            // Socket error while connected — trigger reconnect flow
            if (this._status === 'ready') {
              this.send({ type: 'SOCKET_DROPPED' });
            }
          },
        })
        ?.catch(() => {
          /* handled via callbacks */
        });
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

      if (history?.cid && this.servicesRef?.fetchFromStorage) {
        const content = await this.servicesRef.fetchFromStorage(history.cid);
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
        // Signal unmerged peer updates via state machine
        if (this.isOwner) {
          this.send({ type: 'SET_UNMERGED_UPDATES', hasUpdates: true });
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

  private initializeAwareness(): void {
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
    } catch (err) {
      console.error('SyncManager: failed to initialize awareness', err);
    }
  }

  private cleanupAwareness(): void {
    if (this._awareness && this._awarenessUpdateHandler) {
      this._awareness.off('update', this._awarenessUpdateHandler);
    }
    if (this._awareness) {
      this._awareness.destroy();
    }
    this._awareness = null;
    this._awarenessUpdateHandler = null;
  }

  private async commitLocalContents(
    ids: string[],
    unbroadcastedUpdate: string | null,
  ): Promise<void> {
    if (ids.length >= 10) {
      if (typeof this.servicesRef?.commitToStorage !== 'function') {
        console.debug(
          'SyncManager: no commit function provided, skipping commit',
        );
      } else {
        const localContent = cryptoUtils.encryptData(
          this.roomKeyBytes!,
          Y.encodeStateAsUpdate(this.ydoc),
        );
        const file = objectToFile({ data: localContent }, 'commit');
        const ipfsHash = await this.servicesRef.commitToStorage(file);

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

    try {
      while (this.updateQueue.length > 0) {
        if (!this.isConnected) break;
        await this.processNextUpdate();

        // If owner and enough uncommitted updates, commit
        if (this.isOwner && this.uncommittedUpdatesIdList.length >= 10) {
          await this.processCommit();
        }
      }

      // Commit remote-only accumulated updates
      if (
        this.isConnected &&
        this.isOwner &&
        this.uncommittedUpdatesIdList.length >= 10
      ) {
        await this.processCommit();
      }

      if (!this.isConnected) {
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
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
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
      !this.servicesRef?.commitToStorage ||
      typeof this.servicesRef.commitToStorage !== 'function'
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
        const ipfsHash = await this.servicesRef!.commitToStorage(file);

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
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
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
    if (this._status === 'syncing' || this._status === 'connecting') {
      // Queue for later application
      this.contentTobeAppliedQueue.push({
        data: payload.data,
        id: payload.id,
      });
      return;
    }

    this.applyRemoteYjsUpdate(payload.data, payload.id);

    if (this.isOwner && !this.isProcessing && this.isReady) {
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

  private async withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(
          `SyncManager: ${label} attempt ${attempt + 1} failed`,
          err,
        );

        if (attempt === MAX_RETRIES) break;

        // Check if we should keep retrying
        if (!this.isConnected && label !== 'syncLatestCommit') break;
      }
    }

    throw lastError || new Error(`${label} failed after retries`);
  }

  private async disconnectInternal(): Promise<void> {
    // Broadcast awareness removal BEFORE tearing down handler/socket
    if (this._awareness) {
      removeAwarenessStates(
        this._awareness,
        [this.ydoc.clientID],
        'disconnect',
      );
    }

    this.cleanupAwareness();

    // Disconnect socket AFTER broadcasting removal
    this.socketClient?.disconnect();

    this.resetInternalState();
    this.send({ type: 'RESET' });
  }

  private resetInternalState(): void {
    this.socketClient = null;
    this.uncommittedUpdatesIdList = [];
    this.updateQueue = [];
    this.contentTobeAppliedQueue = [];
    this.isProcessing = false;
    this.roomKey = '';
    this.roomKeyBytes = null;
    this.isOwner = false;
  }
}
