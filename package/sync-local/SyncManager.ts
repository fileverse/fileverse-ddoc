/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs';
import { fromUint8Array, toUint8Array } from 'js-base64';
import { Awareness, removeAwarenessStates } from 'y-protocols/awareness.js';

import { SocketClient } from './socketClient';
import { crypto as cryptoUtils } from './crypto';
import { createAwarenessUpdateHandler } from './utils/createAwarenessUpdateHandler';
import { advanceFloor, shouldAuthorSnapshot } from './floor';
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
  ServerErrorCode,
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
  private encryptMirror: ((yjsUpdate: Uint8Array) => Promise<string>) | null =
    null;
  private fileKeyEpoch = 0;
  private mirrorIdleTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly MIRROR_IDLE_MS = 4000;
  private isOwner = false;
  private joinOnly = false;
  private updateQueue: Uint8Array[] = [];
  private contentTobeAppliedQueue: Array<{ data: string; id?: string }> = [];
  private isProcessing = false;
  private syncId = 0;
  private floor = 0;
  private updatesSinceSnapshot = 0;
  private isAuthoringSnapshot = false;
  private readonly SNAPSHOT_THRESHOLD = 100;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly FLUSH_INTERVAL_MS = 50;
  private readonly MAX_QUEUE_SIZE = 5;
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
    this.callbacksRef = config.callbacks;
    this.onLocalUpdate = config.onLocalUpdate;
  }

  /** Called by useSyncManager on every render to keep refs fresh */
  updateRefs(
    _services: CollabServices | undefined,
    callbacks: CollabCallbacks | undefined,
    onLocalUpdate?: (updatedDocContent: string, updateChunk: string) => void,
  ) {
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

  // reconnectAttempt is a user-facing retry count and may reset between cycles.
  // syncId is monotonic, so async sync work cannot become current again
  // after a later reconnect happens to reuse the same retry attempt number.
  private beginSyncAttempt(): number {
    this.syncId += 1;
    return this.syncId;
  }

  // Async sync work can finish after a socket drop starts a newer reconnect sync.
  // Keep the captured generation current before applying updates or moving to
  // ready, so stale initial/reconnect syncs cannot finalize late.
  private isCurrentSyncAttempt(syncId: number): boolean {
    return this._status === 'syncing' && this.syncId === syncId;
  }

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

  private runExitActions(_from: CollabStatus, to: CollabStatus): void {
    // Awareness is preserved during reconnection (ready → reconnecting).
    // The SocketClient object and roomKey stay the same, so the handler
    // closures remain valid.  Remote cursors are already cleaned up by
    // socketClient's disconnect handler; local state is re-broadcast on
    // the 'reconnect' event.  Only tear down awareness on full disconnect.
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
    this.joinOnly = config.joinOnly ?? false;

    this.encryptMirror = config.encryptMirror ?? null;
    this.fileKeyEpoch = config.fileKeyEpoch ?? 0;

    this.socketClient = new SocketClient({
      wsUrl: config.wsUrl,
      roomKey: config.roomKey,
      roomId: config.roomId,
      ownerEdSecret: config.ownerEdSecret,
      contractAddress: config.contractAddress,
      ownerAddress: config.ownerAddress,
      ownerIdentityDid: config.ownerIdentityDid,
      editLock: config.editLock,
      encryptedTitle: config.encryptedTitle,
      identityToken: config.identityToken,
      identityContractAddress: config.identityContractAddress,
      editUcan: config.editUcan,
      refreshEditClaim: config.refreshEditClaim,
      actorHandle: config.actorHandle,
      joinOnly: config.joinOnly,
      onHandshakeData: this.callbacksRef?.onHandshakeData,
      roomInfo: config.roomInfo,
    });

    this.send({ type: 'CONNECT' });

    let syncId: number | null = null;

    try {
      await this.connectSocket();
      // After successful handshake, transition to syncing
      this.send({ type: 'AUTH_SUCCESS' });
      syncId = this.beginSyncAttempt();

      await this.hydrate(syncId);

      if (!this.isCurrentSyncAttempt(syncId)) {
        return;
      }

      // Yield to allow React to render the unmerged-updates toast
      await new Promise((resolve) => setTimeout(resolve, 0));

      if (!this.isCurrentSyncAttempt(syncId)) {
        return;
      }

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

      if (this.isOwner) {
        this.socketClient?.setDocumentMeta().catch((err) => {
          console.error('SyncManager: document meta upload failed', err);
        });
      }
    } catch (err) {
      if (syncId !== null && !this.isCurrentSyncAttempt(syncId)) {
        return;
      }
      console.error('SyncManager: connect failed', err);
      const error = err instanceof Error ? err : new Error(String(err));
      this.handleConnectionError(error);
    }
  }

  async disconnect(): Promise<void> {
    if (this._status === 'idle' || this._status === 'terminated') return;
    await this.awaitFlush();
    await this.disconnectInternal();
  }

  /** Owner rename mid-session — see SocketClient.updateDocumentMeta. */
  async updateTitle(args: {
    encryptedTitle: string;
    documentTitle: string;
  }): Promise<void> {
    await this.socketClient?.updateDocumentMeta(args);
  }

  async terminateSession(): Promise<void> {
    if (this._status === 'idle') return;
    await this.awaitFlush();

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
    if (this._status !== 'ready' || this.isProcessing) return;

    // Flush immediately if queue is full
    if (this.updateQueue.length >= this.MAX_QUEUE_SIZE) {
      this.flushUpdates();
      return;
    }

    // Start/reset flush timer to batch rapid updates
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(
      () => this.flushUpdates(),
      this.FLUSH_INTERVAL_MS,
    );
  }

  private flushUpdates(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.sendUpdateBatch();
  }

  private async awaitFlush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.updateQueue.length === 0 || !this.roomKey || !this.isConnected)
      return;

    const updates = this.updateQueue;
    this.updateQueue = [];
    const encrypted = cryptoUtils.encryptData(
      this.roomKeyBytes!,
      Y.mergeUpdates(updates),
    );
    try {
      // Bounded by the socket client's own emit timeout; we await the ACK so a graceful
      // unmount/route-change does not drop the last batch (the pre-existing bug).
      await this.socketClient?.sendUpdate({ update: encrypted });
    } catch (err) {
      console.error('SyncManager: awaitFlush send failed', err);
    }
  }

  /**
   * Fire-and-forget: merge all queued updates, encrypt, and emit via Socket.IO
   * without awaiting the server ACK. The server broadcasts to peers immediately
   * (before MongoDB write), so content reaches observers in near-real-time.
   */
  private sendUpdateBatch(): void {
    if (this.updateQueue.length === 0 || !this.roomKey || !this.isConnected) {
      return;
    }

    const updates = this.updateQueue;
    this.updateQueue = [];

    const merged = Y.mergeUpdates(updates);
    const encrypted = cryptoUtils.encryptData(this.roomKeyBytes!, merged);

    this.socketClient
      ?.sendUpdate({ update: encrypted })
      .then((response) => {
        if (!response?.status) {
          if (this.isRevocationResponse(response)) {
            // Soft revocation: re-queue the unacked updates ahead of anything queued since, then
            // reconnect to re-mint. No queue loss; a real demote re-surfaces as a terminal handshake 403.
            this.updateQueue = [...updates, ...this.updateQueue];
            this.handleWriteRevocation(response);
            return;
          }
          console.error('SyncManager: server rejected update', response?.error);
          return;
        }
        this.maybeAuthorSnapshotAfterSend();
      })
      .catch((err) => {
        console.error('SyncManager: update send failed', err);
      });
  }

  private isRevocationResponse(response?: {
    statusCode?: number;
    errorCode?: ServerErrorCode;
  }): boolean {
    return (
      response?.statusCode === 403 &&
      (response.errorCode === ServerErrorCode.JOIN_DISABLED ||
        response.errorCode === ServerErrorCode.EDIT_REVOKED)
    );
  }

  private classifyRevocation(_response?: {
    statusCode?: number;
    errorCode?: ServerErrorCode;
  }): 'soft' | 'terminal' {
    // A write-time 403 EDIT_REVOKED/JOIN_DISABLED can't be told apart from a merely-stale claim,
    // so every live-write revocation is soft: reconnect + re-mint. Terminality is decided at the
    // handshake, where a demoted refresher yields no token and the server 403 is final.
    return 'soft';
  }

  private handleWriteRevocation(response?: {
    statusCode?: number;
    errorCode?: ServerErrorCode;
  }): void {
    if (this.classifyRevocation(response) === 'terminal') {
      this.send({ type: 'SESSION_TERMINATED', reason: 'EDIT_REVOKED' });
      return;
    }
    // Soft: leave the live-write states first so no further writes escape, then reconnect to
    // force a fresh handshake (re-minting the editUcan via refreshEditClaim).
    if (this._status === 'ready' || this._status === 'syncing') {
      this.send({ type: 'SOCKET_DROPPED' });
    }
    this.socketClient?.reauth();
  }

  // Count a successfully-sent update toward the snapshot cadence and author a snapshot once
  // the threshold is crossed. Called from every send path — the live batch, the reconnect
  // drain, and the full-state rebroadcast — so the reconnect tail can bound itself instead
  // of growing forever. authorSnapshot's own isAuthoringSnapshot/syncId guards keep the
  // fire-and-forget re-entrant-safe when triggered mid-hydrate.
  private maybeAuthorSnapshotAfterSend(): void {
    this.updatesSinceSnapshot += 1;
    if (
      shouldAuthorSnapshot({
        isOwner: this.isOwner,
        updatesSinceLastSnapshot: this.updatesSinceSnapshot,
        threshold: this.SNAPSHOT_THRESHOLD,
      })
    ) {
      this.authorSnapshot(null, this.syncId).catch((err) => {
        console.error('SyncManager: snapshot authoring failed', err);
      });
    }
    this.scheduleMirror();
  }

  // View plane: any connected editor writes a fileKey-encrypted full-state snapshot on an
  // editing-idle debounce (trailing) — active editing keeps resetting the timer, so exactly
  // one write lands once typing pauses. Best-effort; NOT owner-gated (unlike authorSnapshot).
  private scheduleMirror(): void {
    if (!this.encryptMirror) return;
    if (this.mirrorIdleTimer) clearTimeout(this.mirrorIdleTimer);
    this.mirrorIdleTimer = setTimeout(() => {
      this.authorMirror().catch((err) =>
        console.error('SyncManager: mirror authoring failed', err),
      );
    }, this.MIRROR_IDLE_MS);
  }

  private async authorMirror(): Promise<void> {
    if (!this.encryptMirror || !this.isConnected) return;
    // The app's closure AES-GCM-encrypts { file, source } under the fileKey in the publish wire
    // format, so a viewer reads it with the same penumbraDecryptFileGP path. The package
    // supplies the live full-state; it never sees the fileKey or the crypto.
    const data = await this.encryptMirror(Y.encodeStateAsUpdate(this.ydoc));
    await this.socketClient?.sendMirrorSnapshot({
      data,
      fileKeyEpoch: this.fileKeyEpoch,
    });
  }

  // The final merged delta for a hard tab-close beacon: any queued-but-unsent updates,
  // merged and encrypted. Returns null when there is nothing pending.
  buildPendingBeaconPayload(): string | null {
    if (this.updateQueue.length === 0 || !this.roomKeyBytes) return null;
    const merged = Y.mergeUpdates(this.updateQueue);
    return cryptoUtils.encryptData(this.roomKeyBytes, merged);
  }

  fireBeacon(): void {
    const payload = this.buildPendingBeaconPayload();
    if (payload) this.socketClient?.flushBeacon(payload);
  }

  forceCleanup(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.mirrorIdleTimer) {
      clearTimeout(this.mirrorIdleTimer);
      this.mirrorIdleTimer = null;
    }
    // Route-change/unmount can't await and the socket is about to close, so beacon the
    // last batch (keepalive survives teardown) and clear the queue so an awaited flush
    // on another teardown path can't double-send it.
    this.fireBeacon();
    this.updateQueue = [];
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
    const reconnected = this.send({ type: 'RECONNECTED' });
    if (!reconnected) return;

    const syncId = this.beginSyncAttempt();

    try {
      await this.hydrate(syncId);

      if (!this.isCurrentSyncAttempt(syncId)) {
        return;
      }

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
      if (!this.isCurrentSyncAttempt(syncId)) {
        return;
      }
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
            if (this._status === 'ready' || this._status === 'syncing') {
              this.send({ type: 'SOCKET_DROPPED' });
            }
          },
          onHandShakeError: (e, statusCode, errorCode) => {
            // Join-only (workspace member) connections degrade quietly: every handshake
            // rejection is a terminal no-session outcome, never an error surface. The
            // distinct ROOM_NOT_ESTABLISHED reason lets the host render read-only until
            // the creator establishes the room; a 403 revocation means the owner turned
            // whole-team editing off (the post-kick reconnect exists to learn exactly
            // this), so the host can surface it instead of a generic rejection.
            if (this.joinOnly) {
              this.socketClient?.disconnect();
              this.resetInternalState();
              this.send({
                type: 'SESSION_TERMINATED',
                reason:
                  errorCode === ServerErrorCode.ROOM_NOT_ESTABLISHED
                    ? 'ROOM_NOT_ESTABLISHED'
                    : statusCode === 403 &&
                        (errorCode === ServerErrorCode.JOIN_DISABLED ||
                          errorCode === ServerErrorCode.EDIT_REVOKED)
                      ? 'WORKSPACE_EDIT_DISABLED'
                      : 'JOIN_REJECTED',
              });
              if (!settled) {
                settled = true;
                resolve();
              }
              return;
            }
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

            if (
              statusCode === 403 &&
              (errorCode === ServerErrorCode.JOIN_DISABLED ||
                errorCode === ServerErrorCode.EDIT_REVOKED)
            ) {
              this.socketClient?.disconnect();
              this.resetInternalState();
              this.send({ type: 'SESSION_TERMINATED', reason: 'EDIT_REVOKED' });
              if (!settled) {
                settled = true;
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
          onPresenceChange: (collaborators) => {
            this.callbacksRef?.onCollaboratorsChange?.(collaborators);
          },
          onTitleUpdate: (encryptedTitle) => {
            this.callbacksRef?.onTitleUpdate?.(encryptedTitle);
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
            } else if (this._status === 'ready' || this._status === 'syncing') {
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
            // Only real disconnects should recover syncing via onSocketDropped.
            // Server errors can arrive while the socket stays connected.
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

  private decodeInto(target: Uint8Array[], encrypted: string): void {
    try {
      target.push(cryptoUtils.decryptData(this.roomKeyBytes!, encrypted));
    } catch (err) {
      // Undecryptable rows (e.g. a guessed-documentId injection) are skipped, not fatal.
      console.warn(
        'SyncManager: failed to decrypt hydration row, skipping',
        err,
      );
    }
  }

  // Pull the server's snapshot + seq-tail from the current floor, apply it to the Y.Doc,
  // and advance the floor. Paginates until the server reports no more. Returns whether any
  // tail row was applied (used to flag unmerged peer content to the owner).
  private async catchUpFloor(syncId: number): Promise<boolean> {
    // Also valid in steady state (ready) for the SAME generation, so authorSnapshot can
    // advance the floor before stamping; the syncId check still bails a superseded attempt.
    const syncStillCurrent = () =>
      this.isCurrentSyncAttempt(syncId) ||
      (this.isReady && this.syncId === syncId);
    let sinceSeq: number | undefined = this.floor > 0 ? this.floor : undefined;
    let appliedTail = false;

    for (; ;) {
      const res = await this.socketClient?.fetchHydrationRange(sinceSeq);
      if (!syncStillCurrent()) return appliedTail;
      const d = res?.data;
      if (!d) return appliedTail;

      const updates: Uint8Array[] = [];
      const pageSeqs: number[] = [];
      for (const row of d.history) {
        this.decodeInto(updates, row.data);
        if (row.updateType !== 'snapshot' && typeof row.seq === 'number') {
          pageSeqs.push(row.seq);
        }
      }
      if (updates.length) {
        Y.applyUpdate(this.ydoc, Y.mergeUpdates(updates), 'self');
        appliedTail = appliedTail || pageSeqs.length > 0;
      }

      const snapFloor =
        d.snapshot && typeof d.snapshot.floorSeq === 'number'
          ? d.snapshot.floorSeq
          : 0;
      this.floor = advanceFloor(Math.max(this.floor, snapFloor), pageSeqs);

      if (d.hasMore && typeof d.nextSeq === 'number') {
        sinceSeq = d.nextSeq;
        continue;
      }
      return appliedTail;
    }
  }

  // Owner-only. Advance the floor with a catch-up read so the stamp is current, then
  // upload the full Y.Doc state stamped with that floor. The server serves the tail as
  // seq > floorSeq, so a concurrent writer's update the author never applied is
  // re-served rather than orphaned below the snapshot's own seq.
  private async authorSnapshot(
    publishedMarker: string | null,
    syncId: number,
  ): Promise<void> {
    if (!this.isOwner || !this.isConnected) return;
    if (this.isAuthoringSnapshot) return;
    this.isAuthoringSnapshot = true;
    try {
      const syncStillCurrent = () =>
        this.isCurrentSyncAttempt(syncId) || this.isReady;

      await this.catchUpFloor(syncId);
      if (!syncStillCurrent() || this.floor <= 0) return;

      const data = cryptoUtils.encryptData(
        this.roomKeyBytes!,
        Y.encodeStateAsUpdate(this.ydoc),
      );
      const res = await this.socketClient?.sendSnapshot({
        data,
        floorSeq: this.floor,
        publishedMarker,
      });
      if (res?.status) {
        this.updatesSinceSnapshot = 0;
      }
    } finally {
      this.isAuthoringSnapshot = false;
    }
  }

  private async hydrate(syncId: number): Promise<void> {
    const syncStillCurrent = () => this.isCurrentSyncAttempt(syncId);

    await this.withRetry(async () => {
      const appliedTail = await this.catchUpFloor(syncId);
      if (!syncStillCurrent()) return;

      if (appliedTail && this.isOwner) {
        this.send({ type: 'SET_UNMERGED_UPDATES', hasUpdates: true });
      }

      // Broadcast post-sync local-only state so peers receive items that exist only
      // locally (e.g. tab metadata created with a fresh clientID after a refresh).
      const postSync = fromUint8Array(Y.encodeStateAsUpdate(this.ydoc));
      if (!syncStillCurrent()) return;
      await this.broadcastLocalContents(postSync, syncId);
    }, 'hydrate');
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

  private async broadcastLocalContents(
    unbroadcastedUpdate: string | null,
    syncId: number,
  ): Promise<void> {
    const syncStillCurrent = () => this.isCurrentSyncAttempt(syncId);

    if (!unbroadcastedUpdate) return;

    const updateToSend = cryptoUtils.encryptData(
      this.roomKeyBytes!,
      toUint8Array(unbroadcastedUpdate),
    );
    if (!syncStillCurrent()) return;

    const response = await this.socketClient?.sendUpdate({
      update: updateToSend,
    });
    if (!syncStillCurrent()) return;

    if (!response?.status) {
      if (this.isRevocationResponse(response)) {
        this.handleWriteRevocation(response);
        return;
      }
      const errorMsg = response?.error || 'Server rejected update';
      throw new Error(
        `Failed to broadcast local contents: ${errorMsg}${response?.statusCode ? ` (${response.statusCode})` : ''}`,
      );
    }
    this.maybeAuthorSnapshotAfterSend();
  }

  private async processUpdateQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.updateQueue.length > 0) {
        // Drain only while actively writable. A soft revocation reroutes to `reconnecting`
        // (bouncing the socket to re-mint the edit claim); stop here rather than send on the
        // dropped socket — the reconnect resumes the drain with the queue intact.
        if (this._status !== 'ready' && this._status !== 'syncing') break;
        await this.processNextUpdate();
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
          if (this.isRevocationResponse(response)) {
            this.handleWriteRevocation(response);
            return;
          }
          const errorMsg = response?.error || 'Server rejected update';
          throw new Error(
            `Failed to send update: ${errorMsg}${response?.statusCode ? ` (${response.statusCode})` : ''}`,
          );
        }

        // Remove processed updates from queue
        this.updateQueue = this.updateQueue.slice(queueOffset);
        this.maybeAuthorSnapshotAfterSend();
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

    this.applyRemoteYjsUpdate(payload.data);
  }

  private applyRemoteYjsUpdate(encrypted: string): void {
    if (!this.ydoc) return;

    let update: Uint8Array;
    try {
      update = cryptoUtils.decryptData(this.roomKeyBytes!, encrypted);
    } catch (err) {
      console.warn('SyncManager: failed to decrypt update, skipping', err);
      return;
    }

    try {
      Y.applyUpdate(this.ydoc, update, 'remote');
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
      Y.applyUpdate(this.ydoc, mergedContents, 'remote');
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
        if (!this.isConnected && label !== 'hydrate') break;
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
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.mirrorIdleTimer) {
      clearTimeout(this.mirrorIdleTimer);
      this.mirrorIdleTimer = null;
    }
    this.socketClient = null;
    this.updateQueue = [];
    this.contentTobeAppliedQueue = [];
    this.isProcessing = false;
    this.roomKey = '';
    this.roomKeyBytes = null;
    this.isOwner = false;
    this.floor = 0;
    this.updatesSinceSnapshot = 0;
    this.isAuthoringSnapshot = false;
  }
}
