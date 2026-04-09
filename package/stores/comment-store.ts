import { Editor } from '@tiptap/react';
import { createContext, useContext } from 'react';
import React from 'react';
import {
  CommentAnchor,
  createCommentAnchorFromEditor,
  triggerDecorationRebuild,
} from '../extensions/comment/comment-decoration-plugin';
import uuid from 'react-uuid';
import { createStore, useStore } from 'zustand';
import { fromUint8Array } from 'js-base64';
import * as Y from 'yjs';
import {
  CommentFloatingCard,
  CommentFloatingDraftCard,
  EnsCache,
  InlineCommentData,
  InlineCommentDraft,
  InlineDraftLocation,
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
  commentAnchorsRef?: React.MutableRefObject<CommentAnchor[]>;
}

type FloatingCardsUpdater = React.SetStateAction<CommentFloatingCard[]>;
type InlineCommentDataUpdater =
  | Partial<InlineCommentData>
  | ((
      prev: InlineCommentData,
    ) => Partial<InlineCommentData> | InlineCommentData);

type InlineDraftRecordMap = Record<string, InlineCommentDraft>;
type CreateInlineDraftOptions = {
  location?: InlineDraftLocation;
  // Only the drawer's explicit "new comment" action may bypass text selection.
  // Do not reuse this for floating comments unless unanchored inline threads
  // become a deliberate product requirement.
  allowEmptySelection?: boolean;
};

const setFocusedFloatingCard = (
  floatingCards: CommentFloatingCard[],
  floatingCardId: string,
): CommentFloatingCard[] => {
  return floatingCards.map((floatingCard) => ({
    ...floatingCard,
    isFocused: floatingCard.floatingCardId === floatingCardId,
  }));
};

const upsertFloatingThreadCard = (
  floatingCards: CommentFloatingCard[],
  {
    commentId,
    selectedText,
    preferredFloatingCardId,
  }: {
    commentId: string;
    selectedText: string;
    preferredFloatingCardId?: string;
  },
): CommentFloatingCard[] => {
  const existingFloatingThreadCard = floatingCards.find(
    (floatingCard) =>
      floatingCard.type === 'thread' && floatingCard.commentId === commentId,
  );

  if (existingFloatingThreadCard) {
    return floatingCards.map((floatingCard) =>
      floatingCard.floatingCardId === existingFloatingThreadCard.floatingCardId
        ? {
            ...floatingCard,
            selectedText,
            isFocused: true,
          }
        : { ...floatingCard, isFocused: false },
    );
  }

  const nextFloatingCardId = preferredFloatingCardId ?? `thread:${commentId}`;

  return [
    ...floatingCards.map((floatingCard) => ({
      ...floatingCard,
      isFocused: false,
    })),
    {
      floatingCardId: nextFloatingCardId,
      type: 'thread',
      commentId,
      selectedText,
      isFocused: true,
    },
  ];
};

const resolveFloatingCardsUpdater = (
  previousFloatingCards: CommentFloatingCard[],
  nextFloatingCards: FloatingCardsUpdater,
) => {
  return typeof nextFloatingCards === 'function'
    ? nextFloatingCards(previousFloatingCards)
    : nextFloatingCards;
};

const upsertInlineDraft = (
  drafts: InlineDraftRecordMap,
  draft: InlineCommentDraft,
) => ({
  ...drafts,
  [draft.draftId]: draft,
});

const removeInlineDraft = (
  drafts: InlineDraftRecordMap,
  draftId: string,
): InlineDraftRecordMap => {
  if (!drafts[draftId]) {
    return drafts;
  }

  const nextDrafts = { ...drafts };
  delete nextDrafts[draftId];
  return nextDrafts;
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
  floatingCards: CommentFloatingCard[];
  inlineDrafts: InlineDraftRecordMap;
  activeDraftId: string | null;
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
  setFloatingCards: (floatingCards: FloatingCardsUpdater) => void;
  clearFloatingCards: () => void;
  setActiveDraftId: (draftId: string | null) => void;
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
  createFloatingDraft: (options?: CreateInlineDraftOptions) => string | null;
  updateInlineDraftText: (draftId: string, value: string) => void;
  cancelInlineDraft: (draftId: string) => void;
  submitInlineDraft: (draftId: string) => void;
  updateFloatingDraftText: (draftId: string, value: string) => void;
  cancelFloatingDraft: (draftId: string) => void;
  submitFloatingDraft: (draftId: string) => void;
  openFloatingThread: (commentId: string) => void;
  closeFloatingCard: (floatingCardId: string) => void;
  blurFloatingCard: (floatingCardId: string) => void;
  focusFloatingCard: (floatingCardId: string) => void;
  removeInvalidFloatingCards: () => void;
  syncFloatingThreadCardWithActiveComment: () => void;
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
    floatingCards: [],
    inlineDrafts: {},
    activeDraftId: null,
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
        (comment) => (comment.tabId || DEFAULT_TAB_ID) === activeTabId,
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
      const { activeTabId, activeCommentId, openReplyId } = get();
      const tabComments = comments.filter(
        (comment) => (comment.tabId || DEFAULT_TAB_ID) === activeTabId,
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
      // `openReplyId` drives the mobile focused-thread mode. Only deleted
      // comments should clear it here; resolved comments must retain focus so
      // the drawer stays in the active thread view.
      const nextOpenReplyId = comments.some(
        (comment) => comment.id === openReplyId && !comment.deleted,
      )
        ? openReplyId
        : null;

      set({
        tabComments,
        activeComments,
        activeComment,
        activeCommentIndex,
        openReplyId: nextOpenReplyId,
      });
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
      const {
        activeDraftId,
        activeTabId,
        inlineDrafts,
        isCommentOpen,
        openReplyId,
      } = get();
      const { editor } = getExtDeps(get);

      if (activeTabId !== tabId && editor) {
        // Draft anchors are tab-scoped. Clear them eagerly on tab switch so a
        // later submit cannot bind to a stale range from the previous tab.
        Object.keys(inlineDrafts).forEach((draftId) => {
          editor.commands.unsetDraftComment(draftId);
        });

        if (editor.isActive('highlight')) {
          editor.chain().unsetHighlight().run();
        }
      }

      set({
        activeTabId: tabId,
        inlineDrafts: activeTabId === tabId ? inlineDrafts : {},
        activeDraftId: activeTabId === tabId ? activeDraftId : null,
        isCommentOpen: activeTabId === tabId ? isCommentOpen : false,
        openReplyId: activeTabId === tabId ? openReplyId : null,
      });
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
      const { activeDraftId, inlineDrafts } = get();
      const activeDraft = activeDraftId ? inlineDrafts[activeDraftId] : null;

      if (!open) {
        const { editor } = getExtDeps(get);

        // Only drawer-owned drafts should be dismissed here. Desktop new
        // comments stay alive because they belong to the floating comments,
        // not the drawer.
        // Unanchored drawer drafts never created a draft mark in the editor,
        // so only anchored drafts should try to unset one here.
        if (
          editor &&
          activeDraft?.location === 'drawer' &&
          activeDraft.selectedText
        ) {
          editor.commands.unsetDraftComment(activeDraft.draftId);
        }
        if (editor && editor.isActive('highlight')) {
          editor.chain().unsetHighlight().run();
        }

        set((state) => ({
          isCommentOpen: open,
          activeDraftId:
            activeDraft?.location === 'drawer' ? null : state.activeDraftId,
          inlineDrafts:
            activeDraft?.location === 'drawer'
              ? removeInlineDraft(state.inlineDrafts, activeDraft.draftId)
              : state.inlineDrafts,
        }));
        return;
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
    setFloatingCards: (nextFloatingCards) =>
      set((state) => ({
        floatingCards: resolveFloatingCardsUpdater(
          state.floatingCards,
          nextFloatingCards,
        ),
      })),
    clearFloatingCards: () => set({ floatingCards: [] }),
    setActiveDraftId: (draftId) => set({ activeDraftId: draftId }),
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
      const { activeCommentId, openReplyId, reply } = get();
      const { onCommentReply } = getExtDeps(get);
      const targetCommentId = openReplyId || activeCommentId;

      if (!targetCommentId || !reply.trim()) {
        return;
      }

      get().handleAddReply(targetCommentId, reply, onCommentReply ?? undefined);
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
      const { onNewComment, setActiveCommentId } = getExtDeps(get);
      const { username, activeTabId } = get();

      // Keep this path unanchored. Inline comments must go through the shared
      // draft flow so submission never depends on whatever selection exists later.
      const newComment: IComment = {
        id: `comment-${uuid()}`,
        tabId: activeTabId,
        username: usernameProp || username!,
        selectedContent: '',
        content: content || '',
        replies: [],
        createdAt: new Date(),
      };

      setActiveCommentId(newComment.id || '');
      onNewComment?.(newComment);
      return newComment.id;
    },
    // Store floatingCards here so the floating comments can reopen, focus, and
    // submit drafts without re-deriving floating state from editor DOM on every frame.
    createFloatingDraft: (options) => {
      const { editor, onInlineComment } = getExtDeps(get);
      const {
        isDesktopFloatingEnabled,
        activeDraftId,
        inlineDrafts,
        setCommentDrawerOpen,
      } = get();
      const draftLocation =
        options?.location ?? (isDesktopFloatingEnabled ? 'floating' : 'drawer');
      const allowEmptySelection =
        draftLocation === 'drawer' && Boolean(options?.allowEmptySelection);

      if (!editor) {
        if (!allowEmptySelection) {
          return null;
        }

        // Preserve the drawer's top-level comment affordance even when the editor
        // is unavailable. This branch must stay unanchored: selectedText remains
        // empty so submit does not attempt to create anchor metadata later.
        const draftId = `draft-${uuid()}`;
        const existingDrawerDraftId =
          activeDraftId && inlineDrafts[activeDraftId]?.location === 'drawer'
            ? activeDraftId
            : null;

        set((state) => ({
          selectedText: '',
          isBubbleMenuSuppressed: true,
          activeDraftId: draftId,
          isCommentOpen: true,
          inlineDrafts: upsertInlineDraft(
            existingDrawerDraftId
              ? removeInlineDraft(state.inlineDrafts, existingDrawerDraftId)
              : state.inlineDrafts,
            {
              draftId,
              selectedText: '',
              text: '',
              location: 'drawer',
              isAuthPending: false,
            },
          ),
        }));

        onInlineComment?.();
        return draftId;
      }

      const { state } = editor;
      const { from, to } = state.selection;
      const text = state.doc.textBetween(from, to, ' ');
      const hasSelectionAnchor = from < to && Boolean(text.trim());

      // Keep the selection requirement for anchored inline comments. The drawer
      // button is the only path allowed to create an unanchored draft.
      if (!hasSelectionAnchor && !allowEmptySelection) {
        return null;
      }

      const draftId = `draft-${uuid()}`;

      if (hasSelectionAnchor) {
        // Capture the anchor immediately when the new comment opens. Submission should
        // resolve against this tracked draft range, never against live selection.
        const didCreateDraft = editor.commands.setDraftComment(draftId);

        if (!didCreateDraft) {
          return null;
        }
      }

      const existingDrawerDraftId =
        draftLocation === 'drawer' &&
        activeDraftId &&
        inlineDrafts[activeDraftId]?.location === 'drawer'
          ? activeDraftId
          : null;

      if (existingDrawerDraftId && existingDrawerDraftId !== draftId) {
        // Mobile keeps only one active inline draft so the drawer stays the
        // single source of truth for where the new comment opens.
        if (inlineDrafts[existingDrawerDraftId]?.selectedText) {
          editor.commands.unsetDraftComment(existingDrawerDraftId);
        }
      }

      if (draftLocation === 'floating') {
        setCommentDrawerOpen?.(false);
      }

      set((state) => ({
        selectedText: hasSelectionAnchor ? text : '',
        isBubbleMenuSuppressed: true,
        activeDraftId:
          draftLocation === 'drawer' ? draftId : state.activeDraftId,
        isCommentOpen: draftLocation === 'drawer' ? true : state.isCommentOpen,
        inlineDrafts: upsertInlineDraft(
          existingDrawerDraftId
            ? removeInlineDraft(state.inlineDrafts, existingDrawerDraftId)
            : state.inlineDrafts,
          {
            draftId,
            selectedText: hasSelectionAnchor ? text : '',
            text: '',
            location: draftLocation,
            isAuthPending: false,
          },
        ),
        floatingCards:
          draftLocation === 'floating'
            ? [
                ...state.floatingCards.map((floatingCard) => ({
                  ...floatingCard,
                  isFocused: false,
                })),
                {
                  floatingCardId: `draft:${draftId}`,
                  type: 'draft',
                  draftId,
                  selectedText: text,
                  isFocused: true,
                } satisfies CommentFloatingDraftCard,
              ]
            : state.floatingCards,
      }));

      onInlineComment?.();
      return draftId;
    },
    updateInlineDraftText: (draftId, value) => {
      set((state) => {
        const draft = state.inlineDrafts[draftId];

        if (!draft) {
          return state;
        }

        return {
          inlineDrafts: upsertInlineDraft(state.inlineDrafts, {
            ...draft,
            text: value,
            isAuthPending: false,
          }),
        };
      });
    },
    cancelInlineDraft: (draftId) => {
      const draftFloatingCard = get().floatingCards.find(
        (floatingCard): floatingCard is CommentFloatingDraftCard =>
          floatingCard.type === 'draft' && floatingCard.draftId === draftId,
      );

      if (draftFloatingCard) {
        get().closeFloatingCard(draftFloatingCard.floatingCardId);
        return;
      }

      const { editor } = getExtDeps(get);
      const { inlineDrafts } = get();
      const draft = inlineDrafts[draftId];

      if (!draft) {
        return;
      }

      if (editor && draft.selectedText) {
        editor.commands.unsetDraftComment(draftId);
      }

      set((state) => ({
        activeDraftId:
          state.activeDraftId === draftId ? null : state.activeDraftId,
        isCommentOpen:
          state.activeDraftId === draftId && draft.location === 'drawer'
            ? false
            : state.isCommentOpen,
        inlineDrafts: removeInlineDraft(state.inlineDrafts, draftId),
      }));
    },
    submitInlineDraft: (draftId) => {
      const {
        activeTabId,
        isConnected,
        inlineDrafts,
        setCommentDrawerOpen,
        username,
      } = get();
      const {
        editor,
        focusCommentWithActiveId,
        onNewComment,
        setActiveCommentId,
        commentAnchorsRef,
      } = getExtDeps(get);
      const draft = inlineDrafts[draftId];

      if (!draft) {
        return;
      }

      const draftText = draft.text.trim();

      if (!draftText) {
        return;
      }

      if (!isConnected || !username) {
        set((state) => ({
          activeDraftId:
            draft.location === 'drawer' ? draftId : state.activeDraftId,
          isCommentOpen:
            draft.location === 'drawer' ? true : state.isCommentOpen,
          inlineDrafts: upsertInlineDraft(state.inlineDrafts, {
            ...draft,
            isAuthPending: true,
          }),
          floatingCards: state.floatingCards.map((floatingCard) =>
            floatingCard.type === 'draft'
              ? {
                  ...floatingCard,
                  isFocused: floatingCard.draftId === draftId,
                }
              : {
                  ...floatingCard,
                  isFocused: false,
                },
          ),
        }));
        setCommentDrawerOpen?.(true);
        return;
      }

      if (!editor && draft.selectedText) {
        return;
      }

      // Submission resolves from the stored draft anchor. That keeps mobile
      // and desktop consistent even if editor selection moved after the new
      // comment opened.
      // When selectedText is empty, this draft came from the drawer's unanchored
      // new-comment action and should persist as a plain tab-level comment.
      const newComment: IComment = {
        id: `comment-${uuid()}`,
        tabId: activeTabId,
        username,
        selectedContent: draft.selectedText,
        content: draftText,
        replies: [],
        createdAt: new Date(),
      };

      const draftRange = editor
        ? getDraftCommentRange(editor.state, draftId)
        : null;

      if (draft.selectedText && !draftRange) {
        // If the tracked anchor was deleted, fail closed instead of attaching
        // this comment to a new or stale selection.
        set((state) => ({
          inlineDrafts: upsertInlineDraft(state.inlineDrafts, {
            ...draft,
            isAuthPending: false,
          }),
        }));
        return;
      }

      let createdAnchor: {
        anchorFrom: Y.RelativePosition;
        anchorTo: Y.RelativePosition;
      } | null = null;

      if (editor && draftRange && commentAnchorsRef) {
        const anchor = createCommentAnchorFromEditor(
          editor,
          draftRange.from,
          draftRange.to,
        );
        if (anchor) {
          createdAnchor = anchor;
          commentAnchorsRef.current = [
            ...commentAnchorsRef.current,
            {
              id: newComment.id!,
              anchorFrom: anchor.anchorFrom,
              anchorTo: anchor.anchorTo,
              resolved: false,
              deleted: false,
            },
          ];
        }
      }

      if (editor && draft.selectedText) {
        editor.commands.unsetDraftComment(draftId);
        triggerDecorationRebuild(editor);
      }

      get().setActiveCommentId(newComment.id || '');
      setActiveCommentId(newComment.id || '');
      if (editor) {
        setTimeout(() => focusCommentWithActiveId(newComment.id || ''), 0);
      }

      const meta: CommentMutationMeta | undefined = createdAnchor
        ? {
            type: 'create',
            anchorFrom: fromUint8Array(
              Y.encodeRelativePosition(createdAnchor.anchorFrom),
            ),
            anchorTo: fromUint8Array(
              Y.encodeRelativePosition(createdAnchor.anchorTo),
            ),
          }
        : undefined;
      onNewComment?.(newComment, meta);

      set((state) => {
        const nextFloatingCards = state.floatingCards.filter(
          (floatingCard) =>
            floatingCard.type !== 'thread' ||
            floatingCard.commentId !== newComment.id,
        );
        const draftFloatingCard = nextFloatingCards.find(
          (floatingCard): floatingCard is CommentFloatingDraftCard =>
            floatingCard.type === 'draft' && floatingCard.draftId === draftId,
        );
        const replacementThreadCard = draftFloatingCard
          ? {
              floatingCardId: draftFloatingCard.floatingCardId,
              type: 'thread' as const,
              commentId: newComment.id || '',
              selectedText: draft.selectedText,
              isFocused: true,
            }
          : null;
        const replacementIndex = nextFloatingCards.findIndex(
          (floatingCard) =>
            floatingCard.type === 'draft' && floatingCard.draftId === draftId,
        );

        return {
          activeDraftId:
            state.activeDraftId === draftId ? null : state.activeDraftId,
          isCommentOpen:
            state.activeDraftId === draftId && draft.location === 'drawer'
              ? false
              : state.isCommentOpen,
          inlineDrafts: removeInlineDraft(state.inlineDrafts, draftId),
          // Replace the draft card in place so the floating comments keep the same visual
          // identity instead of closing and reopening as a separate thread card.
          floatingCards:
            replacementThreadCard && replacementIndex >= 0
              ? nextFloatingCards.map((floatingCard) =>
                  floatingCard.type === 'draft' &&
                  floatingCard.draftId === draftId
                    ? replacementThreadCard
                    : {
                        ...floatingCard,
                        isFocused: false,
                      },
                )
              : replacementThreadCard
                ? [
                    ...nextFloatingCards.map((floatingCard) => ({
                      ...floatingCard,
                      isFocused: false,
                    })),
                    replacementThreadCard,
                  ]
                : nextFloatingCards,
        };
      });
    },
    updateFloatingDraftText: (draftId, value) => {
      get().updateInlineDraftText(draftId, value);
    },
    cancelFloatingDraft: (draftId) => {
      get().cancelInlineDraft(draftId);
    },
    submitFloatingDraft: (draftId) => {
      get().submitInlineDraft(draftId);
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
        floatingCards: upsertFloatingThreadCard(state.floatingCards, {
          commentId,
          selectedText: commentToOpen.selectedContent || '',
        }),
      }));
      setActiveCommentId(commentId);
      editor.commands.setCommentActive(commentId);
    },
    closeFloatingCard: (floatingCardId) => {
      const { editor, setActiveCommentId } = getExtDeps(get);
      const { activeCommentId, floatingCards } = get();
      const floatingCardToClose = floatingCards.find(
        (floatingCard) => floatingCard.floatingCardId === floatingCardId,
      );

      if (!floatingCardToClose) {
        return;
      }

      if (floatingCardToClose.type === 'draft') {
        editor?.commands.unsetDraftComment(floatingCardToClose.draftId);
      } else if (editor && activeCommentId === floatingCardToClose.commentId) {
        setActiveCommentId(null);
        editor.commands.unsetCommentActive();
      }

      set((state) => ({
        activeDraftId:
          floatingCardToClose.type === 'draft' &&
          state.activeDraftId === floatingCardToClose.draftId
            ? null
            : state.activeDraftId,
        inlineDrafts:
          floatingCardToClose.type === 'draft'
            ? removeInlineDraft(state.inlineDrafts, floatingCardToClose.draftId)
            : state.inlineDrafts,
        floatingCards: state.floatingCards.filter(
          (floatingCard) => floatingCard.floatingCardId !== floatingCardId,
        ),
      }));
    },
    blurFloatingCard: (floatingCardId) => {
      const { editor } = getExtDeps(get);
      const { activeCommentId, floatingCards } = get();
      const floatingCardToBlur = floatingCards.find(
        (floatingCard) => floatingCard.floatingCardId === floatingCardId,
      );

      if (!editor || !floatingCardToBlur) {
        return;
      }

      if (
        floatingCardToBlur.type === 'thread' &&
        activeCommentId === floatingCardToBlur.commentId
      ) {
        // Use store action directly — NOT the external dep.
        // External dep would queue a React state update that round-trips
        // back via useEffect, overwriting whatever updateEditorState sets
        // when the user clicks on a different comment.
        get().setActiveCommentId(null);
        editor.commands.unsetCommentActive();
      }

      set((state) => ({
        floatingCards: state.floatingCards.map((floatingCard) => ({
          ...floatingCard,
          isFocused: false,
        })),
      }));
    },
    focusFloatingCard: (floatingCardId) => {
      const { editor, setActiveCommentId } = getExtDeps(get);
      const focusedFloatingCard = get().floatingCards.find(
        (floatingCard) => floatingCard.floatingCardId === floatingCardId,
      );

      if (!editor || !focusedFloatingCard) {
        return;
      }

      set((state) => ({
        floatingCards: setFocusedFloatingCard(
          state.floatingCards,
          floatingCardId,
        ),
      }));

      if (focusedFloatingCard.type === 'thread') {
        setActiveCommentId(focusedFloatingCard.commentId);
        editor.commands.setCommentActive(focusedFloatingCard.commentId);
        return;
      }

      setActiveCommentId(null);
      editor.commands.unsetCommentActive();
    },
    removeInvalidFloatingCards: () => {
      const { editor, setActiveCommentId } = getExtDeps(get);
      const { activeCommentId, floatingCards, tabComments } = get();

      if (!floatingCards.length) {
        return;
      }

      const removedDraftIds = new Set<string>();
      const nextFloatingCards = floatingCards.filter((floatingCard) => {
        if (floatingCard.type === 'draft') {
          const isValid = Boolean(
            editor && getDraftCommentRange(editor.state, floatingCard.draftId),
          );

          if (!isValid) {
            removedDraftIds.add(floatingCard.draftId);
          }

          return isValid;
        }

        const comment = tabComments.find(
          (entry) => entry.id === floatingCard.commentId,
        );
        return Boolean(comment && !comment.deleted && !comment.resolved);
      });

      if (nextFloatingCards.length !== floatingCards.length) {
        const removedActiveThreadCard = floatingCards.find(
          (floatingCard) =>
            floatingCard.type === 'thread' &&
            floatingCard.commentId === activeCommentId &&
            !nextFloatingCards.some(
              (nextFloatingCard) =>
                nextFloatingCard.floatingCardId === floatingCard.floatingCardId,
            ),
        );

        if (removedActiveThreadCard && editor) {
          setActiveCommentId(null);
          editor.commands.unsetCommentActive();
        }

        set((state) => {
          let nextInlineDrafts = state.inlineDrafts;

          removedDraftIds.forEach((draftId) => {
            nextInlineDrafts = removeInlineDraft(nextInlineDrafts, draftId);
          });

          return {
            activeDraftId:
              state.activeDraftId && removedDraftIds.has(state.activeDraftId)
                ? null
                : state.activeDraftId,
            inlineDrafts: nextInlineDrafts,
            floatingCards: nextFloatingCards,
          };
        });
      }
    },
    // Mirror activeCommentId into floatingCards so selection changes restore
    // the matching desktop thread without scanning every floating card.
    syncFloatingThreadCardWithActiveComment: () => {
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
        floatingCards: upsertFloatingThreadCard(state.floatingCards, {
          commentId: activeCommentId,
          selectedText: activeThread.selectedContent || '',
        }),
      }));
    },
    submitPendingFloatingDrafts: () => {
      const { inlineDrafts, isConnected, username } = get();

      if (!isConnected || !username) {
        return;
      }

      // Authentication can complete after the new comment opened. Replay the same draft
      // records instead of reconstructing intent from transient UI state.
      Object.values(inlineDrafts)
        .filter((draft) => draft.isAuthPending && Boolean(draft.text.trim()))
        .forEach((draft) => {
          get().submitInlineDraft(draft.draftId);
        });
    },
    resolveComment: (commentId) => {
      const {
        editor,
        onResolveComment,
        setActiveCommentId,
        commentAnchorsRef,
      } = getExtDeps(get);

      if (!editor) return;

      const isDecoration = commentAnchorsRef?.current.some(
        (a) => a.id === commentId,
      );

      if (isDecoration && commentAnchorsRef) {
        commentAnchorsRef.current = commentAnchorsRef.current.map((a) =>
          a.id === commentId ? { ...a, resolved: true } : a,
        );
        triggerDecorationRebuild(editor);
        onResolveComment?.(commentId);
      } else {
        const mutationMeta = get().createMutationMeta('resolve', () =>
          editor.commands.resolveComment(commentId),
        );
        onResolveComment?.(commentId, mutationMeta);
      }

      set((state) => ({
        floatingCards: state.floatingCards.filter(
          (floatingCard) =>
            !(
              floatingCard.type === 'thread' &&
              floatingCard.commentId === commentId
            ),
        ),
      }));

      if (get().activeCommentId === commentId) {
        setActiveCommentId(null);
      }
    },
    unresolveComment: (commentId) => {
      const { editor, onUnresolveComment, commentAnchorsRef } = getExtDeps(get);

      if (!editor) return;

      const isDecoration = commentAnchorsRef?.current.some(
        (a) => a.id === commentId,
      );

      if (isDecoration && commentAnchorsRef) {
        commentAnchorsRef.current = commentAnchorsRef.current.map((a) =>
          a.id === commentId ? { ...a, resolved: false } : a,
        );
        triggerDecorationRebuild(editor);
        onUnresolveComment?.(commentId);
      } else {
        const mutationMeta = get().createMutationMeta('unresolve', () =>
          editor.commands.unresolveComment(commentId),
        );
        onUnresolveComment?.(commentId, mutationMeta);
      }
    },
    deleteComment: (commentId) => {
      const { editor, onDeleteComment, setActiveCommentId, commentAnchorsRef } =
        getExtDeps(get);

      if (!editor) return;

      const isDecoration = commentAnchorsRef?.current.some(
        (a) => a.id === commentId,
      );

      if (isDecoration && commentAnchorsRef) {
        commentAnchorsRef.current = commentAnchorsRef.current.filter(
          (a) => a.id !== commentId,
        );
        triggerDecorationRebuild(editor);
        onDeleteComment?.(commentId);
      } else {
        const mutationMeta = get().createMutationMeta('delete', () =>
          editor.commands.unsetComment(commentId),
        );
        onDeleteComment?.(commentId, mutationMeta);
      }

      set((state) => ({
        floatingCards: state.floatingCards.filter(
          (floatingCard) =>
            !(
              floatingCard.type === 'thread' &&
              floatingCard.commentId === commentId
            ),
        ),
      }));

      if (get().activeCommentId === commentId) {
        setActiveCommentId(null);
      }
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
