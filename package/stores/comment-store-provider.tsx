import React, { useEffect, useMemo, useRef } from 'react';
import {
  createCommentStore,
  CommentStoreContext,
  CommentExternalDeps,
} from './comment-store';
import { IComment } from '../extensions/comment';
import { CommentMutationMeta } from '../types';
import { useOnClickOutside } from 'usehooks-ts';
import { Editor } from '@tiptap/react';
import * as Y from 'yjs';

export interface CommentStoreProviderProps {
  children: React.ReactNode;
  // External deps — go into ref (actions read lazily)
  editor: Editor | null;
  ydoc: Y.Doc;
  setActiveCommentId: (id: string | null) => void;
  focusCommentWithActiveId: (id: string) => void;
  setInitialComments?: (comments: IComment[]) => void;
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
  // Synced data — go into store via useEffect
  initialComments: IComment[];
  username: string | null;
  activeCommentId: string | null;
  activeTabId: string;
  isConnected?: boolean;
  isLoading?: boolean;
  isDDocOwner?: boolean;
  setUsername?: (name: string) => void;
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
  };

  // Inject ref into store once
  useEffect(() => {
    store.getState().setExternalDepsRef(externalDepsRef);
  }, [store]);

  // --- Sync data props into store (only when values change) ---
  useEffect(() => {
    store.getState().setInitialComments(initialComments);
  }, [initialComments, store]);

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

  // --- Sync editor-derived state ---
  useEffect(() => {
    if (!editor) return;
    const updateEditorState = () => {
      store.getState().setIsCommentActive(editor.isActive('comment'));
      store.getState().setIsCommentResolved(
        editor.getAttributes('comment').resolved ?? false
      );
    };
    editor.on('selectionUpdate', updateEditorState);
    editor.on('transaction', updateEditorState);
    return () => {
      editor.off('selectionUpdate', updateEditorState);
      editor.off('transaction', updateEditorState);
    };
  }, [editor, store]);

  // --- DOM refs ---
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

const CommentRefsContext = React.createContext<CommentRefsContextType | null>(null);

export const useCommentRefs = () => {
  const ctx = React.useContext(CommentRefsContext);
  if (!ctx) {
    throw new Error('useCommentRefs must be used within CommentStoreProvider');
  }
  return ctx;
};
