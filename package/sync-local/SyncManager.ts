/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs';
import { fromUint8Array, toUint8Array } from 'js-base64';
import { Awareness, removeAwarenessStates } from 'y-protocols/awareness.js';

import { SocketClient } from './socketClient';
import { crypto as cryptoUtils } from './crypto';
import { createAwarenessUpdateHandler } from './utils/createAwarenessUpdateHandler';
import {
  advanceFloor,
  computeLocalOnlyUpdate,
  shouldAuthorSnapshot,
} from './floor';
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

// 'rekeyed': a new key was resolved and applied. 'current-key-ok': the resolved key already
// matches what we hold — nothing to rekey, but the miss/409 that triggered the heal isn't a
// rotation-lag problem. 'failed': no key resolved, or the heal threw.
type HealOutcome = 'rekeyed' | 'current-key-ok' | 'failed';

// Accumulator for one hydration walk: the merged decrypted log content (drives the
// local-only diff) and the walk's size (drives the compaction decision).
interface HydrationWalk {
  merged: Uint8Array | null;
  pages: number;
  tailRows: number;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export class SyncManager {
  // --- State machine ---
  private _status: CollabStatus = 'idle';
  private _context: CollabContext = { ...INITIAL_CONTEXT };
  private _awareness: Awareness | null = null;

  // --- Internal state ---
  private socketClient: SocketClient | null = null;
  private roomKey = '';
  private roomKeyBytes: Uint8Array | null = null;
  // Set while an in-place roomKey rotation's re-auth is in flight — dispatch pauses (edits
  // still enqueue) so nothing goes out under a mismatched key. Cleared in rekey()'s finally.
  private rotating = false;
  // Prior roomKey bytes during a rotation's dual-decrypt window (consumed by the self-heal
  // path for stragglers still encrypting under the old key). Stays set after a successful rekey.
  private roomKeyBytesPrev: Uint8Array | null = null;
  // Rotation key resolved at PREPARE, epoch-tagged and held until the server signals
  // CUTOVER for that same epoch. An epoch mismatch at cutover means this key was PREPARE'd
  // for a since-superseded rotation — discarded rather than applied.
  private pendingRotationKey: {
    key: string;
    epoch: number;
    appLock?: string;
    editUcan?: string;
  } | null = null;
  // In-flight decrypt-miss self-heal, shared so concurrent callers (a write-409 racing an
  // inbound decrypt miss) join the same outcome instead of one bailing false while the
  // other converges.
  private healingPromise: Promise<HealOutcome> | null = null;
  // Bounds the "resend once on a stale current-key-ok 409" retry shared by the write-ack
  // paths below, so a genuinely-stuck client can't loop. Reset on any successful ack.
  private staleAckRetries = 0;
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
  private tailCompactTimer: ReturnType<typeof setTimeout> | null = null;
  // Compact when the hydration walk needed more than one page (>~9MB of tail) or the
  // row count alone makes replay expensive.
  private readonly TAIL_COMPACT_PAGES = 2;
  private readonly TAIL_COMPACT_ROWS = 200;
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
      editLock: config.editLock,
      encryptedTitle: config.encryptedTitle,
      identityToken: config.identityToken,
      editUcan: config.editUcan,
      refreshEditClaim: config.refreshEditClaim,
      onRotationPrepare: config.onRotationPrepare,
      actorHandle: config.actorHandle,
      joinOnly: config.joinOnly,
      onHandshakeData: this.callbacksRef?.onHandshakeData,
      roomInfo: config.roomInfo,
      onEpochAvailable: async (data: { epoch: number; payload: string }) => {
        try {
          const inner = JSON.parse(
            new TextDecoder().decode(
              cryptoUtils.decryptData(this.roomKeyBytes!, data.payload),
            ),
          ) as { epoch: number; gp: string; appLock?: string };
          const prepared = config.onRotationPrepare
            ? await config.onRotationPrepare(inner)
            : null;
          const newRoomKey =
            typeof prepared === 'string' ? prepared : prepared?.roomKey;
          if (newRoomKey) {
            // Carry the relay's re-locked appLock config with the key — applied to editLock at
            // cutover (workspace-key encrypted, so it can't be re-keyed locally). Held until
            // cutover. Same for the gate-minted new-epoch editUcan when the host resolved one:
            // the cutover re-auth must present it (a refreshEditClaim re-mint can race the
            // deferred publish and return a stale-epoch claim).
            this.pendingRotationKey = {
              key: newRoomKey,
              epoch: data.epoch,
              appLock: inner.appLock,
              editUcan:
                typeof prepared === 'object' && prepared !== null
                  ? prepared.editUcan
                  : undefined,
            };
            await this.socketClient?.ackEpochLoaded(config.roomId, data.epoch);
          }
        } catch (e) {
          console.error(
            'SyncManager: PREPARE failed; will self-heal at cutover',
            e,
          );
        }
      },
      onCutover: async (data: { roomId: string; epoch: number }) => {
        if (
          this.pendingRotationKey &&
          this.pendingRotationKey.epoch === data.epoch
        ) {
          const k = this.pendingRotationKey.key;
          const appLock = this.pendingRotationKey.appLock;
          const editUcan = this.pendingRotationKey.editUcan;
          this.pendingRotationKey = null;
          await this.rekey(k, appLock, editUcan).catch((e) => {
            console.error('SyncManager: cutover rekey failed', e);
          });
        } else {
          // Either PREPARE never yielded a key, or the held key was PREPARE'd for a
          // since-superseded rotation (epoch mismatch) — discard it rather than apply a
          // stale key. Either way the old room is about to go silent — heal now rather
          // than waiting on inbound traffic that will never arrive.
          this.pendingRotationKey = null;
          void this.onDecryptMiss();
        }
      },
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

  /** In-place roomKey migration on CUTOVER: pause dispatch, swap the key, re-auth the same
   *  socket, re-broadcast awareness, then flush. See SocketClient.rekey for the wire side. */
  async rekey(
    newRoomKey: string,
    newAppLock?: string,
    newEditUcan?: string,
  ): Promise<void> {
    if (this.rotating) return;
    // 'connecting'/'reconnecting' included: the terminated-JOIN self-heal can call this
    // before the handshake has ever completed, or mid-reconnect.
    if (
      this._status !== 'ready' &&
      this._status !== 'syncing' &&
      this._status !== 'connecting' &&
      this._status !== 'reconnecting'
    ) {
      return;
    }

    this.rotating = true;
    const prevRoomKey = this.roomKey;
    this.roomKeyBytesPrev = this.roomKeyBytes; // dual-decrypt window
    // Swap FIRST: inbound new-session traffic arriving during the re-auth round-trip must
    // decrypt with the NEW key (old stragglers ride roomKeyBytesPrev). Outbound is paused by
    // `rotating`, so nothing goes out under a mismatched key.
    this.roomKey = newRoomKey;
    this.roomKeyBytes = toUint8Array(newRoomKey);

    try {
      await this.socketClient?.rekey(newRoomKey, newAppLock, newEditUcan);
      // Same Awareness instance + clientID — only the outbound broadcast handler is rebound,
      // since it closes over roomKey by value (createAwarenessUpdateHandler) and won't pick up
      // the swap on its own. Re-stamping local state after rebinding re-broadcasts under the
      // new key.
      if (this._awareness && this.socketClient) {
        if (this._awarenessUpdateHandler) {
          this._awareness.off('update', this._awarenessUpdateHandler);
        }
        const handler = createAwarenessUpdateHandler(
          this._awareness,
          this.socketClient,
          this.roomKey,
        );
        this._awareness.on('update', handler);
        this._awarenessUpdateHandler = handler;
        this._awareness.setLocalState(this._awareness.getLocalState());
      }
      if (this.isOwner) {
        // socketClient.rekey adopted the relay's re-locked editLock; re-broadcast meta so
        // joiners pick it up (the roomKey-encrypted title rides along, refreshed on next rename).
        this.socketClient?.setDocumentMeta().catch(() => undefined);
      }
    } catch (e) {
      // Re-auth failed and SocketClient reverted its own key material — revert ours too; the
      // self-heal path retries from scratch.
      this.roomKey = prevRoomKey;
      this.roomKeyBytes = this.roomKeyBytesPrev;
      this.roomKeyBytesPrev = null;
      throw e;
    } finally {
      this.rotating = false;
      if (this.updateQueue.length > 0) {
        this.processUpdateQueue().catch((err) => {
          console.error('SyncManager: post-rekey flush failed', err);
        });
      }
    }
  }

  // A row that decrypts under neither roomKeyBytes nor roomKeyBytesPrev means this peer
  // missed the rotation entirely (no PREPARE, or onRotationPrepare couldn't resolve a key).
  // Fetch the current-epoch key from the host and rekey once, rather than dropping rows
  // forever. `rotating` guard stops a heal firing mid-rekey — callers on the write path
  // check `rotating` themselves before calling in, so they can defer instead of bailing.
  // A caller that arrives while a heal is already in flight joins that same promise rather
  // than racing an independent one.
  private onDecryptMiss(): Promise<HealOutcome> {
    if (this.healingPromise) return this.healingPromise;
    const selfHeal = this.callbacksRef?.onRotationSelfHeal;
    if (this.rotating || !selfHeal) return Promise.resolve('failed');

    this.healingPromise = (async (): Promise<HealOutcome> => {
      try {
        const newRoomKey = await selfHeal();
        if (!newRoomKey) return 'failed';
        // Compare decoded bytes, not base64 text — a standard-vs-urlsafe encoding mismatch
        // between the host and this key must not read as "different key".
        if (
          this.roomKeyBytes &&
          bytesEqual(toUint8Array(newRoomKey), this.roomKeyBytes)
        ) {
          // Already on the resolved key: nothing to rekey. Whatever triggered this heal
          // (a decrypt miss, a write 409) isn't a rotation-lag problem this can fix.
          return 'current-key-ok';
        }
        await this.rekey(newRoomKey);
        return 'rekeyed';
      } catch (e) {
        console.error('SyncManager: rotation self-heal failed', e);
        return 'failed';
      } finally {
        this.healingPromise = null;
      }
    })();
    return this.healingPromise;
  }

  enqueueLocalUpdate(update: Uint8Array): void {
    this.updateQueue.push(update);
    // Rotation in flight: keep enqueuing (drained by rekey()'s post-cutover flush) but skip
    // dispatch — the editor stays editable, only the wire pauses.
    if (this._status !== 'ready' || this.isProcessing || this.rotating) return;

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
    if (
      this.updateQueue.length === 0 ||
      !this.roomKey ||
      !this.isConnected ||
      this.rotating
    )
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
    if (
      this.updateQueue.length === 0 ||
      !this.roomKey ||
      !this.isConnected ||
      this.rotating
    ) {
      return;
    }

    const updates = this.updateQueue;
    this.updateQueue = [];

    const merged = Y.mergeUpdates(updates);
    const encrypted = cryptoUtils.encryptData(this.roomKeyBytes!, merged);

    void this.sendUpdateBatchAttempt(updates, encrypted);
  }

  // Extracted from sendUpdateBatch so a 'current-key-ok' 409 (a stale ack for a pre-rotation
  // send that lands after we're already on the current key) can retry once by recursing,
  // without duplicating the response handling.
  private async sendUpdateBatchAttempt(
    updates: Uint8Array[],
    encrypted: string,
  ): Promise<void> {
    try {
      const response = await this.socketClient?.sendUpdate({
        update: encrypted,
      });
      if (!response?.status) {
        if (this.isRevocationResponse(response)) {
          // Soft revocation: re-queue the unacked updates ahead of anything queued since, then
          // reconnect to re-mint. No queue loss; a real demote re-surfaces as a terminal handshake 403.
          this.updateQueue = [...updates, ...this.updateQueue];
          this.handleWriteRevocation();
          return;
        }
        if (this.isSessionTerminatedResponse(response)) {
          if (this.rotating) {
            // A cutover is already in flight under us — leave the batch queued; rekey's own
            // finally re-drains once it completes. Not a terminal condition.
            this.updateQueue = [...updates, ...this.updateQueue];
            return;
          }
          const outcome = await this.onDecryptMiss();
          if (outcome === 'rekeyed') {
            this.staleAckRetries = 0;
            this.updateQueue = [...updates, ...this.updateQueue];
            return;
          }
          if (outcome === 'current-key-ok' && this.staleAckRetries < 1) {
            this.staleAckRetries += 1;
            // Re-encrypt under whatever key is live now — `encrypted` may predate a rekey
            // that completed elsewhere (e.g. a joined healingPromise) while this send was
            // in flight; resending it would land old-key ciphertext in the new session's
            // durable log, undecryptable to fresh joiners.
            const freshEncrypted = cryptoUtils.encryptData(
              this.roomKeyBytes!,
              Y.mergeUpdates(updates),
            );
            await this.sendUpdateBatchAttempt(updates, freshEncrypted);
            return;
          }
          this.surfaceSessionTerminated('SESSION_TERMINATED');
          return;
        }
        console.error('SyncManager: server rejected update', response?.error);
        return;
      }
      this.staleAckRetries = 0;
      this.maybeAuthorSnapshotAfterSend();
    } catch (err) {
      console.error('SyncManager: update send failed', err);
    }
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

  // A write ack'd 409/SESSION_TERMINATED means this session's old sessionDid was cut over
  // out from under an in-flight write — distinct from isRevocationResponse's 403s, and the
  // fix is a decrypt-miss self-heal, not a reconnect.
  private isSessionTerminatedResponse(response?: {
    statusCode?: number;
    errorCode?: ServerErrorCode;
  }): boolean {
    return (
      response?.statusCode === 409 &&
      response.errorCode === ServerErrorCode.SESSION_TERMINATED
    );
  }

  private classifyRevocation(): 'soft' | 'terminal' {
    // A write-time 403 EDIT_REVOKED/JOIN_DISABLED can't be told apart from a merely-stale claim,
    // so every live-write revocation is soft: reconnect + re-mint. Terminality is decided at the
    // handshake, where a demoted refresher yields no token and the server 403 is final.
    return 'soft';
  }

  private handleWriteRevocation(): void {
    if (this.classifyRevocation() === 'terminal') {
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

  // Terminal kick shared by every path that gives up on a session for good: a decrypt-miss
  // self-heal that couldn't resolve a key, or a terminated-JOIN reconnect with nothing to
  // heal into. Bounded — never loops the caller back into more sends.
  private surfaceSessionTerminated(reason: string): void {
    this.socketClient?.disconnect();
    this.resetInternalState();
    this.send({ type: 'SESSION_TERMINATED', reason });
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
        canAuthor: !this.joinOnly,
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
      // One-shot per connect attempt: connectSocket() runs once per SyncManager.connect(),
      // so this covers every socket.io-internal reconnect within that attempt too.
      let selfHealAttempted = false;

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
              const surfaceSessionNotFound = () => {
                this.surfaceSessionTerminated('Session not found');
                if (!settled) {
                  settled = true;
                  // Don't reject — the state machine handles this
                  resolve();
                }
              };

              // A laggard that was offline for a rotation reconnects and re-auths into its
              // OLD sessionDid — the server has already terminated it (SESSION_NOT_FOUND).
              // Try self-heal once before the terminal kick; a genuinely revoked or
              // never-established session still falls through to it.
              if (
                !selfHealAttempted &&
                !this.rotating &&
                this.callbacksRef?.onRotationSelfHeal
              ) {
                selfHealAttempted = true;
                void this.callbacksRef
                  .onRotationSelfHeal()
                  .then((newRoomKey) => {
                    if (!newRoomKey) {
                      throw new Error('no rotation key available');
                    }
                    return this.rekey(newRoomKey);
                  })
                  .then(() => {
                    if (!settled) {
                      settled = true;
                      resolve();
                      return;
                    }
                    // Reconnect case: settled already, so drive it exactly like a normal
                    // post-drop handshake success would.
                    if (this._status !== 'reconnecting') {
                      this.send({ type: 'SOCKET_DROPPED' });
                    }
                    this.handleReconnection();
                  })
                  .catch((e) => {
                    console.error(
                      'SyncManager: terminated-join self-heal failed',
                      e,
                    );
                    surfaceSessionNotFound();
                  });
                return;
              }

              surfaceSessionNotFound();
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
          onSessionTerminated: async () => {
            // A live-socket push of this event during a NORMAL rotation is reachable two
            // ways: a peer that PREPARE'd, blipped, and re-authed into the still-draining
            // OLD session (missing the one-shot cutover; termination fires once the drain
            // window elapses), or a connected laggard whose onCutover keyless self-heal is
            // still awaiting when termination lands (`rotating` still false during that
            // await — onDecryptMiss's own healingPromise join covers that race). Try the
            // same heal once before kicking; only a heal that can't recover a live session
            // falls through, so a genuine owner-termination still kicks.
            if (!this.rotating && this.callbacksRef?.onRotationSelfHeal) {
              const outcome = await this.onDecryptMiss();
              if (outcome === 'rekeyed') {
                // rekey() already re-authed into the live session; nothing else to do.
                return;
              }
              // 'failed', or 'current-key-ok' (already on the resolved key and STILL
              // swept — not a rotation lag, a real termination): fall through to the kick.
            }
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

  // Dual-decrypt window: a rotation cutover can land between a peer's PREPARE miss and its
  // next inbound row — try the current key, then the pre-rotation key, before giving up.
  private tryDecrypt(encrypted: string): Uint8Array | null {
    try {
      return cryptoUtils.decryptData(this.roomKeyBytes!, encrypted);
    } catch {
      if (this.roomKeyBytesPrev) {
        try {
          return cryptoUtils.decryptData(this.roomKeyBytesPrev, encrypted);
        } catch {
          /* fall through */
        }
      }
      return null;
    }
  }

  private decodeInto(target: Uint8Array[], encrypted: string): void {
    const decrypted = this.tryDecrypt(encrypted);
    if (!decrypted) {
      // Undecryptable rows (e.g. a guessed-documentId injection, or a genuine rotation
      // miss) are skipped, not fatal.
      console.warn('SyncManager: failed to decrypt hydration row, skipping');
      void this.onDecryptMiss();
      return;
    }
    target.push(decrypted);
  }

  // Pull the server's snapshot + seq-tail from the current floor, apply it to the Y.Doc,
  // and advance the floor. Paginates until the server reports no more. Returns whether any
  // tail row was applied (used to flag unmerged peer content to the owner). When `walk` is
  // given, accumulates the decrypted log content and walk stats for the caller.
  private async catchUpFloor(
    syncId: number,
    walk?: HydrationWalk,
  ): Promise<boolean> {
    // Also valid in steady state (ready) for the SAME generation, so authorSnapshot can
    // advance the floor before stamping; the syncId check still bails a superseded attempt.
    const syncStillCurrent = () =>
      this.isCurrentSyncAttempt(syncId) ||
      (this.isReady && this.syncId === syncId);
    let sinceSeq: number | undefined = this.floor > 0 ? this.floor : undefined;
    let appliedTail = false;

    for (;;) {
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
      if (walk) {
        walk.pages += 1;
        walk.tailRows += pageSeqs.length;
      }
      if (updates.length) {
        const pageMerged = Y.mergeUpdates(updates);
        Y.applyUpdate(this.ydoc, pageMerged, 'self');
        appliedTail = appliedTail || pageSeqs.length > 0;
        if (walk) {
          walk.merged = walk.merged
            ? Y.mergeUpdates([walk.merged, pageMerged])
            : pageMerged;
        }
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

  // Any writer (owner or admitted editor; the server rejects revoked actors). Advance
  // the floor with a catch-up read so the stamp is current, then upload the full Y.Doc
  // state stamped with that floor. The server serves the tail as seq > floorSeq, so a
  // concurrent writer's update the author never applied is re-served rather than
  // orphaned below the snapshot's own seq.
  private async authorSnapshot(
    publishedMarker: string | null,
    syncId: number,
  ): Promise<void> {
    if (this.joinOnly || !this.isConnected) return;
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
    // floor === 0 ⇒ first walk of this session generation (page load or post-reset): the
    // only walk that observes the log from its base and can prove what the server already
    // holds. A floor>0 walk (in-session reconnect) covers just the new tail — pending
    // local edits ride the update queue there, so no post-sync broadcast is needed.
    const fullWalk = this.floor === 0;
    const hadLocalState = this.ydoc.store.clients.size > 0;
    const walk: HydrationWalk = { merged: null, pages: 0, tailRows: 0 };

    await this.withRetry(async () => {
      const appliedTail = await this.catchUpFloor(syncId, walk);
      if (!syncStillCurrent()) return;

      if (appliedTail && this.isOwner) {
        this.send({ type: 'SET_UNMERGED_UPDATES', hasUpdates: true });
      }

      if (!fullWalk || !hadLocalState) return;
      // Broadcast ONLY what the log provably lacks (e.g. offline/IndexedDB edits, tab
      // metadata minted before connect) — never the full state: a full-state row per join
      // grew the durable log by one document copy per visit.
      const diff = computeLocalOnlyUpdate(this.ydoc, walk.merged);
      if (!diff) return;
      if (!syncStillCurrent()) return;
      await this.broadcastLocalContents(fromUint8Array(diff), syncId);
    }, 'hydrate');

    this.maybeCompactTail(walk);
  }

  // A tail that took multiple pages (or hundreds of rows) makes every future open pay
  // serial round-trips — whoever hydrated it and can write collapses it into one
  // snapshot. Jitter spreads simultaneous joiners; a lost race is harmless (snapshots
  // are keep-latest and floors monotone).
  private maybeCompactTail(walk: HydrationWalk): void {
    if (
      walk.pages < this.TAIL_COMPACT_PAGES &&
      walk.tailRows < this.TAIL_COMPACT_ROWS
    ) {
      return;
    }
    if (this.joinOnly) return;
    if (this.tailCompactTimer) clearTimeout(this.tailCompactTimer);
    this.tailCompactTimer = setTimeout(
      () => {
        this.tailCompactTimer = null;
        if (!this.isConnected) return;
        this.authorSnapshot(null, this.syncId).catch((err) => {
          console.error('SyncManager: tail compaction failed', err);
        });
      },
      1000 + Math.floor(Math.random() * 4000),
    );
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
        this.handleWriteRevocation();
        return;
      }
      if (this.isSessionTerminatedResponse(response)) {
        if (this.rotating) {
          // A cutover is already in flight — this one-shot broadcast is a recoverable
          // full-state rebroadcast, not worth blocking hydrate() on; just drop it.
          return;
        }
        const outcome = await this.onDecryptMiss();
        if (outcome === 'failed') {
          this.surfaceSessionTerminated('SESSION_TERMINATED');
        }
        // 'rekeyed' or 'current-key-ok': drop this broadcast either way — recoverable, and
        // not worth a retry the way a queued edit batch is.
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
        // A cutover can land mid-drain (this loop is `await`-suspended between iterations);
        // stop dispatching under a possibly-swapped key — rekey()'s own finally resumes the
        // drain once the re-auth settles.
        if (this.rotating) break;
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
    // Re-encrypted in place on a 'current-key-ok' retry below — the plaintext (`nextUpdate`)
    // doesn't change across a retry, but the key it's encrypted under might.
    let updateToSend = cryptoUtils.encryptData(this.roomKeyBytes!, nextUpdate);

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.socketClient?.sendUpdate({
          update: updateToSend,
        });

        if (!response?.status) {
          if (this.isRevocationResponse(response)) {
            this.handleWriteRevocation();
            return;
          }
          if (this.isSessionTerminatedResponse(response)) {
            if (this.rotating) {
              // A cutover started under us mid-drain — leave the batch queued (nothing
              // sliced off above) and stop here. processUpdateQueue's own `rotating` check
              // breaks the outer while loop on its next iteration; rekey()'s finally
              // re-drains once the cutover settles. Not a terminal condition.
              return;
            }
            // Await the heal outcome — this call sits in processUpdateQueue's while loop,
            // which would otherwise re-merge and re-send this same rejected batch forever.
            const outcome = await this.onDecryptMiss();
            if (outcome === 'rekeyed') {
              // Batch is still queued (nothing sliced above); the next drain iteration
              // resends it under the new key.
              this.staleAckRetries = 0;
              return;
            }
            if (outcome === 'current-key-ok' && this.staleAckRetries < 1) {
              // Stale ack for a pre-rotation send: we're already on the current key, so a
              // resend should succeed. Bounded to one retry — re-run this same attempt.
              // Re-encrypt first: `updateToSend` may predate a rekey that completed
              // elsewhere (e.g. a joined healingPromise) since this attempt started.
              this.staleAckRetries += 1;
              updateToSend = cryptoUtils.encryptData(
                this.roomKeyBytes!,
                nextUpdate,
              );
              continue;
            }
            this.surfaceSessionTerminated('SESSION_TERMINATED');
            return;
          }
          const errorMsg = response?.error || 'Server rejected update';
          throw new Error(
            `Failed to send update: ${errorMsg}${response?.statusCode ? ` (${response.statusCode})` : ''}`,
          );
        }

        // Remove processed updates from queue
        this.updateQueue = this.updateQueue.slice(queueOffset);
        this.staleAckRetries = 0;
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

    const update = this.tryDecrypt(encrypted);
    if (!update) {
      console.warn('SyncManager: failed to decrypt update, skipping');
      void this.onDecryptMiss();
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
    let missed = false;

    for (const item of this.contentTobeAppliedQueue) {
      const decrypted = this.tryDecrypt(item.data);
      if (!decrypted) {
        console.warn(
          'SyncManager: failed to decrypt queued remote content, skipping',
        );
        missed = true;
        continue;
      }
      decryptedContents.push(decrypted);
      if (item.id) {
        queuedUpdateIds.push(item.id);
      }
    }
    if (missed) void this.onDecryptMiss();

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
    if (this.tailCompactTimer) {
      clearTimeout(this.tailCompactTimer);
      this.tailCompactTimer = null;
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
    // Rotation state must not bleed into the next session on manager reuse — e.g. a
    // leftover staleAckRetries=1 would make the next session's first current-key-ok 409
    // skip its bounded retry. healingPromise is only nulled here, never awaited: an
    // in-flight heal from the torn-down session has nothing left to act on.
    this.rotating = false;
    this.roomKeyBytesPrev = null;
    this.pendingRotationKey = null;
    this.healingPromise = null;
    this.staleAckRetries = 0;
  }
}
