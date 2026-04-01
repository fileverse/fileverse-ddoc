import { createStore } from 'zustand';
import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import { Editor } from '@tiptap/react';
import { IComment } from '../extensions/comment';
import { CommentMutationMeta, CommentMutationType } from '../types';
import { EnsCache, EnsEntry } from '../components/inline-comment/context/types';
import { EnsStatus } from '../components/inline-comment/types';
import { getAddressName } from '../utils/getAddressName';
import { DEFAULT_TAB_ID } from '../components/tabs/utils/tab-utils';
import uuid from 'react-uuid';
import * as Y from 'yjs';
import { fromUint8Array } from 'js-base64';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommentStoreState {
  // --- External deps (synced from props on every render) ---
  editor: Editor | null;
  ydoc: Y.Doc | null;
  initialComments: IComment[];
  username: string | null;
  activeCommentId: string | null;
  activeTabId: string;
  ensResolutionUrl: string;
  isConnected: boolean;
  isLoading: boolean;
  isDDocOwner: boolean;

  // External callbacks (synced from props)
  setUsername: ((name: string) => void) | null;
  setInitialComments: ((comments: IComment[]) => void) | null;
  setActiveCommentId: ((id: string | null) => void) | null;
  focusCommentWithActiveId: ((id: string) => void) | null;
  onNewComment:
    | ((comment: IComment, meta?: CommentMutationMeta) => void)
    | null;
  onCommentReply:
    | ((activeCommentId: string, reply: IComment) => void)
    | null;
  onResolveComment:
    | ((commentId: string, meta?: CommentMutationMeta) => void)
    | null;
  onUnresolveComment:
    | ((commentId: string, meta?: CommentMutationMeta) => void)
    | null;
  onDeleteComment:
    | ((commentId: string, meta?: CommentMutationMeta) => void)
    | null;
  onInlineComment: (() => void) | null;
  onComment: (() => void) | null;
  setCommentDrawerOpen: ((open: boolean) => void) | null;
  connectViaWallet: (() => Promise<void>) | null;
  connectViaUsername: ((username: string) => Promise<void>) | null;

  // --- Owned state (managed by store) ---
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

  // --- Derived (computed getters, not stored) ---
  getTabComments: () => IComment[];
  getActiveComment: () => IComment | undefined;
  getActiveComments: () => IComment[];
  getActiveCommentIndex: () => number;
  getIsCommentActive: () => boolean;
  getIsCommentResolved: () => boolean;

  // --- Actions ---
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
  handleInput: (
    e: React.FormEvent<HTMLTextAreaElement>,
    content: string
  ) => void;
  handleReplyChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleCommentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;

  // Comment operations
  addComment: (content?: string, usernameProp?: string) => string | undefined;
  resolveComment: (commentId: string) => void;
  unresolveComment: (commentId: string) => void;
  deleteComment: (commentId: string) => void;
  handleAddReply: (
    activeCommentId: string,
    replyContent: string,
    replyCallback?: (activeCommentId: string, reply: IComment) => void
  ) => void;
  handleCommentSubmit: () => void;
  handleCommentKeyDown: (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => void;
  handleReplySubmit: () => void;
  handleReplyKeyDown: (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => void;
  handleInlineComment: () => void;
  focusCommentInEditor: (commentId: string) => void;
  onPrevComment: () => void;
  onNextComment: () => void;
  getEnsStatus: (
    walletAddress: string,
    setEnsStatus: React.Dispatch<React.SetStateAction<EnsStatus>>
  ) => void;

  // Sync method — called on every render to push props into store
  syncExternalDeps: (props: CommentStoreExternalDeps) => void;
}

export interface CommentStoreExternalDeps {
  editor: Editor;
  ydoc: Y.Doc;
  initialComments: IComment[];
  username: string | null;
  activeCommentId: string | null;
  activeTabId: string;
  ensResolutionUrl: string;
  isConnected: boolean;
  isLoading: boolean;
  isDDocOwner: boolean;
  setUsername?: (name: string) => void;
  setInitialComments?: (comments: IComment[]) => void;
  setActiveCommentId: (id: string | null) => void;
  focusCommentWithActiveId: (id: string) => void;
  onNewComment?: (comment: IComment, meta?: CommentMutationMeta) => void;
  onCommentReply?: (activeCommentId: string, reply: IComment) => void;
  onResolveComment?: (
    commentId: string,
    meta?: CommentMutationMeta
  ) => void;
  onUnresolveComment?: (
    commentId: string,
    meta?: CommentMutationMeta
  ) => void;
  onDeleteComment?: (
    commentId: string,
    meta?: CommentMutationMeta
  ) => void;
  onInlineComment?: () => void;
  onComment?: () => void;
  setCommentDrawerOpen?: (open: boolean) => void;
  connectViaWallet?: () => Promise<void>;
  connectViaUsername?: (username: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

export const createCommentStore = () =>
  createStore<CommentStoreState>((set, get) => ({
    // --- External deps (initialized as empty, synced via syncExternalDeps) ---
    editor: null,
    ydoc: null,
    initialComments: [],
    username: null,
    activeCommentId: null,
    activeTabId: DEFAULT_TAB_ID,
    ensResolutionUrl: '',
    isConnected: false,
    isLoading: false,
    isDDocOwner: false,
    setUsername: null,
    setInitialComments: null,
    setActiveCommentId: null,
    focusCommentWithActiveId: null,
    onNewComment: null,
    onCommentReply: null,
    onResolveComment: null,
    onUnresolveComment: null,
    onDeleteComment: null,
    onInlineComment: null,
    onComment: null,
    setCommentDrawerOpen: null,
    connectViaWallet: null,
    connectViaUsername: null,

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

    // --- Derived getters ---
    getTabComments: () => {
      const { initialComments, activeTabId } = get();
      return initialComments.filter(
        (c) => (c.tabId ?? DEFAULT_TAB_ID) === activeTabId
      );
    },
    getActiveComment: () => {
      const { activeCommentId } = get();
      const tabComments = get().getTabComments();
      return tabComments.find((c) => c.id === activeCommentId);
    },
    getActiveComments: () => {
      const tabComments = get().getTabComments();
      return tabComments.filter(
        (c) => !c.resolved && c.selectedContent && c.selectedContent.length > 0 && !c.deleted
      );
    },
    getActiveCommentIndex: () => {
      const { activeCommentId } = get();
      const activeComments = get().getActiveComments();
      return activeComments.findIndex((c) => c.id === activeCommentId);
    },
    getIsCommentActive: () => {
      const { editor } = get();
      return editor?.isActive('comment') ?? false;
    },
    getIsCommentResolved: () => {
      const { editor } = get();
      return editor?.getAttributes('comment').resolved ?? false;
    },

    // --- Simple setters ---
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

    // --- Input handlers ---
    handleInput: (e, contentValue) => {
      e.currentTarget.style.height = 'auto';
      const newHeight = Math.min(
        Math.max(40, e.currentTarget.scrollHeight),
        contentValue.length > 30 || contentValue.includes('\n') ? 96 : 40
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

    // --- Comment operations ---
    addComment: (content, usernameProp) => {
      const {
        editor,
        username,
        activeTabId,
        setActiveCommentId,
        focusCommentWithActiveId,
        onNewComment,
      } = get();
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
        editor.commands.setComment(newComment.id || '')
      );
      if (newComment.selectedContent && !mutationMeta) return undefined;

      setActiveCommentId?.(newComment.id || '');
      setTimeout(() => focusCommentWithActiveId?.(newComment.id || ''), 0);
      onNewComment?.(newComment, mutationMeta);
      return newComment.id;
    },

    resolveComment: (commentId) => {
      const { editor, onResolveComment } = get();
      if (!editor) return;
      const mutationMeta = get().createMutationMeta('resolve', () =>
        editor.commands.resolveComment(commentId)
      );
      onResolveComment?.(commentId, mutationMeta);
    },

    unresolveComment: (commentId) => {
      const { editor, onUnresolveComment } = get();
      if (!editor) return;
      const mutationMeta = get().createMutationMeta('unresolve', () =>
        editor.commands.unresolveComment(commentId)
      );
      onUnresolveComment?.(commentId, mutationMeta);
    },

    deleteComment: (commentId) => {
      const { editor, onDeleteComment } = get();
      if (!editor) return;
      const mutationMeta = get().createMutationMeta('delete', () =>
        editor.commands.unsetComment(commentId)
      );
      onDeleteComment?.(commentId, mutationMeta);
    },

    handleAddReply: (activeCommentId, replyContent, replyCallback) => {
      if (!replyContent.trim()) return;
      const { activeTabId, username } = get();
      const newReply: IComment = {
        id: `reply-${uuid()}`,
        tabId: activeTabId,
        content: replyContent,
        username: username!,
        replies: [],
        createdAt: new Date(),
        selectedContent: '',
      };
      replyCallback?.(activeCommentId, newReply);
    },

    handleCommentSubmit: () => {
      const {
        comment,
        username,
        activeTabId,
        onNewComment,
        setActiveCommentId,
        onComment,
      } = get();
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
      setActiveCommentId?.(newComment.id!);
      set({ comment: '' });
      onComment?.();
    },

    handleCommentKeyDown: (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        get().handleCommentSubmit();
      }
    },

    handleReplySubmit: () => {
      const { activeCommentId, reply, onCommentReply } = get();
      if (!activeCommentId || !reply.trim()) return;
      get().handleAddReply(activeCommentId, reply, onCommentReply ?? undefined);
      set({ reply: '' });
    },

    handleReplyKeyDown: (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        get().handleReplySubmit();
      }
    },

    handleInlineComment: () => {
      const { editor, onInlineComment } = get();
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

    focusCommentInEditor: (commentId) => {
      const { editor, setActiveCommentId } = get();
      if (!editor?.view?.dom) return;

      const tabComments = get().getTabComments();
      const foundComment = tabComments.find((c) => c.id === commentId);
      if (!foundComment) return;

      if (foundComment.selectedContent) {
        const commentElement = editor.view.dom.querySelector<HTMLElement>(
          `[data-comment-id="${commentId}"]`
        );
        if (commentElement) {
          const from = editor.view.posAtDOM(commentElement, 0);
          const to = from + (commentElement.textContent?.length ?? 0);
          editor.commands.setTextSelection({ from, to });

          const possibleContainers = [
            document.querySelector<HTMLElement>('.ProseMirror'),
            document.getElementById('editor-canvas'),
            commentElement.closest<HTMLElement>('.ProseMirror'),
            commentElement.closest<HTMLElement>('[class*="editor"]'),
            editor.view.dom.parentElement,
          ].filter((el): el is HTMLElement => el !== null);

          const scrollContainer = possibleContainers.find(
            (container) =>
              container.scrollHeight > container.clientHeight ||
              window.getComputedStyle(container).overflow === 'auto' ||
              window.getComputedStyle(container).overflowY === 'auto'
          );

          if (scrollContainer) {
            requestAnimationFrame(() => {
              const containerRect = scrollContainer.getBoundingClientRect();
              const elementRect = commentElement.getBoundingClientRect();
              const scrollTop =
                elementRect.top -
                containerRect.top -
                containerRect.height / 2 +
                elementRect.height / 2;
              scrollContainer.scrollBy({ top: scrollTop, behavior: 'smooth' });
            });
          }
        }
      }
      setActiveCommentId?.(commentId);
    },

    onPrevComment: () => {
      const { editor } = get();
      if (!editor?.view?.dom) return;
      const activeCommentIndex = get().getActiveCommentIndex();
      const activeComments = get().getActiveComments();
      if (activeCommentIndex > 0) {
        const prevComment = activeComments[activeCommentIndex - 1];
        const commentElement = editor.view.dom.querySelector<HTMLElement>(
          `[data-comment-id="${prevComment.id}"]`
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
      const { editor } = get();
      if (!editor?.view?.dom) return;
      const activeCommentIndex = get().getActiveCommentIndex();
      const activeComments = get().getActiveComments();
      if (activeCommentIndex < activeComments.length - 1) {
        const nextComment = activeComments[activeCommentIndex + 1];
        const commentElement = editor.view.dom.querySelector<HTMLElement>(
          `[data-comment-id="${nextComment.id}"]`
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
      const { inProgressFetch, ensCache, ensResolutionUrl } = get();

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
          ensResolutionUrl
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
            (item) => item !== walletAddress
          ),
        });
        setEnsStatus({ name, isEns });
      } catch (error) {
        console.error('Error fetching ENS name:', error);
        setEnsStatus({ name: walletAddress || 'Anonymous', isEns: false });
      }
    },

    // --- Internal helpers (not exposed to consumers directly) ---
    createMutationMeta: (
      type: CommentMutationType,
      mutate: () => boolean
    ): CommentMutationMeta | undefined => {
      const { ydoc } = get();
      if (!ydoc) return undefined;
      const beforeStateVector = Y.encodeStateVector(ydoc);
      const hasMutated = mutate();
      if (!hasMutated) return undefined;
      const update = Y.encodeStateAsUpdate(ydoc, beforeStateVector);
      if (!update || update.byteLength === 0) return undefined;
      return { type, updateChunk: fromUint8Array(update) };
    },

    // --- Sync external deps from React props ---
    syncExternalDeps: (props) => {
      set({
        editor: props.editor,
        ydoc: props.ydoc,
        initialComments: props.initialComments,
        username: props.username,
        activeCommentId: props.activeCommentId,
        activeTabId: props.activeTabId,
        ensResolutionUrl: props.ensResolutionUrl,
        isConnected: props.isConnected ?? false,
        isLoading: props.isLoading ?? false,
        isDDocOwner: props.isDDocOwner ?? false,
        setUsername: props.setUsername ?? null,
        setInitialComments: props.setInitialComments ?? null,
        setActiveCommentId: props.setActiveCommentId,
        focusCommentWithActiveId: props.focusCommentWithActiveId,
        onNewComment: props.onNewComment ?? null,
        onCommentReply: props.onCommentReply ?? null,
        onResolveComment: props.onResolveComment ?? null,
        onUnresolveComment: props.onUnresolveComment ?? null,
        onDeleteComment: props.onDeleteComment ?? null,
        onInlineComment: props.onInlineComment ?? null,
        onComment: props.onComment ?? null,
        setCommentDrawerOpen: props.setCommentDrawerOpen ?? null,
        connectViaWallet: props.connectViaWallet ?? null,
        connectViaUsername: props.connectViaUsername ?? null,
      });
    },
  }));

// ---------------------------------------------------------------------------
// React integration — per-instance store via context
// ---------------------------------------------------------------------------

type CommentStore = ReturnType<typeof createCommentStore>;

export const CommentStoreContext = createContext<CommentStore | null>(null);

export function useCommentStore<T>(selector: (state: CommentStoreState) => T): T {
  const store = useContext(CommentStoreContext);
  if (!store) {
    throw new Error('useCommentStore must be used within CommentStoreProvider');
  }
  return useStore(store, selector);
}
