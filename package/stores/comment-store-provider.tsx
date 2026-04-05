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
  const isDesktopFloatingEnabled = !isBelow1280px && !isNativeMobile;

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

  // Deserialize consumer-provided anchors into commentAnchorsRef
  useEffect(() => {
    if (!initialCommentAnchors || !commentAnchorsRef) return;

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

  useEffect(() => {
    store.getState().clearFloatingItems();
  }, [activeTabId, store]);

  useEffect(() => {
    store.getState().pruneFloatingItems();
  }, [editor, initialComments, activeTabId, store]);

  useEffect(() => {
    store.getState().syncFloatingThreadWithActiveComment();
  }, [
    activeCommentId,
    activeTabId,
    initialComments,
    isDesktopFloatingEnabled,
    store,
  ]);

  useEffect(() => {
    store.getState().submitPendingFloatingDrafts();
  }, [isConnected, isDesktopFloatingEnabled, store, username]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const updateEditorState = () => {
      const state = store.getState();
      const isMarkActive = editor.isActive('comment');
      const cursorPos = editor.state.selection.from;
      const decorationComment = commentAnchorsRef
        ? getCommentAtPosition(
            editor,
            cursorPos,
            () => commentAnchorsRef.current,
          )
        : null;

      state.setIsCommentActive(isMarkActive || decorationComment !== null);
      state.setIsCommentResolved(
        isMarkActive
          ? editor.getAttributes('comment').resolved ?? false
          : decorationComment?.resolved ?? false,
      );

      // For decoration-based comments, trigger the same activation flow
      // that onCommentActivated does for mark-based comments
      if (decorationComment && !isMarkActive) {
        const currentActiveId = state.activeCommentId;
        if (currentActiveId !== decorationComment.id) {
          state.setActiveCommentId(decorationComment.id);
          state.openFloatingThread(decorationComment.id);
        }
      }

      state.pruneFloatingItems();
    };

    updateEditorState();
    editor.on('selectionUpdate', updateEditorState);
    editor.on('transaction', updateEditorState);

    return () => {
      editor.off('selectionUpdate', updateEditorState);
      editor.off('transaction', updateEditorState);
    };
  }, [editor, store]);

  const commentsSectionRef = useRef<HTMLDivElement | null>(null);
  const replySectionRef = useRef<HTMLDivElement | null>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOnClickOutside([portalRef, buttonRef, dropdownRef], () => {
    const state = store.getState();

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
