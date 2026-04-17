/* eslint-disable react-refresh/only-export-components */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { combineTransactionSteps, Editor } from '@tiptap/core';
import { EditorState, Transaction } from '@tiptap/pm/state';
import { fromUint8Array } from 'js-base64';
import { useOnClickOutside } from 'usehooks-ts';
import * as Y from 'yjs';
import { getCommentMarkAtPosition, IComment } from '../extensions/comment';
import {
  analyzeCommentAnchorTransactionChanges,
  CommentAnchor,
  type CommentAnchorTransactionChange,
  getCommentAtPosition,
  triggerDecorationRebuild,
  resolveCommentAnchorRangeInState,
  resolveCommentAnchorRangeForAnalysis,
} from '../extensions/comment/comment-decoration-plugin';
import { CommentMutationMeta, SerializedCommentAnchor } from '../types';
import { useResponsive } from '../utils/responsive';
import {
  deserializeCommentAnchors,
  getSerializedCommentAnchorsKey,
} from '../utils/comment-anchor-serialization';
import {
  resolveCommentSelectionRange,
  scrollCommentSelectionRangeIntoView,
} from '../utils/comment-scroll-into-view';
import {
  CommentExternalDeps,
  CommentStoreContext,
  createCommentStore,
  EXPLICIT_COMMENT_FOCUS_META,
} from './comment-store';

export interface CommentStoreProviderProps {
  children: React.ReactNode;
  editor: Editor | null;
  ydoc: Y.Doc;
  isFocusMode?: boolean;
  setActiveCommentId: (id: string | null) => void;
  focusCommentWithActiveId: (id: string) => void;
  setInitialComments?: React.Dispatch<React.SetStateAction<IComment[]>>;
  onNewComment?: (comment: IComment, meta?: CommentMutationMeta) => void;
  onEditComment?: (commentId: string, meta?: CommentMutationMeta) => void;
  onEditReply?: (
    commentId: string,
    replyId: string,
    meta?: CommentMutationMeta,
  ) => void;
  onCommentReply?: (activeCommentId: string, reply: IComment) => void;
  onResolveComment?: (commentId: string, meta?: CommentMutationMeta) => void;
  onUnresolveComment?: (commentId: string, meta?: CommentMutationMeta) => void;
  onDeleteComment?: (commentId: string, meta?: CommentMutationMeta) => void;
  onInlineComment?: () => void;
  onComment?: () => void;
  setCommentDrawerOpen?: (open: boolean) => void;
  connectViaWallet?: () => Promise<void>;
  connectViaUsername?: (username: string) => Promise<void>;
  ensResolutionUrl: string;
  commentAnchorsRef?: React.MutableRefObject<CommentAnchor[]>;
  draftAnchorsRef?: React.MutableRefObject<CommentAnchor[]>;
  initialCommentAnchors?: SerializedCommentAnchor[];
  // Synced data — go into store via useEffect
  initialComments: IComment[];
  username: string | null;
  activeCommentId: string | null;
  activeTabId: string;
  isConnected?: boolean;
  isLoading?: boolean;
  isDDocOwner?: boolean;
  setUsername?: React.Dispatch<React.SetStateAction<string>>;
}

export const CommentStoreProvider = ({
  children,
  // External deps (ref-based)
  editor,
  ydoc,
  isFocusMode = false,
  setActiveCommentId,
  focusCommentWithActiveId,
  setInitialComments,
  onNewComment,
  onEditComment,
  onEditReply,
  onCommentReply,
  onResolveComment,
  onUnresolveComment,
  onDeleteComment,
  onInlineComment,
  onComment,
  setCommentDrawerOpen,
  connectViaWallet,
  connectViaUsername,
  ensResolutionUrl,
  commentAnchorsRef,
  draftAnchorsRef,
  initialCommentAnchors,
  setUsername: setUsernameProp,
  // Synced data (useEffect-based)
  initialComments,
  username,
  activeCommentId,
  activeTabId,
  isConnected = false,
  isLoading = false,
  isDDocOwner = false,
}: CommentStoreProviderProps) => {
  const store = useMemo(() => createCommentStore(), []);
  const { isBelow1280px, isNativeMobile } = useResponsive();
  const isDesktopFloatingEnabled =
    !isBelow1280px && !isNativeMobile && !isFocusMode;

  // Capture pre-transaction editor state for anchor analysis.
  // Updated just before each doc-changing transaction via 'beforeTransaction'.
  // Consumed in 'transaction' handler to analyze anchor mutation status.
  const preTransactionStateRef = useRef<EditorState | null>(null);

  // Track anchors removed due to text deletion so undo can restore them.
  const removedAnchorsRef = useRef<Map<string, CommentAnchor>>(new Map());
  const [activeCommentAnchorIds, setActiveCommentAnchorIds] = useState<
    Set<string>
  >(() => new Set());
  const [activeCommentAnchorIdsTabId, setActiveCommentAnchorIdsTabId] =
    useState<string | null>(activeTabId);
  const activeCommentAnchorIdsTabIdRef = useRef<string | null>(activeTabId);
  const activeCommentAnchorIdsKeyRef = useRef('');
  const pendingMobileCommentScrollFrameRef = useRef<number | null>(null);
  const pendingMobileCommentScrollSecondFrameRef = useRef<number | null>(null);

  const cancelPendingMobileCommentScroll = useCallback(() => {
    if (pendingMobileCommentScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(pendingMobileCommentScrollFrameRef.current);
      pendingMobileCommentScrollFrameRef.current = null;
    }

    if (pendingMobileCommentScrollSecondFrameRef.current !== null) {
      window.cancelAnimationFrame(
        pendingMobileCommentScrollSecondFrameRef.current,
      );
      pendingMobileCommentScrollSecondFrameRef.current = null;
    }
  }, []);

  const scheduleMobileCommentScroll = useCallback(
    (commentId: string) => {
      if (!editor) {
        return;
      }

      cancelPendingMobileCommentScroll();

      pendingMobileCommentScrollFrameRef.current = window.requestAnimationFrame(
        () => {
          pendingMobileCommentScrollFrameRef.current = null;

          pendingMobileCommentScrollSecondFrameRef.current =
            window.requestAnimationFrame(() => {
              pendingMobileCommentScrollSecondFrameRef.current = null;

              // Wait until the drawer and active-highlight styles have settled
              // before measuring how much room remains above the mobile sheet.
              const selectionRange = resolveCommentSelectionRange({
                editor,
                commentId,
                commentAnchorsRef,
              });

              if (!selectionRange) {
                return;
              }

              scrollCommentSelectionRangeIntoView({
                editor,
                selectionRange,
              });
            });
        },
      );
    },
    [cancelPendingMobileCommentScroll, commentAnchorsRef, editor],
  );

  const refreshCommentAnchorState = useCallback(() => {
    const activeAnchorIds =
      editor && commentAnchorsRef
        ? commentAnchorsRef.current
            .filter(
              (anchor) =>
                !anchor.deleted &&
                Boolean(resolveCommentAnchorRangeInState(anchor, editor.state)),
            )
            .map((anchor) => anchor.id)
        : [];
    const nextKey = `${activeTabId}:${activeAnchorIds.join(',')}`;
    const shouldUpdate =
      nextKey !== activeCommentAnchorIdsKeyRef.current ||
      activeCommentAnchorIdsTabIdRef.current !== activeTabId;

    if (shouldUpdate) {
      activeCommentAnchorIdsKeyRef.current = nextKey;
      setActiveCommentAnchorIds(new Set(activeAnchorIds));
      activeCommentAnchorIdsTabIdRef.current = activeTabId;
      setActiveCommentAnchorIdsTabId(activeTabId);
    }
  }, [activeTabId, commentAnchorsRef, editor]);

  // --- External deps ref — always current, never triggers re-renders ---
  // Store callback pointers in a ref so transaction handlers don't need
  // dependency array changes. This keeps them focused on editor changes, not prop updates.
  // Update ref on every render — no set(), no re-render loop.
  const externalDepsRef = useRef<CommentExternalDeps>({
    editor,
    ydoc,
    setActiveCommentId,
    focusCommentWithActiveId,
    setInitialComments,
    setUsername: setUsernameProp,
    onNewComment,
    onEditComment,
    onEditReply,
    onCommentReply,
    onResolveComment,
    onUnresolveComment,
    onDeleteComment,
    onInlineComment,
    onComment,
    setCommentDrawerOpen,
    connectViaWallet,
    connectViaUsername,
    ensResolutionUrl,
    commentAnchorsRef,
    refreshCommentAnchorState,
    draftAnchorsRef,
  });

  // Update ref on every render — no set(), no re-render loop
  externalDepsRef.current = {
    editor,
    ydoc,
    setActiveCommentId,
    focusCommentWithActiveId,
    setInitialComments,
    setUsername: setUsernameProp,
    onNewComment,
    onEditComment,
    onEditReply,
    onCommentReply,
    onResolveComment,
    onUnresolveComment,
    onDeleteComment,
    onInlineComment,
    onComment,
    setCommentDrawerOpen,
    connectViaWallet,
    connectViaUsername,
    ensResolutionUrl,
    commentAnchorsRef,
    refreshCommentAnchorState,
    draftAnchorsRef,
  };

  // Inject ref into store once
  useEffect(() => {
    store.getState().setExternalDepsRef(externalDepsRef);
  }, [store]);

  // --- Sync data props into store (only when values change) ---
  useEffect(() => {
    store.getState().setInitialComments(initialComments);
  }, [initialComments, store]);

  const serializedInitialCommentAnchorsKey = useMemo(
    () => getSerializedCommentAnchorsKey(initialCommentAnchors),
    [initialCommentAnchors],
  );
  // Keep editor-owned anchors in sync if the consumer later replaces the
  // serialized anchors after mount. Initial seeding happens before editor init.
  const prevAnchorKeyRef = useRef<string | null>(
    commentAnchorsRef?.current.length
      ? serializedInitialCommentAnchorsKey
      : null,
  );
  useEffect(() => {
    if (!commentAnchorsRef) return;
    if (serializedInitialCommentAnchorsKey === prevAnchorKeyRef.current) return;

    prevAnchorKeyRef.current = serializedInitialCommentAnchorsKey;
    commentAnchorsRef.current = deserializeCommentAnchors(
      initialCommentAnchors,
    );

    if (editor) {
      triggerDecorationRebuild(editor);
      refreshCommentAnchorState();
    }
  }, [
    initialCommentAnchors,
    serializedInitialCommentAnchorsKey,
    commentAnchorsRef,
    editor,
    refreshCommentAnchorState,
  ]);

  useEffect(() => {
    store.getState().setUsername(username);
  }, [username, store]);

  useEffect(() => {
    const state = store.getState();
    const focusedFloatingThread = isDesktopFloatingEnabled
      ? state.floatingCards.find(
          (floatingCard) =>
            floatingCard.type === 'thread' && floatingCard.isFocused,
        )
      : null;
    const focusedFloatingThreadId =
      focusedFloatingThread?.type === 'thread'
        ? focusedFloatingThread.commentId
        : null;
    const uiOwnedActiveCommentId = isDesktopFloatingEnabled
      ? focusedFloatingThreadId
      : state.openReplyId;

    if (uiOwnedActiveCommentId && activeCommentId !== uiOwnedActiveCommentId) {
      return;
    }

    store.getState().setActiveCommentId(activeCommentId);
  }, [activeCommentId, isDesktopFloatingEnabled, store]);

  useEffect(() => {
    store.getState().setActiveTabId(activeTabId);
  }, [activeTabId, store]);

  useEffect(() => {
    activeCommentAnchorIdsTabIdRef.current = null;
    setActiveCommentAnchorIdsTabId(null);

    let secondFrameId: number | null = null;
    const frameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        refreshCommentAnchorState();
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (secondFrameId !== null) {
        window.cancelAnimationFrame(secondFrameId);
      }
    };
  }, [activeTabId, refreshCommentAnchorState]);

  useEffect(() => {
    store.getState().setIsConnected(isConnected);
  }, [isConnected, store]);

  useEffect(() => {
    store.getState().setIsLoading(isLoading);
  }, [isLoading, store]);

  useEffect(() => {
    store.getState().setIsDDocOwner(isDDocOwner);
  }, [isDDocOwner, store]);

  // --- Sync external callbacks consumers need to read ---
  useEffect(() => {
    store.getState().setOnComment(onComment ?? null);
  }, [onComment, store]);

  useEffect(() => {
    store.getState().setCommentDrawerOpenFn(setCommentDrawerOpen ?? null);
  }, [setCommentDrawerOpen, store]);

  useEffect(() => {
    store.getState().setConnectViaWallet(connectViaWallet ?? null);
  }, [connectViaWallet, store]);

  useEffect(() => {
    store.getState().setConnectViaUsername(connectViaUsername ?? null);
  }, [connectViaUsername, store]);

  useEffect(() => {
    store.getState().setIsDesktopFloatingEnabled(isDesktopFloatingEnabled);
  }, [isDesktopFloatingEnabled, store]);

  useEffect(
    () => () => {
      cancelPendingMobileCommentScroll();
    },
    [cancelPendingMobileCommentScroll],
  );

  useEffect(() => {
    const hydrationReady = Boolean(
      isDesktopFloatingEnabled &&
        editor &&
        activeCommentAnchorIdsTabId === activeTabId,
    );

    // keep the expensive thread-anchor reconcile tied to
    // structural changes, not simple active-comment churn.
    store.getState().reconcileFloatingThreadsForActiveTab({ hydrationReady });
  }, [
    activeCommentAnchorIds,
    activeCommentAnchorIdsTabId,
    activeTabId,
    editor,
    initialComments,
    isDesktopFloatingEnabled,
    store,
  ]);

  useEffect(() => {
    // Semantic changes still prune invalid floating drafts, but editor
    // transactions no longer do. That keeps correctness without paying
    // per-keystroke scan cost.
    store.getState().removeInvalidFloatingDrafts();
  }, [activeTabId, initialComments, store]);

  useEffect(() => {
    store.getState().submitPendingFloatingDrafts();
  }, [isConnected, store, username]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    let prevCommentActive = false;
    let prevCommentResolved = false;

    // Watch editor selection here so landing on a live anchor opens the matching
    // floating thread without waiting for a separate UI interaction.
    const updateEditorState = (transaction?: Transaction) => {
      const state = store.getState();
      const isMarkActive = editor.isActive('comment');
      const activeMarkComment = isMarkActive
        ? {
            commentId:
              (editor.getAttributes('comment')?.commentId as string | null) ??
              null,
            resolved: Boolean(editor.getAttributes('comment')?.resolved),
          }
        : null;
      const selectionFrom = editor.state.selection.from;
      const selectionTo = editor.state.selection.to;
      const maxProbePos = editor.state.doc.content.size;
      let decorationComment: CommentAnchor | null = null;
      let markComment = activeMarkComment;
      const pointerSelectionMeta = Boolean(transaction?.getMeta('pointer'));
      const probeForComments = (probePositions: number[]) => {
        for (const probePos of probePositions) {
          if (!markComment) {
            markComment = getCommentMarkAtPosition(editor.state, probePos);
          }

          if (!decorationComment && commentAnchorsRef) {
            const matchedComment = getCommentAtPosition(
              editor,
              probePos,
              () => commentAnchorsRef.current,
            );

            if (matchedComment) {
              decorationComment = matchedComment;
            }
          }

          if (markComment && decorationComment) {
            break;
          }
        }
      };

      const exactProbePositions = Array.from(
        new Set(
          [selectionFrom, selectionTo].filter(
            (pos): pos is number => pos >= 0 && pos <= maxProbePos,
          ),
        ),
      );

      probeForComments(exactProbePositions);

      if ((!markComment || !decorationComment) && pointerSelectionMeta) {
        // Pointer clicks can resolve just outside the decorated or marked range
        // even though the user clearly targeted the highlighted comment text.
        const fallbackProbePositions = Array.from(
          new Set(
            [
              selectionFrom - 1,
              selectionFrom + 1,
              selectionTo - 1,
              selectionTo + 1,
            ].filter((pos): pos is number => pos >= 0 && pos <= maxProbePos),
          ),
        );

        probeForComments(fallbackProbePositions);
      }

      const selectedDecorationComment =
        decorationComment as CommentAnchor | null;
      const selectedMarkCommentId = markComment?.commentId ?? null;
      const selectedCommentId =
        selectedMarkCommentId ?? selectedDecorationComment?.id ?? null;
      const selectedCommentResolved =
        (selectedMarkCommentId ? markComment?.resolved : undefined) ??
        selectedDecorationComment?.resolved ??
        false;
      const isUnresolvedMarkComment = Boolean(
        selectedMarkCommentId && !selectedCommentResolved,
      );
      const isOpenableDecorationComment = Boolean(
        selectedDecorationComment && !selectedDecorationComment.resolved,
      );
      const nextCommentActive = Boolean(selectedCommentId);
      const nextCommentResolved =
        Boolean(selectedCommentId) && selectedCommentResolved;
      // This meta means the selection came from an explicit thread click in
      // the UI, so prefer that thread even if the editor selection is still
      // settling and would otherwise look like passive drift.
      const isExplicitUiThreadSync = Boolean(
        transaction?.getMeta(EXPLICIT_COMMENT_FOCUS_META),
      );
      const focusedFloatingThread = isDesktopFloatingEnabled
        ? state.floatingCards.find(
            (floatingCard) =>
              floatingCard.type === 'thread' && floatingCard.isFocused,
          )
        : null;
      const focusedFloatingThreadId =
        focusedFloatingThread?.type === 'thread'
          ? focusedFloatingThread.commentId
          : null;
      // Preserve UI-owned thread focus during non-pointer selection drift.
      // Mobile drawers own focus through openReplyId; desktop floating threads
      // own it while a thread card remains focused.
      // Explicit drawer/sidebar navigation is the exception: treat it like a
      // pointer action so the clicked thread can always take ownership.
      // Layman: if the user clicked a thread in the UI, trust that click even
      // if the editor selection is still catching up to it.
      const shouldSyncEditorSelectedThread =
        !selectedCommentId ||
        (!isDesktopFloatingEnabled
          ? state.openReplyId === selectedCommentId
          : !focusedFloatingThreadId ||
            focusedFloatingThreadId === selectedCommentId) ||
        pointerSelectionMeta ||
        isExplicitUiThreadSync;
      // Focus mode should still allow the editor selection to move, but plain
      // canvas clicks must not wake the thread UI back up unless the sync came
      // from an explicit thread navigation action.
      const shouldIgnoreFocusModePointerSelection = Boolean(
        isFocusMode &&
          selectedCommentId &&
          pointerSelectionMeta &&
          !isExplicitUiThreadSync,
      );
      // Legacy mark comments bypass the decoration anchor layer, so selection
      // state must reflect any mark hit while desktop thread opening remains
      // limited to unresolved comments.
      const shouldOpenDesktopThreadFromSelection = Boolean(
        selectedCommentId &&
          !shouldIgnoreFocusModePointerSelection &&
          shouldSyncEditorSelectedThread &&
          isDesktopFloatingEnabled &&
          (isUnresolvedMarkComment || isOpenableDecorationComment),
      );
      const didCommentActiveChange = nextCommentActive !== prevCommentActive;
      const didCommentResolvedChange =
        nextCommentResolved !== prevCommentResolved;

      // Only update store when values actually change
      if (didCommentActiveChange) {
        prevCommentActive = nextCommentActive;
        state.setIsCommentActive(nextCommentActive);
      }
      if (didCommentResolvedChange) {
        prevCommentResolved = nextCommentResolved;
        state.setIsCommentResolved(nextCommentResolved);
      }

      if (
        selectedCommentId &&
        shouldSyncEditorSelectedThread &&
        !shouldIgnoreFocusModePointerSelection
      ) {
        // Treat mark-based and decoration-based activations the same here so
        // mobile highlight taps always route into a concrete drawer thread.
        const shouldScrollSelectedCommentIntoView =
          !isDesktopFloatingEnabled &&
          Boolean(
            pointerSelectionMeta || state.openReplyId !== selectedCommentId,
          );

        if (state.activeCommentId !== selectedCommentId) {
          state.setActiveCommentId(selectedCommentId);
        }

        // Keep the mobile behavior explicit: editor interaction should reopen
        // the drawer for the selected thread instead of relying on stale UI state.
        if (!isDesktopFloatingEnabled) {
          state.setOpenReplyId(selectedCommentId);
          state.setCommentDrawerOpen?.(true);

          if (shouldScrollSelectedCommentIntoView) {
            scheduleMobileCommentScroll(selectedCommentId);
          }
        }
      }

      if (shouldOpenDesktopThreadFromSelection && selectedCommentId) {
        if (!isExplicitUiThreadSync) {
          setActiveCommentId(selectedCommentId);
        }

        state.openFloatingThread(selectedCommentId);
      }
    };

    const handleBeforeTransaction = ({
      transaction,
    }: {
      transaction: Transaction;
    }) => {
      if (!transaction.docChanged) {
        return;
      }

      // Capture editor state BEFORE transaction applies.
      // Used in handleTransaction to analyze how anchors changed.
      preTransactionStateRef.current = editor.state;
    };

    const handleTransaction = ({
      transaction,
      appendedTransactions = [],
    }: {
      transaction: Transaction;
      appendedTransactions?: Transaction[];
    }) => {
      if (transaction.docChanged) {
        const oldState = preTransactionStateRef.current;
        preTransactionStateRef.current = null;
        let shouldRebuildDecorations = false;
        let didRestoreRemovedAnchors = false;

        const restoreRemovedAnchors = () => {
          if (!commentAnchorsRef || removedAnchorsRef.current.size === 0) {
            return false;
          }

          const restoredAnchors: CommentAnchor[] = [];

          removedAnchorsRef.current.forEach((removedAnchor, commentId) => {
            if (resolveCommentAnchorRangeInState(removedAnchor, editor.state)) {
              restoredAnchors.push(removedAnchor);
              removedAnchorsRef.current.delete(commentId);
            }
          });

          if (restoredAnchors.length === 0) {
            return false;
          }

          const existingAnchorIds = new Set(
            commentAnchorsRef.current.map((anchor) => anchor.id),
          );

          commentAnchorsRef.current = [
            ...commentAnchorsRef.current,
            ...restoredAnchors.filter(
              (anchor) => !existingAnchorIds.has(anchor.id),
            ),
          ];
          shouldRebuildDecorations = true;
          return true;
        };

        // Transaction analysis and persistence orchestration.
        // This is the main flow for persisting anchor edits and deletions.
        if (commentAnchorsRef && oldState) {
          // Analyze only active anchors that belong to the currently rendered tab.
          // `commentAnchorsRef` can contain anchors from other tabs, but this
          // transaction only mutates the active Yjs fragment. Keeping off-tab
          // anchors out of this batch prevents tab B comments from changing tab
          // A undo/delete decisions.
          const activeAnchors = commentAnchorsRef.current.filter(
            (anchor) =>
              !anchor.deleted &&
              !anchor.resolved &&
              resolveCommentAnchorRangeForAnalysis(anchor, oldState) !== null,
          );

          if (activeAnchors.length > 0) {
            // Combine transaction and appended steps into a single transform.
            // Multi-step transactions (e.g., IME input, paste-over-selection) must be
            // analyzed as a unified change, not individually.
            const combinedTransform = combineTransactionSteps(
              transaction.before,
              [transaction, ...appendedTransactions],
            );

            // Analyze anchor changes using the pure helper from comment-decoration-plugin.
            // Returns an array classifying each anchor as: unchanged, edited, or deleted.
            const anchorChanges = analyzeCommentAnchorTransactionChanges(
              activeAnchors,
              oldState,
              editor.state,
              combinedTransform,
            );

            // Separate edited and deleted anchors for batch processing.
            const editedChanges = anchorChanges.filter(
              (
                change,
              ): change is Extract<
                CommentAnchorTransactionChange,
                { type: 'edited' }
              > => change.type === 'edited',
            );
            const deletedChanges = anchorChanges.filter(
              (
                change,
              ): change is Extract<
                CommentAnchorTransactionChange,
                { type: 'deleted' }
              > => change.type === 'deleted',
            );

            // Process edited anchors first.
            // This keeps the anchor ref stable before removal (deleted processing).
            if (editedChanges.length > 0) {
              // Build a map for quick lookup during ref update.
              const editedAnchorById = new Map(
                editedChanges.map((change) => [change.id, change]),
              );

              // Build payload for each edited anchor.
              // Payload includes new quoted text (selected content) and relative positions.
              const editPayloads = editedChanges.map((change) => ({
                commentId: change.id,
                selectedContent: editor.state.doc.textBetween(
                  change.from,
                  change.to,
                  ' ',
                ),
                mutationMeta: {
                  type: 'edit' as const,
                  anchorFrom: fromUint8Array(
                    Y.encodeRelativePosition(change.anchorFrom),
                  ),
                  anchorTo: fromUint8Array(
                    Y.encodeRelativePosition(change.anchorTo),
                  ),
                  selectedContent: editor.state.doc.textBetween(
                    change.from,
                    change.to,
                    ' ',
                  ),
                } satisfies CommentMutationMeta,
              }));

              // Batch-update commentAnchorsRef with new relative positions.
              // This ensures decoration rebuilds use the updated anchors.
              commentAnchorsRef.current = commentAnchorsRef.current.map(
                (anchor) => {
                  const editedAnchor = editedAnchorById.get(anchor.id);

                  if (!editedAnchor) {
                    return anchor;
                  }

                  return {
                    ...anchor,
                    anchorFrom: editedAnchor.anchorFrom,
                    anchorTo: editedAnchor.anchorTo,
                  };
                },
              );

              // Update local comment state with new selected content.
              // This keeps thread content in sync immediately, before consumer rehydration.
              store.getState().applyCommentAnchorEdits(
                editPayloads.map(({ commentId, selectedContent }) => ({
                  commentId,
                  selectedContent,
                })),
              );
              shouldRebuildDecorations = true;

              // Fire persistence callbacks for edited anchors.
              // Consumer uses these to update persisted anchor data (e.g., in DB).
              editPayloads.forEach(({ commentId, mutationMeta }) => {
                externalDepsRef.current.onEditComment?.(
                  commentId,
                  mutationMeta,
                );
              });
            }

            didRestoreRemovedAnchors = restoreRemovedAnchors();

            // Process deleted anchors after edits.
            // When highlighted text is deleted (either by current user or collaborators),
            // we remove the anchor so it's no longer tracked by decorations.
            // This is runtime-only - no persistence of deletion state.
            // The UI will detect this at render time by checking if the anchor still exists.
            //
            // Handles scenarios naturally:
            // 1. Current user deletes highlighted text → detected via editor transaction
            // 2. Collaborator deletes text → detected via Yjs sync transaction
            // 3. Edited text is detected as "edited change", not "deleted change"
            const currentAnchorById =
              didRestoreRemovedAnchors && deletedChanges.length > 0
                ? new Map(
                    commentAnchorsRef.current.map((anchor) => [
                      anchor.id,
                      anchor,
                    ]),
                  )
                : null;
            const deletedChangesToApply = didRestoreRemovedAnchors
              ? deletedChanges.filter((change) => {
                  const currentAnchor = currentAnchorById?.get(change.id);

                  // Undo can restore one removed anchor and still make the
                  // broad history mapping report neighboring anchors as
                  // deleted. A valid post-transaction range means the highlight
                  // still exists, so do not remove it from the runtime anchor
                  // set. Truly deleted anchors resolve to null and are removed.
                  return currentAnchor
                    ? !resolveCommentAnchorRangeInState(
                        currentAnchor,
                        editor.state,
                      )
                    : true;
                })
              : deletedChanges;

            if (deletedChangesToApply.length > 0) {
              const deletedCommentIds = deletedChangesToApply.map(
                (change) => change.id,
              );
              const deletedCommentIdSet = new Set(deletedCommentIds);

              // Remove anchors from the ref so they're no longer tracked by decorations.
              commentAnchorsRef.current = commentAnchorsRef.current.filter(
                (anchor) => {
                  if (!deletedCommentIdSet.has(anchor.id)) {
                    return true;
                  }

                  removedAnchorsRef.current.set(anchor.id, anchor);
                  return false;
                },
              );

              shouldRebuildDecorations = true;
            }
          }
        }

        // Bound undo restoration to document-changing transactions only.
        if (!didRestoreRemovedAnchors) {
          didRestoreRemovedAnchors = restoreRemovedAnchors();
        }

        if (shouldRebuildDecorations) {
          triggerDecorationRebuild(editor);
        }

        if (commentAnchorsRef) {
          refreshCommentAnchorState();
        }
      }

      // Sync active comment state based on cursor position.
      // This enables auto-opening floating threads when user lands on an existing anchor.
      if (transaction.selectionSet || transaction.docChanged) {
        updateEditorState(transaction);
      }
    };
    const handleSelectionUpdate = ({
      transaction,
    }: {
      transaction: Transaction;
    }) => {
      updateEditorState(transaction);
    };

    // Keep this effect subscribed to editor-driven changes only. Re-running it
    // for sidebar/thread focus changes lets stale editor selection win again.
    // Subscription lifecycle:
    // - updateEditorState called immediately to establish initial active comment
    // - beforeTransaction captures pre-state once per doc change
    // - transaction analyzes and persists anchor changes
    // - selectionUpdate + (re)selection tracking keeps floating threads in sync
    //
    // Dependency array intentionally excludes activeCommentId, store setters, etc.
    // to keep this subscription stable and focused on editor changes only.
    updateEditorState();
    editor.on('beforeTransaction', handleBeforeTransaction);
    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('transaction', handleTransaction);

    return () => {
      preTransactionStateRef.current = null;
      editor.off('beforeTransaction', handleBeforeTransaction);
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('transaction', handleTransaction);
    };
  }, [
    commentAnchorsRef,
    editor,
    isDesktopFloatingEnabled,
    isFocusMode,
    refreshCommentAnchorState,
    scheduleMobileCommentScroll,
    setActiveCommentId,
    store,
  ]);

  const commentsSectionRef = useRef<HTMLDivElement | null>(null);
  const replySectionRef = useRef<HTMLDivElement | null>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDraftRef = useRef<HTMLDivElement | null>(null);

  useOnClickOutside([portalRef, buttonRef, dropdownRef, mobileDraftRef], () => {
    const state = store.getState();
    const activeDraft = state.activeDraftId
      ? (state.inlineDrafts[state.activeDraftId] ?? null)
      : null;

    // Mobile drawer drafts own their own close/discard flow. Do not let generic
    // outside interactions collapse them, and do not let dialog/overlay clicks
    // mutate the draft state behind the discard confirmation UI.
    if (activeDraft?.location === 'drawer' && state.isCommentOpen) {
      return;
    }

    if (state.isCommentOpen) {
      state.setIsBubbleMenuSuppressed(true);
      state.setIsCommentOpen(false);
    }
  });

  const hasRenderedCommentAnchor = useCallback(
    (commentId: string) => {
      if (!editor?.view?.dom) {
        return false;
      }

      const safeCommentId =
        typeof CSS !== 'undefined' && CSS.escape
          ? CSS.escape(commentId)
          : commentId.replace(/"/g, '\\"');

      return Boolean(
        editor.view.dom.querySelector(`[data-comment-id="${safeCommentId}"]`),
      );
    },
    [editor],
  );

  const commentAnchorsContextValue = useMemo<CommentAnchorsContextType>(
    () => ({
      activeCommentAnchorIds,
      activeCommentAnchorIdsTabId,
      hasRenderedCommentAnchor,
    }),
    [
      activeCommentAnchorIds,
      activeCommentAnchorIdsTabId,
      hasRenderedCommentAnchor,
    ],
  );

  return (
    <CommentStoreContext.Provider value={store}>
      <CommentRefsContext.Provider
        value={{
          commentsSectionRef,
          replySectionRef,
          portalRef,
          buttonRef,
          dropdownRef,
          mobileDraftRef,
        }}
      >
        <CommentAnchorsContext.Provider value={commentAnchorsContextValue}>
          {children}
        </CommentAnchorsContext.Provider>
      </CommentRefsContext.Provider>
    </CommentStoreContext.Provider>
  );
};

// --- Refs context ---

interface CommentRefsContextType {
  commentsSectionRef: React.RefObject<HTMLDivElement>;
  replySectionRef: React.RefObject<HTMLDivElement>;
  portalRef: React.RefObject<HTMLDivElement>;
  buttonRef: React.RefObject<HTMLDivElement>;
  dropdownRef: React.RefObject<HTMLDivElement>;
  mobileDraftRef: React.RefObject<HTMLDivElement>;
}

const CommentRefsContext = React.createContext<CommentRefsContextType | null>(
  null,
);

export const useCommentRefs = () => {
  const ctx = React.useContext(CommentRefsContext);

  if (!ctx) {
    throw new Error('useCommentRefs must be used within CommentStoreProvider');
  }

  return ctx;
};

// --- Anchors context ---

interface CommentAnchorsContextType {
  activeCommentAnchorIds: Set<string>;
  activeCommentAnchorIdsTabId: string | null;
  hasRenderedCommentAnchor: (commentId: string) => boolean;
}

const CommentAnchorsContext =
  React.createContext<CommentAnchorsContextType | null>(null);

export const useCommentAnchors = () => {
  const ctx = React.useContext(CommentAnchorsContext);

  if (!ctx) {
    throw new Error(
      'useCommentAnchors must be used within CommentStoreProvider',
    );
  }

  return ctx;
};
