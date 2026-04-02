import { Editor } from '@tiptap/react';
import { createContext, useContext } from 'react';
import React from 'react';
import uuid from 'react-uuid';
import { createStore, useStore } from 'zustand';
import { fromUint8Array } from 'js-base64';
import * as Y from 'yjs';
import {
  CommentFloatingDraftItem,
  CommentFloatingItem,
  EnsCache,
  InlineCommentData,
} from '../components/inline-comment/context/types';
import { EnsStatus } from '../components/inline-comment/types';
import { DEFAULT_TAB_ID } from '../components/tabs/utils/tab-utils';
import { getDraftCommentRange, IComment } from '../extensions/comment';
import { CommentMutationMeta, CommentMutationType } from '../types';
import { getAddressName } from '../utils/getAddressName';

export interface CommentExternalDeps {
  editor: Editor | null;
  ydoc: Y.Doc;
  setActiveCommentId: (id: string | null) => void;
  focusCommentWithActiveId: (id: string) => void;
  setInitialComments?: React.Dispatch<React.SetStateAction<IComment[]>>;
  setUsername?: React.Dispatch<React.SetStateAction<string>>;
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

type FloatingItemsUpdater = React.SetStateAction<CommentFloatingItem[]>;
type InlineCommentDataUpdater =
  | Partial<InlineCommentData>
  | ((
      prev: InlineCommentData,
    ) => Partial<InlineCommentData> | InlineCommentData);

const setFocusedFloatingItem = (
  items: CommentFloatingItem[],
  itemId: string,
): CommentFloatingItem[] => {
  return items.map((item) => ({
    ...item,
    isOpen: item.itemId === itemId ? true : item.isOpen,
    isFocused: item.itemId === itemId,
  }));
};

const upsertFloatingThread = (
  items: CommentFloatingItem[],
  {
    commentId,
    selectedText,
    preferredItemId,
  }: {
    commentId: string;
    selectedText: string;
    preferredItemId?: string;
  },
): CommentFloatingItem[] => {
  const existingItem = items.find(
    (item) => item.type === 'thread' && item.commentId === commentId,
  );

  if (existingItem) {
    return items.map((item) =>
      item.itemId === existingItem.itemId
        ? {
            ...item,
            selectedText,
            isOpen: true,
            isFocused: true,
          }
        : { ...item, isFocused: false },
    );
  }

  const nextItemId = preferredItemId ?? `thread:${commentId}`;

  return [
    ...items.map((item) => ({ ...item, isFocused: false })),
    {
      itemId: nextItemId,
      type: 'thread',
      commentId,
      selectedText,
      isOpen: true,
      isFocused: true,
    },
  ];
};

const resolveFloatingItemsUpdater = (
  previousItems: CommentFloatingItem[],
  nextItems: FloatingItemsUpdater,
) => {
  return typeof nextItems === 'function' ? nextItems(previousItems) : nextItems;
};

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
  inlineCommentData: InlineCommentData;
  floatingItems: CommentFloatingItem[];
  isDesktopFloatingEnabled: boolean;
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
  setConnectViaUsername: (
    fn: ((username: string) => Promise<void>) | null,
  ) => void;
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
  setInlineCommentData: (data: InlineCommentDataUpdater) => void;
  setFloatingItems: (items: FloatingItemsUpdater) => void;
  clearFloatingItems: () => void;
  setIsDesktopFloatingEnabled: (enabled: boolean) => void;
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
  createFloatingDraft: () => string | null;
  updateFloatingDraftText: (draftId: string, value: string) => void;
  cancelFloatingDraft: (draftId: string) => void;
  submitFloatingDraft: (draftId: string) => void;
  openFloatingThread: (commentId: string) => void;
  closeFloatingItem: (itemId: string) => void;
  blurFloatingItem: (itemId: string) => void;
  focusFloatingItem: (itemId: string) => void;
  pruneFloatingItems: () => void;
  syncFloatingThreadWithActiveComment: () => void;
  submitPendingFloatingDrafts: () => void;
  resolveComment: (commentId: string) => void;
  unresolveComment: (commentId: string) => void;
  deleteComment: (commentId: string) => void;
  deleteReply: (commentId: string, replyId: string) => void;
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
    inlineCommentData: {
      highlightedTextContent: '',
      inlineCommentText: '',
      handleClick: false,
    },
    floatingItems: [],
    isDesktopFloatingEnabled: false,
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
        (comment) => (comment.tabId ?? DEFAULT_TAB_ID) === activeTabId,
      );
      const activeComments = tabComments.filter(
        (comment) =>
          !comment.resolved &&
          Boolean(comment.selectedContent) &&
          !comment.deleted,
      );
      const activeComment = tabComments.find(
        (comment) => comment.id === activeCommentId,
      );
      const activeCommentIndex = activeComments.findIndex(
        (comment) => comment.id === activeCommentId,
      );

      set({ tabComments, activeComments, activeComment, activeCommentIndex });
    },

    // --- Synced data setters (batch with derived recomputation to avoid double set) ---
    setInitialComments: (comments) => {
      set({ initialComments: comments });
      // Recompute in same tick — Zustand batches synchronous set() calls
      const { activeTabId, activeCommentId } = get();
      const tabComments = comments.filter(
        (comment) => (comment.tabId ?? DEFAULT_TAB_ID) === activeTabId,
      );
      const activeComments = tabComments.filter(
        (comment) =>
          !comment.resolved &&
          Boolean(comment.selectedContent) &&
          !comment.deleted,
      );
      const activeComment = tabComments.find(
        (comment) => comment.id === activeCommentId,
      );
      const activeCommentIndex = activeComments.findIndex(
        (comment) => comment.id === activeCommentId,
      );

      set({ tabComments, activeComments, activeComment, activeCommentIndex });
    },
    setUsername: (username) => {
      const previousUsername = get().username;
      set({ username });

      if (username && previousUsername !== username) {
        getExtDeps(get).setUsername?.(username);
      }
    },
    setActiveCommentId: (id) => {
      set({ activeCommentId: id });

      const tabComments = get().tabComments;
      const activeComments = get().activeComments;
      const activeComment = tabComments.find((comment) => comment.id === id);
      const activeCommentIndex = activeComments.findIndex(
        (comment) => comment.id === id,
      );

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
    setIsCommentOpen: (open) => {
      // Remove temporary highlight when closing comment dialog
      if (!open) {
        const { editor } = getExtDeps(get);
        if (editor && editor.isActive('highlight')) {
          editor.chain().unsetHighlight().run();
        }
      }

      set({ isCommentOpen: open });
    },
    setIsBubbleMenuSuppressed: (suppressed) =>
      set({ isBubbleMenuSuppressed: suppressed }),
    setInlineCommentData: (updater) =>
      set((state) => {
        const nextValue =
          typeof updater === 'function'
            ? updater(state.inlineCommentData)
            : updater;

        return {
          inlineCommentData: {
            ...state.inlineCommentData,
            ...nextValue,
          },
        };
      }),
    setFloatingItems: (nextItems) =>
      set((state) => ({
        floatingItems: resolveFloatingItemsUpdater(
          state.floatingItems,
          nextItems,
        ),
      })),
    clearFloatingItems: () => set({ floatingItems: [] }),
    setIsDesktopFloatingEnabled: (enabled) =>
      set({ isDesktopFloatingEnabled: enabled }),
    toggleResolved: () =>
      set((state) => ({ showResolved: !state.showResolved })),

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
      if (!value) {
        e.target.style.height = '40px';
      }
    },
    handleCommentChange: (e) => {
      const value = e.target.value;
      set({ comment: value });
      if (!value) {
        e.target.style.height = '40px';
      }
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

      if (!activeCommentId || !reply.trim()) {
        return;
      }

      get().handleAddReply(activeCommentId, reply, onCommentReply ?? undefined);
      set({ reply: '' });
    },
    handleCommentSubmit: () => {
      const { comment, username, activeTabId, onComment } = get();
      const { onNewComment, setActiveCommentId } = getExtDeps(get);

      if (!comment.trim() || !username) {
        return;
      }

      const newComment: IComment = {
        id: `comment-${uuid()}`,
        tabId: activeTabId,
        username,
        selectedContent: '',
        content: comment,
        replies: [],
        createdAt: new Date(),
      };

      onNewComment?.(newComment);
      setActiveCommentId(newComment.id || null);
      set({ comment: '' });
      onComment?.();
    },
    handleInlineComment: () => {
      get().createFloatingDraft();
    },

    // --- Comment operations ---
    addComment: (content, usernameProp) => {
      const {
        editor,
        onNewComment,
        setActiveCommentId,
        focusCommentWithActiveId,
      } = getExtDeps(get);
      const { username, activeTabId } = get();

      if (!editor) {
        return undefined;
      }

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

      // Remove temporary highlight before applying comment mark
      if (editor.isActive('highlight')) {
        editor.chain().unsetHighlight().run();
      }

      const mutationMeta = get().createMutationMeta('create', () =>
        editor.commands.setComment(newComment.id || ''),
      );

      if (newComment.selectedContent && !mutationMeta) {
        return undefined;
      }

      setActiveCommentId(newComment.id || '');
      setTimeout(() => focusCommentWithActiveId(newComment.id || ''), 0);
      onNewComment?.(newComment, mutationMeta);
      return newComment.id;
    },
    createFloatingDraft: () => {
      const { editor, onInlineComment } = getExtDeps(get);
      const { activeComment, isDesktopFloatingEnabled, isCommentActive } =
        get();

      if (!editor) {
        return null;
      }

      const { state } = editor;
      const { from, to } = state.selection;
      const text = state.doc.textBetween(from, to, ' ');

      if (!isDesktopFloatingEnabled) {
        if (isCommentActive) {
          if (activeComment) {
            set({ selectedText: activeComment.selectedContent || '' });
          }
        } else {
          set({ selectedText: text });
        }

        set({ isCommentOpen: true });
        onInlineComment?.();
        return null;
      }

      if (from >= to || !text.trim()) {
        return null;
      }

      const draftId = `draft-${uuid()}`;
      const didCreateDraft = editor.commands.setDraftComment(draftId);

      if (!didCreateDraft) {
        return null;
      }

      const itemId = `draft:${draftId}`;

      set((state) => ({
        selectedText: text,
        isBubbleMenuSuppressed: true,
        floatingItems: [
          ...state.floatingItems.map((item) => ({ ...item, isFocused: false })),
          {
            itemId,
            type: 'draft',
            draftId,
            selectedText: text,
            draftText: '',
            isAuthPending: false,
            isOpen: true,
            isFocused: true,
          } satisfies CommentFloatingDraftItem,
        ],
      }));

      onInlineComment?.();
      return draftId;
    },
    updateFloatingDraftText: (draftId, value) => {
      set((state) => ({
        floatingItems: state.floatingItems.map((item) =>
          item.type === 'draft' && item.draftId === draftId
            ? {
                ...item,
                draftText: value,
              }
            : item,
        ),
      }));
    },
    cancelFloatingDraft: (draftId) => {
      const draftItem = get().floatingItems.find(
        (item): item is CommentFloatingDraftItem =>
          item.type === 'draft' && item.draftId === draftId,
      );

      if (!draftItem) {
        return;
      }

      get().closeFloatingItem(draftItem.itemId);
    },
    submitFloatingDraft: (draftId) => {
      const {
        activeTabId,
        floatingItems,
        isConnected,
        setCommentDrawerOpen,
        username,
      } = get();
      const {
        editor,
        focusCommentWithActiveId,
        onNewComment,
        setActiveCommentId,
      } = getExtDeps(get);
      const draftItem = floatingItems.find(
        (item): item is CommentFloatingDraftItem =>
          item.type === 'draft' && item.draftId === draftId,
      );

      if (!draftItem) {
        return;
      }

      const draftText = draftItem.draftText.trim();

      if (!draftText) {
        return;
      }

      if (!isConnected || !username) {
        set((state) => ({
          floatingItems: state.floatingItems.map((item) =>
            item.type === 'draft' && item.draftId === draftId
              ? {
                  ...item,
                  isAuthPending: true,
                  isFocused: true,
                }
              : { ...item, isFocused: false },
          ),
        }));
        setCommentDrawerOpen?.(true);
        return;
      }

      if (!editor) {
        return;
      }

      const newComment: IComment = {
        id: `comment-${uuid()}`,
        tabId: activeTabId,
        username,
        selectedContent: draftItem.selectedText,
        content: draftText,
        replies: [],
        createdAt: new Date(),
      };

      const mutationMeta = get().createMutationMeta('create', () =>
        editor.commands.promoteDraftComment(draftId, newComment.id || ''),
      );

      if (draftItem.selectedText && !mutationMeta) {
        set((state) => ({
          floatingItems: state.floatingItems.map((item) =>
            item.type === 'draft' && item.draftId === draftId
              ? {
                  ...item,
                  isAuthPending: false,
                }
              : item,
          ),
        }));
        return;
      }

      get().setActiveCommentId(newComment.id || '');
      setActiveCommentId(newComment.id || '');
      setTimeout(() => focusCommentWithActiveId(newComment.id || ''), 0);
      onNewComment?.(newComment, mutationMeta);
      editor.commands.setCommentActive(newComment.id || '');

      set((state) => {
        const nextItems = state.floatingItems.filter(
          (item) =>
            !(
              item.itemId !== draftItem.itemId &&
              item.type === 'thread' &&
              item.commentId === newComment.id
            ),
        );
        const replacementThreadItem = {
          itemId: draftItem.itemId,
          type: 'thread' as const,
          commentId: newComment.id || '',
          selectedText: draftItem.selectedText,
          isOpen: true,
          isFocused: true,
        };
        const replacementIndex = nextItems.findIndex(
          (item) => item.itemId === draftItem.itemId,
        );

        return {
          floatingItems:
            replacementIndex >= 0
              ? nextItems.map((item) =>
                  item.itemId === draftItem.itemId
                    ? replacementThreadItem
                    : {
                        ...item,
                        isFocused: false,
                      },
                )
              : [
                  ...nextItems.map((item) => ({
                    ...item,
                    isFocused: false,
                  })),
                  replacementThreadItem,
                ],
        };
      });
    },
    openFloatingThread: (commentId) => {
      const { editor, setActiveCommentId } = getExtDeps(get);
      const commentToOpen = get().tabComments.find(
        (comment) =>
          comment.id === commentId && !comment.deleted && !comment.resolved,
      );

      if (!editor || !commentToOpen?.selectedContent) {
        return;
      }

      set((state) => ({
        floatingItems: upsertFloatingThread(state.floatingItems, {
          commentId,
          selectedText: commentToOpen.selectedContent || '',
        }),
      }));
      setActiveCommentId(commentId);
      editor.commands.setCommentActive(commentId);
    },
    closeFloatingItem: (itemId) => {
      const { editor, setActiveCommentId } = getExtDeps(get);
      const { activeCommentId, floatingItems } = get();
      const itemToClose = floatingItems.find((item) => item.itemId === itemId);

      if (!editor || !itemToClose) {
        return;
      }

      if (itemToClose.type === 'draft') {
        editor.commands.unsetDraftComment(itemToClose.draftId);
      } else if (activeCommentId === itemToClose.commentId) {
        setActiveCommentId(null);
        editor.commands.unsetCommentActive();
      }

      set((state) => ({
        floatingItems: state.floatingItems.filter(
          (item) => item.itemId !== itemId,
        ),
      }));
    },
    blurFloatingItem: (itemId) => {
      const { editor, setActiveCommentId } = getExtDeps(get);
      const { activeCommentId, floatingItems } = get();
      const itemToBlur = floatingItems.find((item) => item.itemId === itemId);

      if (!editor || !itemToBlur) {
        return;
      }

      if (
        itemToBlur.type === 'thread' &&
        activeCommentId === itemToBlur.commentId
      ) {
        setActiveCommentId(null);
        editor.commands.unsetCommentActive();
      }

      set((state) => ({
        floatingItems: state.floatingItems.map((item) => ({
          ...item,
          isFocused: false,
        })),
      }));
    },
    focusFloatingItem: (itemId) => {
      const { editor, setActiveCommentId } = getExtDeps(get);
      const focusedItem = get().floatingItems.find(
        (item) => item.itemId === itemId,
      );

      if (!editor || !focusedItem) {
        return;
      }

      set((state) => ({
        floatingItems: setFocusedFloatingItem(state.floatingItems, itemId),
      }));

      if (focusedItem.type === 'thread') {
        setActiveCommentId(focusedItem.commentId);
        editor.commands.setCommentActive(focusedItem.commentId);
        return;
      }

      setActiveCommentId(null);
      editor.commands.unsetCommentActive();
    },
    pruneFloatingItems: () => {
      const { editor, setActiveCommentId } = getExtDeps(get);
      const { activeCommentId, floatingItems, tabComments } = get();

      if (!editor || !floatingItems.length) {
        return;
      }

      const nextItems = floatingItems.filter((item) => {
        if (item.type === 'draft') {
          return Boolean(getDraftCommentRange(editor.state, item.draftId));
        }

        const comment = tabComments.find(
          (entry) => entry.id === item.commentId,
        );
        return Boolean(comment && !comment.deleted && !comment.resolved);
      });

      if (nextItems.length !== floatingItems.length) {
        const removedActiveThread = floatingItems.find(
          (item) =>
            item.type === 'thread' &&
            item.commentId === activeCommentId &&
            !nextItems.some((nextItem) => nextItem.itemId === item.itemId),
        );

        if (removedActiveThread) {
          setActiveCommentId(null);
          editor.commands.unsetCommentActive();
        }

        set({ floatingItems: nextItems });
      }
    },
    syncFloatingThreadWithActiveComment: () => {
      const { activeCommentId, isDesktopFloatingEnabled, tabComments } = get();

      if (!isDesktopFloatingEnabled || !activeCommentId) {
        return;
      }

      const activeThread = tabComments.find(
        (comment) =>
          comment.id === activeCommentId &&
          !comment.deleted &&
          !comment.resolved,
      );

      if (!activeThread?.selectedContent) {
        return;
      }

      set((state) => ({
        floatingItems: upsertFloatingThread(state.floatingItems, {
          commentId: activeCommentId,
          selectedText: activeThread.selectedContent || '',
        }),
      }));
    },
    submitPendingFloatingDrafts: () => {
      const { floatingItems, isConnected, isDesktopFloatingEnabled, username } =
        get();

      if (!isDesktopFloatingEnabled || !isConnected || !username) {
        return;
      }

      floatingItems
        .filter(
          (item): item is CommentFloatingDraftItem =>
            item.type === 'draft' &&
            item.isAuthPending &&
            Boolean(item.draftText.trim()),
        )
        .forEach((draftItem) => {
          get().submitFloatingDraft(draftItem.draftId);
        });
    },
    resolveComment: (commentId) => {
      const { editor, onResolveComment, setActiveCommentId } = getExtDeps(get);

      if (!editor) {
        return;
      }

      const mutationMeta = get().createMutationMeta('resolve', () =>
        editor.commands.resolveComment(commentId),
      );

      set((state) => ({
        floatingItems: state.floatingItems.filter(
          (item) => !(item.type === 'thread' && item.commentId === commentId),
        ),
      }));

      if (get().activeCommentId === commentId) {
        setActiveCommentId(null);
      }

      onResolveComment?.(commentId, mutationMeta);
    },
    unresolveComment: (commentId) => {
      const { editor, onUnresolveComment } = getExtDeps(get);

      if (!editor) {
        return;
      }

      const mutationMeta = get().createMutationMeta('unresolve', () =>
        editor.commands.unresolveComment(commentId),
      );

      onUnresolveComment?.(commentId, mutationMeta);
    },
    deleteComment: (commentId) => {
      const { editor, onDeleteComment, setActiveCommentId } = getExtDeps(get);

      if (!editor) {
        return;
      }

      const mutationMeta = get().createMutationMeta('delete', () =>
        editor.commands.unsetComment(commentId),
      );

      set((state) => ({
        floatingItems: state.floatingItems.filter(
          (item) => !(item.type === 'thread' && item.commentId === commentId),
        ),
      }));

      if (get().activeCommentId === commentId) {
        setActiveCommentId(null);
      }

      onDeleteComment?.(commentId, mutationMeta);
    },
    deleteReply: (commentId, replyId) => {
      getExtDeps(get).setInitialComments?.((previousComments) =>
        previousComments.map((comment) => {
          if (comment.id !== commentId) {
            return comment;
          }

          return {
            ...comment,
            replies: (comment.replies || []).map((reply) =>
              reply.id === replyId ? { ...reply, deleted: true } : reply,
            ),
          };
        }),
      );
    },
    handleAddReply: (activeCommentId, replyContent, replyCallback) => {
      if (!replyContent.trim()) {
        return;
      }

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

      if (!editor?.view?.dom) {
        return;
      }

      const foundComment = get()
        .getTabComments()
        .find((comment) => comment.id === commentId);

      if (!foundComment) {
        return;
      }

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

      if (!editor?.view?.dom) {
        return;
      }

      const activeCommentIndex = get().getActiveCommentIndex();
      const activeComments = get().getActiveComments();

      if (activeCommentIndex > 0) {
        const previousComment = activeComments[activeCommentIndex - 1];
        const commentElement = editor.view.dom.querySelector<HTMLElement>(
          `[data-comment-id="${previousComment.id}"]`,
        );

        if (commentElement) {
          const from = editor.view.posAtDOM(commentElement, 0);
          const to = from + (commentElement.textContent?.length ?? 0);
          editor.commands.setTextSelection({ from, to });
          get().focusCommentInEditor(previousComment.id || '');
        }
      }
    },
    onNextComment: () => {
      const { editor } = getExtDeps(get);

      if (!editor?.view?.dom) {
        return;
      }

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
      const { ensCache, inProgressFetch } = get();
      const { ensResolutionUrl } = getExtDeps(get);

      if (inProgressFetch.includes(walletAddress)) {
        setEnsStatus({ name: walletAddress || 'Anonymous', isEns: false });
        return;
      }

      if (walletAddress && ensCache[walletAddress]) {
        setEnsStatus({ ...ensCache[walletAddress] });
        return;
      }
      // If the username is already an ENS name, no need to resolve
      if (walletAddress && walletAddress.endsWith('.eth')) {
        setEnsStatus({ name: walletAddress, isEns: true });
        return;
      }

      if (!walletAddress || !ensResolutionUrl) {
        setEnsStatus({ name: walletAddress || 'Anonymous', isEns: false });
        return;
      }

      try {
        set({ inProgressFetch: [...inProgressFetch, walletAddress] });

        const { isEns, name, resolved } = await getAddressName(
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

      if (!ydoc) {
        return undefined;
      }

      const beforeStateVector = Y.encodeStateVector(ydoc);
      const hasMutated = mutate();

      if (!hasMutated) {
        return undefined;
      }

      const update = Y.encodeStateAsUpdate(ydoc, beforeStateVector);

      if (!update || update.byteLength === 0) {
        return undefined;
      }

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
