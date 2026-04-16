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
import { IComment } from '../extensions/comment';
import {
  analyzeCommentAnchorTransactionChanges,
  CommentAnchor,
  type CommentAnchorTransactionChange,
  getCommentAtPosition,
  triggerDecorationRebuild,
  resolveCommentAnchorRangeInState,
} from '../extensions/comment/comment-decoration-plugin';
import { CommentMutationMeta, SerializedCommentAnchor } from '../types';
import { useResponsive } from '../utils/responsive';
import {
  CommentExternalDeps,
  CommentStoreContext,
  createCommentStore,
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
  const activeCommentAnchorIdsKeyRef = useRef('');

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
    const nextKey = activeAnchorIds.join(',');

    if (nextKey !== activeCommentAnchorIdsKeyRef.current) {
      activeCommentAnchorIdsKeyRef.current = nextKey;
      setActiveCommentAnchorIds(new Set(activeAnchorIds));
    }
  }, [commentAnchorsRef, editor]);

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
  };

  // Inject ref into store once
  useEffect(() => {
    store.getState().setExternalDepsRef(externalDepsRef);
  }, [store]);

  // --- Sync data props into store (only when values change) ---
  useEffect(() => {
    store.getState().setInitialComments(initialComments);
  }, [initialComments, store]);

  // Deserialize consumer-provided anchors into commentAnchorsRef.
  // Trigger rebuild only when anchors actually change, not on editor init.
  const prevAnchorKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialCommentAnchors || !commentAnchorsRef) return;

    const key = initialCommentAnchors
      .map(
        (a) =>
          `${a.id}:${a.anchorFrom}:${a.anchorTo}:${a.resolved}:${a.deleted}`,
      )
      .join(',');
    if (key === prevAnchorKeyRef.current) return;
    prevAnchorKeyRef.current = key;

    const deserialized: CommentAnchor[] = initialCommentAnchors
      .map((a) => {
        try {
          return {
            id: a.id,
            anchorFrom: Y.decodeRelativePosition(
              Uint8Array.from(atob(a.anchorFrom), (c) => c.charCodeAt(0)),
            ),
            anchorTo: Y.decodeRelativePosition(
              Uint8Array.from(atob(a.anchorTo), (c) => c.charCodeAt(0)),
            ),
            resolved: a.resolved,
            deleted: a.deleted,
          };
        } catch {
          return null;
        }
      })
      .filter((a): a is CommentAnchor => a !== null);

    commentAnchorsRef.current = deserialized;

    if (editor) {
      triggerDecorationRebuild(editor);
      refreshCommentAnchorState();
    }
  }, [
    initialCommentAnchors,
    commentAnchorsRef,
    editor,
    refreshCommentAnchorState,
  ]);

  useEffect(() => {
    store.getState().setUsername(username);
  }, [username, store]);

  useEffect(() => {
    store.getState().setActiveCommentId(activeCommentId);
  }, [activeCommentId, store]);

  useEffect(() => {
    store.getState().setActiveTabId(activeTabId);
  }, [activeTabId, store]);

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

  // Clear floating cards on tab switch to prevent mismatched or outdated cards
  useEffect(() => {
    store.getState().clearFloatingCards();
  }, [activeTabId, store]);

  useEffect(() => {
    // Semantic changes still prune invalid cards, but editor transactions no
    // longer do. That keeps correctness without paying per-keystroke scan cost.
    store.getState().removeInvalidFloatingCards();
  }, [activeTabId, initialComments, store]);

  useEffect(() => {
    store.getState().syncFloatingThreadCardWithActiveComment();
  }, [
    activeCommentId,
    activeTabId,
    initialComments,
    isDesktopFloatingEnabled,
    store,
  ]);

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
    const updateEditorState = () => {
      const state = store.getState();
      const isMarkActive = editor.isActive('comment');
      const markCommentId = isMarkActive
        ? ((editor.getAttributes('comment')?.commentId as string | null) ??
          null)
        : null;
      const cursorPos = editor.state.selection.from;
      const decorationComment = commentAnchorsRef
        ? getCommentAtPosition(
            editor,
            cursorPos,
            () => commentAnchorsRef.current,
          )
        : null;

      const nextCommentActive =
        isMarkActive ||
        (decorationComment !== null && !decorationComment.resolved);
      const nextCommentResolved = nextCommentActive
        ? isMarkActive
          ? (editor.getAttributes('comment')?.resolved ?? false)
          : false
        : false;
      const selectedCommentId = markCommentId || decorationComment?.id || null;

      // Only update store when values actually change
      if (nextCommentActive !== prevCommentActive) {
        prevCommentActive = nextCommentActive;
        state.setIsCommentActive(nextCommentActive);
      }
      if (nextCommentResolved !== prevCommentResolved) {
        prevCommentResolved = nextCommentResolved;
        state.setIsCommentResolved(nextCommentResolved);
      }

      if (selectedCommentId) {
        // Treat mark-based and decoration-based activations the same here so
        // mobile highlight taps always route into a concrete drawer thread.
        if (state.activeCommentId !== selectedCommentId) {
          state.setActiveCommentId(selectedCommentId);
        }

        // Keep the mobile behavior explicit: editor interaction should reopen
        // the drawer for the selected thread instead of relying on stale UI state.
        if (!isDesktopFloatingEnabled) {
          state.setOpenReplyId(selectedCommentId);
          state.setCommentDrawerOpen?.(true);
        }
      }

      // For decoration-based comments, trigger activation flow
      // Skip resolved — they shouldn't block new comments or open popups
      if (decorationComment && !isMarkActive && !decorationComment.resolved) {
        if (state.activeCommentId !== decorationComment.id) {
          setActiveCommentId(decorationComment.id);
        }
        if (isDesktopFloatingEnabled) {
          state.openFloatingThread(decorationComment.id);
        }
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
          // Analyze only active (not deleted/resolved) anchors.
          // Resolved and deleted anchors have no visual representation and don't need updates.
          const activeAnchors = commentAnchorsRef.current.filter(
            (anchor) => !anchor.deleted && !anchor.resolved,
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
            const shouldIgnoreDeletedChanges =
              didRestoreRemovedAnchors &&
              deletedChanges.length === activeAnchors.length;

            if (deletedChanges.length > 0 && !shouldIgnoreDeletedChanges) {
              const deletedCommentIds = deletedChanges.map(
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
        updateEditorState();
      }
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
    editor.on('selectionUpdate', updateEditorState);
    editor.on('transaction', handleTransaction);

    return () => {
      preTransactionStateRef.current = null;
      editor.off('beforeTransaction', handleBeforeTransaction);
      editor.off('selectionUpdate', updateEditorState);
      editor.off('transaction', handleTransaction);
    };
  }, [
    commentAnchorsRef,
    editor,
    isDesktopFloatingEnabled,
    refreshCommentAnchorState,
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

  const commentAnchorsContextValue = useMemo<CommentAnchorsContextType>(
    () => ({ activeCommentAnchorIds }),
    [activeCommentAnchorIds],
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
