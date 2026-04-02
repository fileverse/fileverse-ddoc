import { createStore } from 'zustand';
import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import { Editor } from '@tiptap/react';
import { IComment } from '../extensions/comment';
import { CommentMutationMeta, CommentMutationType } from '../types';
import { EnsCache } from '../components/inline-comment/context/types';
import { EnsStatus } from '../components/inline-comment/types';
import { getAddressName } from '../utils/getAddressName';
import { DEFAULT_TAB_ID } from '../components/tabs/utils/tab-utils';
import uuid from 'react-uuid';
import * as Y from 'yjs';
import { fromUint8Array } from 'js-base64';
import React from 'react';

// ---------------------------------------------------------------------------
// External deps — stored in a ref, read lazily by actions
// ---------------------------------------------------------------------------

export interface CommentExternalDeps {
  editor: Editor | null;
  ydoc: Y.Doc;
  setActiveCommentId: (id: string | null) => void;
  focusCommentWithActiveId: (id: string) => void;
  setInitialComments?: (comments: IComment[]) => void;
  setUsername?: (name: string) => void;
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
}

// ---------------------------------------------------------------------------
// Store state — only what Zustand owns + synced data
// ---------------------------------------------------------------------------

export interface CommentStoreState {
  // --- Synced from props via useEffect (data consumers subscribe to) ---
  initialComments: IComment[];
  tabComments: IComment[];
  activeComments: IComment[];
  activeComment: IComment | undefined;
  activeCommentIndex: number;
  username: string | null;
  activeCommentId: string | null;
  activeTabId: string;
  isConnected: boolean;
  isLoading: boolean;
  isDDocOwner: boolean;

  // --- External callbacks (synced via useEffect, read by consumers) ---
  onComment: (() => void) | null;
  setCommentDrawerOpen: ((open: boolean) => void) | null;
  connectViaWallet: (() => Promise<void>) | null;
  connectViaUsername: ((username: string) => Promise<void>) | null;

  // --- Editor-derived state (synced when activeCommentId changes) ---
  isCommentActive: boolean;
  isCommentResolved: boolean;

  // --- Owned state ---
  showResolved: boolean;
  reply: string;
  comment: string;
  openReplyId: string | null;
  selectedText: string;
  isCommentOpen: boolean;
  isBubbleMenuSuppressed: boolean;
  inlineCommentData: {
    inlineCommentText: string;
    handleClick: boolean;
  };
  ensCache: EnsCache;
  inProgressFetch: string[];

  // --- Ref for external deps (set once by provider) ---
  _externalDepsRef: React.RefObject<CommentExternalDeps | null> | null;
  setExternalDepsRef: (
    ref: React.RefObject<CommentExternalDeps | null>,
  ) => void;

  // --- Internal ---
  _recomputeDerived: () => void;

  // --- Synced data setters (called by provider useEffects) ---
  setInitialComments: (comments: IComment[]) => void;
  setUsername: (username: string | null) => void;
  setActiveCommentId: (id: string | null) => void;
  setActiveTabId: (tabId: string) => void;
  setIsConnected: (connected: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setIsDDocOwner: (isOwner: boolean) => void;
  setOnComment: (fn: (() => void) | null) => void;
  setCommentDrawerOpenFn: (fn: ((open: boolean) => void) | null) => void;
  setConnectViaWallet: (fn: (() => Promise<void>) | null) => void;
  setConnectViaUsername: (fn: ((username: string) => Promise<void>) | null) => void;
  setIsCommentActive: (active: boolean) => void;
  setIsCommentResolved: (resolved: boolean) => void;

  // --- Derived getters ---
  getTabComments: () => IComment[];
  getActiveComment: () => IComment | undefined;
  getActiveComments: () => IComment[];
  getActiveCommentIndex: () => number;
  getIsCommentActive: () => boolean;
  getIsCommentResolved: () => boolean;

  // --- Owned state setters ---
  setShowResolved: (show: boolean) => void;
  setReply: (reply: string) => void;
  setComment: (comment: string) => void;
  setOpenReplyId: (id: string | null) => void;
  setSelectedText: (text: string) => void;
  setIsCommentOpen: (open: boolean) => void;
  setIsBubbleMenuSuppressed: (suppressed: boolean) => void;
  setInlineCommentData: (data: {
    inlineCommentText: string;
    handleClick: boolean;
  }) => void;
  toggleResolved: () => void;

  // --- Handlers ---
  handleInput: (
    e: React.FormEvent<HTMLTextAreaElement>,
    content: string,
  ) => void;
  handleReplyChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleCommentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleCommentKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleReplyKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleReplySubmit: () => void;
  handleCommentSubmit: () => void;
  handleInlineComment: () => void;

  // --- Comment operations ---
  addComment: (content?: string, usernameProp?: string) => string | undefined;
  resolveComment: (commentId: string) => void;
  unresolveComment: (commentId: string) => void;
  deleteComment: (commentId: string) => void;
  handleAddReply: (
    activeCommentId: string,
    replyContent: string,
    replyCallback?: (activeCommentId: string, reply: IComment) => void,
  ) => void;
  focusCommentInEditor: (commentId: string) => void;
  onPrevComment: () => void;
  onNextComment: () => void;
  getEnsStatus: (
    walletAddress: string,
    setEnsStatus: React.Dispatch<React.SetStateAction<EnsStatus>>,
  ) => void;

  // --- Internal ---
  createMutationMeta: (
    type: CommentMutationType,
    mutate: () => boolean,
  ) => CommentMutationMeta | undefined;
}

// ---------------------------------------------------------------------------
// Helper to read external deps from ref
// ---------------------------------------------------------------------------

function getExtDeps(get: () => CommentStoreState): CommentExternalDeps {
  const ref = get()._externalDepsRef;
  return (
    ref?.current ?? {
      editor: null,
      ydoc: null as unknown as Y.Doc,
      setActiveCommentId: () => {},
      focusCommentWithActiveId: () => {},
      ensResolutionUrl: '',
    }
  );
}

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

export const createCommentStore = () =>
  createStore<CommentStoreState>((set, get) => ({
    // --- Synced data (updated by provider useEffects) ---
    initialComments: [],
    tabComments: [],
    activeComments: [],
    activeComment: undefined,
    activeCommentIndex: -1,
    username: null,
    activeCommentId: null,
    activeTabId: DEFAULT_TAB_ID,
    isConnected: false,
    isLoading: false,
    isDDocOwner: false,

    // --- External callbacks ---
    onComment: null,
    setCommentDrawerOpen: null,
    connectViaWallet: null,
    connectViaUsername: null,

    // --- Editor-derived state ---
    isCommentActive: false,
    isCommentResolved: false,

    // --- Owned state ---
    showResolved: true,
    reply: '',
    comment: '',
    openReplyId: null,
    selectedText: '',
    isCommentOpen: false,
    isBubbleMenuSuppressed: false,
    inlineCommentData: { inlineCommentText: '', handleClick: false },
    ensCache: (() => {
      try {
        const cached = localStorage.getItem('ensCache');
        return cached ? JSON.parse(cached) : {};
      } catch {
        return {};
      }
    })(),
    inProgressFetch: [],

    // --- External deps ref ---
    _externalDepsRef: null,
    setExternalDepsRef: (ref) => set({ _externalDepsRef: ref }),

    // --- Recompute derived state ---
    _recomputeDerived: () => {
      const { initialComments, activeTabId, activeCommentId } = get();
      const tabComments = initialComments.filter(
        (c) => (c.tabId ?? DEFAULT_TAB_ID) === activeTabId,
      );
      const activeComments = tabComments.filter(
        (c) =>
          !c.resolved &&
          c.selectedContent &&
          c.selectedContent.length > 0 &&
          !c.deleted,
      );
      const activeComment = tabComments.find((c) => c.id === activeCommentId);
      const activeCommentIndex = activeComments.findIndex(
        (c) => c.id === activeCommentId,
      );
      set({ tabComments, activeComments, activeComment, activeCommentIndex });
    },

    // --- Synced data setters (batch with derived recomputation to avoid double set) ---
    setInitialComments: (comments) => {
      set({ initialComments: comments });
      // Recompute in same tick — Zustand batches synchronous set() calls
      const { activeTabId, activeCommentId } = get();
      const tabComments = comments.filter(
        (c) => (c.tabId ?? DEFAULT_TAB_ID) === activeTabId,
      );
      const activeComments = tabComments.filter(
        (c) => !c.resolved && c.selectedContent && c.selectedContent.length > 0 && !c.deleted,
      );
      const activeComment = tabComments.find((c) => c.id === activeCommentId);
      const activeCommentIndex = activeComments.findIndex((c) => c.id === activeCommentId);
      set({ tabComments, activeComments, activeComment, activeCommentIndex });
    },
    setUsername: (username) => {
      set({ username });
      if (username) getExtDeps(get).setUsername?.(username);
    },
    setActiveCommentId: (id) => {
      set({ activeCommentId: id });
      const tabComments = get().tabComments;
      const activeComments = get().activeComments;
      const activeComment = tabComments.find((c) => c.id === id);
      const activeCommentIndex = activeComments.findIndex((c) => c.id === id);
      set({ activeComment, activeCommentIndex });
    },
    setActiveTabId: (tabId) => {
      set({ activeTabId: tabId });
      get()._recomputeDerived();
    },
    setIsConnected: (connected) => set({ isConnected: connected }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    setIsDDocOwner: (isOwner) => set({ isDDocOwner: isOwner }),
    setOnComment: (fn) => set({ onComment: fn }),
    setCommentDrawerOpenFn: (fn) => set({ setCommentDrawerOpen: fn }),
    setConnectViaWallet: (fn) => set({ connectViaWallet: fn }),
    setConnectViaUsername: (fn) => set({ connectViaUsername: fn }),
    setIsCommentActive: (active) => set({ isCommentActive: active }),
    setIsCommentResolved: (resolved) => set({ isCommentResolved: resolved }),

    // --- Derived getters (read from pre-computed state) ---
    getTabComments: () => get().tabComments,
    getActiveComment: () => get().activeComment,
    getActiveComments: () => get().activeComments,
    getActiveCommentIndex: () => get().activeCommentIndex,
    getIsCommentActive: () => get().isCommentActive,
    getIsCommentResolved: () => get().isCommentResolved,

    // --- Owned state setters ---
    setShowResolved: (show) => set({ showResolved: show }),
    setReply: (reply) => set({ reply }),
    setComment: (comment) => set({ comment }),
    setOpenReplyId: (id) => set({ openReplyId: id }),
    setSelectedText: (text) => set({ selectedText: text }),
    setIsCommentOpen: (open) => set({ isCommentOpen: open }),
    setIsBubbleMenuSuppressed: (suppressed) =>
      set({ isBubbleMenuSuppressed: suppressed }),
    setInlineCommentData: (data) => set({ inlineCommentData: data }),
    toggleResolved: () => set((s) => ({ showResolved: !s.showResolved })),

    // --- Handlers ---
    handleInput: (e, contentValue) => {
      e.currentTarget.style.height = 'auto';
      const newHeight = Math.min(
        Math.max(40, e.currentTarget.scrollHeight),
        contentValue.length > 30 || contentValue.includes('\n') ? 96 : 40,
      );
      e.currentTarget.style.height = `${newHeight}px`;
    },
    handleReplyChange: (e) => {
      const value = e.target.value;
      set({ reply: value });
      if (!value) e.target.style.height = '40px';
    },
    handleCommentChange: (e) => {
      const value = e.target.value;
      set({ comment: value });
      if (!value) e.target.style.height = '40px';
    },
    handleCommentKeyDown: (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        get().handleCommentSubmit();
      }
    },
    handleReplyKeyDown: (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        get().handleReplySubmit();
      }
    },
    handleReplySubmit: () => {
      const { activeCommentId, reply } = get();
      const { onCommentReply } = getExtDeps(get);
      if (!activeCommentId || !reply.trim()) return;
      get().handleAddReply(activeCommentId, reply, onCommentReply ?? undefined);
      set({ reply: '' });
    },
    handleCommentSubmit: () => {
      const { comment, username, activeTabId, onComment } = get();
      const { onNewComment, setActiveCommentId } = getExtDeps(get);
      if (!comment.trim() || !username) return;

      const newComment: IComment = {
        id: `comment-${uuid()}`,
        tabId: activeTabId,
        username: username!,
        selectedContent: '',
        content: comment,
        replies: [],
        createdAt: new Date(),
      };

      onNewComment?.(newComment);
      setActiveCommentId(newComment.id!);
      set({ comment: '' });
      onComment?.();
    },
    handleInlineComment: () => {
      const { editor } = getExtDeps(get);
      const { onInlineComment } = getExtDeps(get);
      if (!editor) return;

      const { state } = editor;
      const { from, to } = state.selection;
      const text = state.doc.textBetween(from, to, ' ');

      const isActive = editor.isActive('comment');
      if (isActive) {
        const activeComment = get().getActiveComment();
        if (activeComment) {
          set({ selectedText: activeComment.selectedContent || '' });
        }
      } else {
        set({ selectedText: text });
      }
      set({ isCommentOpen: true });
      onInlineComment?.();
    },

    // --- Comment operations ---
    addComment: (content, usernameProp) => {
      const { editor } = getExtDeps(get);
      const { onNewComment, setActiveCommentId, focusCommentWithActiveId } =
        getExtDeps(get);
      const { username, activeTabId } = get();
      if (!editor) return undefined;

      const { state } = editor;
      const { from, to } = state.selection;
      const selectedContent = state.doc.textBetween(from, to, ' ');

      const newComment: IComment = {
        id: `comment-${uuid()}`,
        tabId: activeTabId,
        username: usernameProp || username!,
        selectedContent,
        content: content || '',
        replies: [],
        createdAt: new Date(),
      };

      const mutationMeta = get().createMutationMeta('create', () =>
        editor.commands.setComment(newComment.id || ''),
      );
      if (newComment.selectedContent && !mutationMeta) return undefined;

      setActiveCommentId(newComment.id || '');
      setTimeout(() => focusCommentWithActiveId(newComment.id || ''), 0);
      onNewComment?.(newComment, mutationMeta);
      return newComment.id;
    },

    resolveComment: (commentId) => {
      const { editor } = getExtDeps(get);
      const { onResolveComment } = getExtDeps(get);
      if (!editor) return;
      const mutationMeta = get().createMutationMeta('resolve', () =>
        editor.commands.resolveComment(commentId),
      );
      onResolveComment?.(commentId, mutationMeta);
    },

    unresolveComment: (commentId) => {
      const { editor } = getExtDeps(get);
      const { onUnresolveComment } = getExtDeps(get);
      if (!editor) return;
      const mutationMeta = get().createMutationMeta('unresolve', () =>
        editor.commands.unresolveComment(commentId),
      );
      onUnresolveComment?.(commentId, mutationMeta);
    },

    deleteComment: (commentId) => {
      const { editor } = getExtDeps(get);
      const { onDeleteComment } = getExtDeps(get);
      if (!editor) return;
      const mutationMeta = get().createMutationMeta('delete', () =>
        editor.commands.unsetComment(commentId),
      );
      onDeleteComment?.(commentId, mutationMeta);
    },

    handleAddReply: (activeCommentId, replyContent, replyCallback) => {
      if (!replyContent.trim()) return;
      const { activeTabId, username } = get();
      const { onCommentReply } = getExtDeps(get);
      const newReply: IComment = {
        id: `reply-${uuid()}`,
        tabId: activeTabId,
        content: replyContent,
        username: username!,
        replies: [],
        createdAt: new Date(),
        selectedContent: '',
      };
      const callback = replyCallback ?? onCommentReply;
      callback?.(activeCommentId, newReply);
    },

    focusCommentInEditor: (commentId) => {
      const { editor, setActiveCommentId } = getExtDeps(get);
      if (!editor?.view?.dom) return;

      const tabComments = get().getTabComments();
      const foundComment = tabComments.find((c) => c.id === commentId);
      if (!foundComment) return;

      if (foundComment.selectedContent) {
        const commentElement = editor.view.dom.querySelector<HTMLElement>(
          `[data-comment-id="${commentId}"]`,
        );
        if (commentElement) {
          const from = editor.view.posAtDOM(commentElement, 0);
          const to = from + (commentElement.textContent?.length ?? 0);
          editor.commands.setTextSelection({ from, to });

          requestAnimationFrame(() => {
            commentElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          });
        }
      }
      setActiveCommentId(commentId);
    },

    onPrevComment: () => {
      const { editor } = getExtDeps(get);
      if (!editor?.view?.dom) return;
      const activeCommentIndex = get().getActiveCommentIndex();
      const activeComments = get().getActiveComments();
      if (activeCommentIndex > 0) {
        const prevComment = activeComments[activeCommentIndex - 1];
        const commentElement = editor.view.dom.querySelector<HTMLElement>(
          `[data-comment-id="${prevComment.id}"]`,
        );
        if (commentElement) {
          const from = editor.view.posAtDOM(commentElement, 0);
          const to = from + (commentElement.textContent?.length ?? 0);
          editor.commands.setTextSelection({ from, to });
          get().focusCommentInEditor(prevComment.id || '');
        }
      }
    },

    onNextComment: () => {
      const { editor } = getExtDeps(get);
      if (!editor?.view?.dom) return;
      const activeCommentIndex = get().getActiveCommentIndex();
      const activeComments = get().getActiveComments();
      if (activeCommentIndex < activeComments.length - 1) {
        const nextComment = activeComments[activeCommentIndex + 1];
        const commentElement = editor.view.dom.querySelector<HTMLElement>(
          `[data-comment-id="${nextComment.id}"]`,
        );
        if (commentElement) {
          const from = editor.view.posAtDOM(commentElement, 0);
          const to = from + (commentElement.textContent?.length ?? 0);
          editor.commands.setTextSelection({ from, to });
          get().focusCommentInEditor(nextComment.id || '');
        }
      }
    },

    getEnsStatus: async (walletAddress, setEnsStatus) => {
      const { inProgressFetch, ensCache } = get();
      const { ensResolutionUrl } = getExtDeps(get);

      if (inProgressFetch.includes(walletAddress)) {
        setEnsStatus({ name: walletAddress || 'Anonymous', isEns: false });
        return;
      }
      if (walletAddress && ensCache[walletAddress]) {
        setEnsStatus({ ...ensCache[walletAddress] });
        return;
      }
      if (!walletAddress || !ensResolutionUrl) {
        setEnsStatus({ name: walletAddress || 'Anonymous', isEns: false });
        return;
      }

      try {
        set({ inProgressFetch: [...inProgressFetch, walletAddress] });
        const { name, isEns, resolved } = await getAddressName(
          walletAddress,
          ensResolutionUrl,
        );
        if (resolved) {
          const newCache = {
            ...get().ensCache,
            [walletAddress]: { name, isEns },
          };
          localStorage.setItem('ensCache', JSON.stringify(newCache));
          set({ ensCache: newCache });
        }
        set({
          inProgressFetch: get().inProgressFetch.filter(
            (item) => item !== walletAddress,
          ),
        });
        setEnsStatus({ name, isEns });
      } catch (error) {
        console.error('Error fetching ENS name:', error);
        setEnsStatus({ name: walletAddress || 'Anonymous', isEns: false });
      }
    },

    // --- Internal ---
    createMutationMeta: (type, mutate) => {
      const { ydoc } = getExtDeps(get);
      if (!ydoc) return undefined;
      const beforeStateVector = Y.encodeStateVector(ydoc);
      const hasMutated = mutate();
      if (!hasMutated) return undefined;
      const update = Y.encodeStateAsUpdate(ydoc, beforeStateVector);
      if (!update || update.byteLength === 0) return undefined;
      return { type, updateChunk: fromUint8Array(update) };
    },
  }));

// ---------------------------------------------------------------------------
// React integration
// ---------------------------------------------------------------------------

type CommentStore = ReturnType<typeof createCommentStore>;

export const CommentStoreContext = createContext<CommentStore | null>(null);

export function useCommentStore<T>(
  selector: (state: CommentStoreState) => T,
): T {
  const store = useContext(CommentStoreContext);
  if (!store) {
    throw new Error('useCommentStore must be used within CommentStoreProvider');
  }
  return useStore(store, selector);
}
