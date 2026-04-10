import React, { useEffect, useMemo, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { useOnClickOutside } from 'usehooks-ts';
import * as Y from 'yjs';
import { IComment } from '../extensions/comment';
import {
  CommentAnchor,
  getCommentAtPosition,
  triggerDecorationRebuild,
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

  // --- External deps ref — always current, never triggers re-renders ---
  const externalDepsRef = useRef<CommentExternalDeps>({
    editor,
    ydoc,
    setActiveCommentId,
    focusCommentWithActiveId,
    setInitialComments,
    setUsername: setUsernameProp,
    onNewComment,
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
      .map((a) => `${a.id}:${a.resolved}:${a.deleted}`)
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
    }
  }, [initialCommentAnchors, commentAnchorsRef, editor]);

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

    const handleTransaction = ({
      transaction,
    }: {
      transaction: { docChanged?: boolean; selectionSet: boolean };
    }) => {
      // Keep the transaction listener focused on active-comment/editor sync.
      // Floating-card pruning now belongs to semantic events and anchor loss handling.
      if (transaction.selectionSet || transaction.docChanged) {
        updateEditorState();
      }
    };

    // Keep this effect subscribed to editor-driven changes only. Re-running it
    // for sidebar/thread focus changes lets stale editor selection win again.
    updateEditorState();
    editor.on('selectionUpdate', updateEditorState);
    editor.on('transaction', handleTransaction);

    return () => {
      editor.off('selectionUpdate', updateEditorState);
      editor.off('transaction', handleTransaction);
    };
  }, [
    commentAnchorsRef,
    editor,
    isDesktopFloatingEnabled,
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
        {children}
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
