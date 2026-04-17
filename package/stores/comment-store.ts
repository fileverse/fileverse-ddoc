import { Editor } from '@tiptap/react';
import { createContext, useContext } from 'react';
import React from 'react';
import {
  CommentAnchor,
  applyAcceptedSuggestion,
  createCommentAnchorFromEditor,
  resolveCommentAnchorRangeInState,
  triggerDecorationRebuild,
} from '../extensions/comment/comment-decoration-plugin';
import uuid from 'react-uuid';
import { createStore, useStore } from 'zustand';
import { fromUint8Array } from 'js-base64';
import * as Y from 'yjs';
import { TextSelection } from '@tiptap/pm/state';
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
import {
  resolveCommentSelectionRange,
  scrollCommentSelectionRangeIntoView,
} from '../utils/comment-scroll-into-view';

export interface CommentExternalDeps {
  editor: Editor | null;
  ydoc: Y.Doc;
  setActiveCommentId: (id: string | null) => void;
  focusCommentWithActiveId: (id: string) => void;
  setInitialComments?: React.Dispatch<React.SetStateAction<IComment[]>>;
  setUsername?: React.Dispatch<React.SetStateAction<string>>;
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
  refreshCommentAnchorState?: () => void;
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
  tabId?: string;
  // Only the drawer's explicit "new comment" action may bypass text selection.
  // Do not reuse this for floating comments unless unanchored inline threads
  // become a deliberate product requirement.
  allowEmptySelection?: boolean;
};

type CommentEditRequest = {
  requestId: string;
  kind: 'comment' | 'reply';
  commentId: string;
  replyId?: string;
  text: string;
};

type ReplyEditTarget = {
  // Represents an active edit session (used by the drawer reply input).
  // When set, "Send" should edit the target rather than create a new reply.
  kind: 'comment' | 'reply';
  commentId: string;
  replyId?: string;
  // Captures the original text at the time edit mode started.
  // UIs use this to disable "Send" when the user hasn’t changed anything.
  originalText: string;
};

type CommentEditCompletion = {
  // Broadcast-only signal to clear local edit drafts in other mounted UIs.
  // Drawer uses shared store state, but floating/bubble inputs keep local state
  // and must be nudged when an edit is submitted elsewhere.
  nonce: number;
  kind: 'comment' | 'reply';
  commentId: string;
  replyId?: string;
};

type FocusCommentInEditorOptions = {
  source?: 'explicit-ui' | 'passive';
};

type ReconcileFloatingThreadsForActiveTabOptions = {
  hydrationReady: boolean;
};

// Marks editor transactions that came from an explicit thread jump in the UI
// (drawer, sidebar, or similar) rather than passive cursor movement. The
// provider reads this so the clicked thread can take ownership immediately,
// even if the selection update reaches the store before pointer heuristics do.
export const EXPLICIT_COMMENT_FOCUS_META = 'inlineCommentExplicitFocus';

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

const getCommentAnchorSelector = (commentId: string) => {
  const safeCommentId =
    typeof CSS !== 'undefined' && CSS.escape
      ? CSS.escape(commentId)
      : commentId.replace(/"/g, '\\"');

  return `[data-comment-id="${safeCommentId}"]`;
};

const getHydratedThreadDecorationAnchor = ({
  commentId,
  decorationAnchorById,
  commentAnchorsRef,
}: {
  commentId: string;
  decorationAnchorById?: Map<string, CommentAnchor>;
  commentAnchorsRef?: React.MutableRefObject<CommentAnchor[]>;
}) => {
  if (!commentId || !commentAnchorsRef) {
    return null;
  }

  return (
    decorationAnchorById?.get(commentId) ??
    commentAnchorsRef.current.find((anchor) => anchor.id === commentId) ??
    null
  );
};

const hasResolvableCommentAnchor = ({
  anchor,
  editor,
}: {
  anchor: CommentAnchor;
  editor: Editor;
}) => {
  const anchorRange = resolveCommentAnchorRangeInState(anchor, editor.state);

  return Boolean(anchorRange && anchorRange.from < anchorRange.to);
};

const hasValidPendingPrehydrationFloatingThreadAnchor = ({
  commentId,
  decorationAnchorById,
  commentAnchorsRef,
  editor,
}: {
  commentId: string;
  decorationAnchorById?: Map<string, CommentAnchor>;
  commentAnchorsRef?: React.MutableRefObject<CommentAnchor[]>;
  editor: Editor;
}) => {
  if (!commentId || editor.isDestroyed) {
    return false;
  }

  // Pending prehydration threads must prove they still own a live decoration
  // anchor.
  const decorationAnchor = getHydratedThreadDecorationAnchor({
    commentId,
    decorationAnchorById,
    commentAnchorsRef,
  });

  return Boolean(
    decorationAnchor &&
      !decorationAnchor.deleted &&
      !decorationAnchor.resolved &&
      hasResolvableCommentAnchor({ anchor: decorationAnchor, editor }),
  );
};

const hasValidHydratedThreadAnchor = ({
  comment,
  decorationAnchorById,
  commentAnchorsRef,
  editor,
}: {
  comment: IComment;
  decorationAnchorById?: Map<string, CommentAnchor>;
  commentAnchorsRef?: React.MutableRefObject<CommentAnchor[]>;
  editor: Editor;
}) => {
  const commentId = comment.id;

  if (!commentId || !comment.selectedContent || editor.isDestroyed) {
    return false;
  }

  if (commentAnchorsRef) {
    const decorationAnchor = getHydratedThreadDecorationAnchor({
      commentId,
      decorationAnchorById,
      commentAnchorsRef,
    });

    if (decorationAnchor) {
      if (decorationAnchor.deleted || decorationAnchor.resolved) {
        return false;
      }

      return hasResolvableCommentAnchor({
        anchor: decorationAnchor,
        editor,
      });
    }
  }

  return Boolean(
    editor.view?.dom.querySelector(getCommentAnchorSelector(commentId)),
  );
};

const addPendingPrehydrationFloatingThreadId = (
  pendingCommentIds: string[],
  commentId: string | null | undefined,
) => {
  if (!commentId || pendingCommentIds.includes(commentId)) {
    return pendingCommentIds;
  }

  return [...pendingCommentIds, commentId];
};

const removePendingPrehydrationFloatingThreadIds = (
  pendingCommentIds: string[],
  commentIdsToRemove: Iterable<string>,
) => {
  const idsToRemove = new Set<string>();

  for (const commentId of commentIdsToRemove) {
    if (commentId) {
      idsToRemove.add(commentId);
    }
  }

  if (!idsToRemove.size) {
    return pendingCommentIds;
  }

  const nextPendingCommentIds = pendingCommentIds.filter(
    (commentId) => !idsToRemove.has(commentId),
  );

  return nextPendingCommentIds.length === pendingCommentIds.length
    ? pendingCommentIds
    : nextPendingCommentIds;
};

const areFloatingCardsEqual = (
  left: CommentFloatingCard[],
  right: CommentFloatingCard[],
) => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((leftCard, index) => {
    const rightCard = right[index];

    if (
      !rightCard ||
      leftCard.floatingCardId !== rightCard.floatingCardId ||
      leftCard.type !== rightCard.type ||
      leftCard.selectedText !== rightCard.selectedText ||
      leftCard.isFocused !== rightCard.isFocused
    ) {
      return false;
    }

    if (leftCard.type === 'draft') {
      return (
        rightCard.type === 'draft' && leftCard.draftId === rightCard.draftId
      );
    }

    return (
      rightCard.type === 'thread' && leftCard.commentId === rightCard.commentId
    );
  });
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

const findCommentById = (comments: IComment[], commentId: string) =>
  comments.find((comment) => comment.id === commentId) ?? null;

const isFloatingThreadCard = (
  floatingCard: CommentFloatingCard,
): floatingCard is Extract<CommentFloatingCard, { type: 'thread' }> => {
  return floatingCard.type === 'thread';
};

const hasFloatingThreadCard = (
  floatingCards: CommentFloatingCard[],
  commentId: string | null,
) => {
  if (!commentId) {
    return false;
  }

  return floatingCards.some(
    (floatingCard) =>
      isFloatingThreadCard(floatingCard) &&
      floatingCard.commentId === commentId,
  );
};

const getFocusedFloatingThreadCommentId = (
  floatingCards: CommentFloatingCard[],
) => {
  const focusedFloatingThreadCard = floatingCards.find(
    (
      floatingCard,
    ): floatingCard is Extract<CommentFloatingCard, { type: 'thread' }> =>
      isFloatingThreadCard(floatingCard) && floatingCard.isFocused,
  );

  return focusedFloatingThreadCard?.commentId ?? null;
};

const findReplyById = (
  comments: IComment[],
  commentId: string,
  replyId: string,
) => {
  const comment = findCommentById(comments, commentId);
  if (!comment) {
    return null;
  }

  return (comment.replies || []).find((reply) => reply.id === replyId) ?? null;
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
      refreshCommentAnchorState: () => {},
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
  // Tracks just-created floating threads that already have a local anchor but
  // have not been rehydrated into canonical comment props yet.
  pendingPrehydrationFloatingThreadIds: string[];
  inlineDrafts: InlineDraftRecordMap;
  activeDraftId: string | null;
  isDesktopFloatingEnabled: boolean;
  ensCache: EnsCache;
  inProgressFetch: string[];
  editRequest: CommentEditRequest | null;
  replyEditTarget: ReplyEditTarget | null;
  editCompletion: CommentEditCompletion | null;

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
  clearEditRequest: (requestId: string) => void;
  setReplyEditTarget: (target: ReplyEditTarget | null) => void;
  cancelReplyEdit: () => void;

  // --- Handlers ---
  handleInput: (
    e: React.FormEvent<HTMLTextAreaElement>,
    content: string,
  ) => void;
  handleReplyChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleCommentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleCommentKeyDown: (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    tabId?: string,
  ) => void;
  handleReplyKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleReplySubmit: () => void;
  handleCommentSubmit: (tabId?: string) => void;
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
  removeInvalidFloatingDrafts: () => void;
  reconcileFloatingThreadsForActiveTab: (
    options: ReconcileFloatingThreadsForActiveTabOptions,
  ) => void;
  syncFloatingThreadCardWithActiveComment: () => void;
  submitPendingFloatingDrafts: () => void;
  /**
   * Apply anchor edits to local comment state.
   * Called after transaction analysis identifies edited anchors.
   * Updates selectedContent for each affected comment
   * so thread display stays in sync immediately, before consumer rehydration.
   */
  applyCommentAnchorEdits: (
    edits: Array<{ commentId: string; selectedContent: string }>,
  ) => void;
  resolveComment: (commentId: string) => void;
  unresolveComment: (commentId: string) => void;
  // `skipExternalCallback` is for provider-driven auto-deletes, where the provider
  // is responsible for firing `onDeleteComment` and the store should only do local cleanup.
  deleteComment: (
    commentId: string,
    options?: { skipExternalCallback?: boolean },
  ) => void;
  acceptSuggestion: (commentId: string) => void;
  deleteReply: (commentId: string, replyId: string) => void;
  requestEditComment: (commentId: string) => void;
  requestEditReply: (commentId: string, replyId: string) => void;
  editCommentContent: (commentId: string, content: string) => void;
  editReplyContent: (
    commentId: string,
    replyId: string,
    content: string,
  ) => void;
  handleAddReply: (
    activeCommentId: string,
    replyContent: string,
    replyCallback?: (activeCommentId: string, reply: IComment) => void,
  ) => void;
  focusCommentInEditor: (
    commentId: string,
    options?: FocusCommentInEditorOptions,
  ) => void;
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
    pendingPrehydrationFloatingThreadIds: [],
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
    editRequest: null,
    // This is the edit "mode" state for the drawer reply input (shared store).
    // Floating + bubble inputs maintain local text, so they mirror this state
    // when an edit starts and clear on edit completion.
    replyEditTarget: null,
    // One-way event to help local-state inputs reset when an edit finishes.
    editCompletion: null,

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
      const {
        activeTabId,
        activeCommentId,
        openReplyId,
        pendingPrehydrationFloatingThreadIds,
      } = get();
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
      const incomingCommentIds = comments.flatMap((comment) =>
        comment.id ? [comment.id] : [],
      );

      set({
        tabComments,
        activeComments,
        activeComment,
        activeCommentIndex,
        openReplyId: nextOpenReplyId,
        // External comment rehydration is the handoff point. Once the comment
        // arrives through props, stop treating it as a local preserve exception.
        pendingPrehydrationFloatingThreadIds:
          removePendingPrehydrationFloatingThreadIds(
            pendingPrehydrationFloatingThreadIds,
            incomingCommentIds,
          ),
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

      set((state) => ({
        activeTabId: tabId,
        inlineDrafts: activeTabId === tabId ? inlineDrafts : {},
        activeDraftId: activeTabId === tabId ? activeDraftId : null,
        isCommentOpen: activeTabId === tabId ? isCommentOpen : false,
        openReplyId: activeTabId === tabId ? openReplyId : null,
        // The prehydration exception is scoped to the tab that created it.
        pendingPrehydrationFloatingThreadIds:
          activeTabId === tabId
            ? state.pendingPrehydrationFloatingThreadIds
            : [],
      }));
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
    clearEditRequest: (requestId) =>
      set((state) =>
        // Consume editRequest only once. Multiple UIs might be mounted, but
        // we want the first eligible input to claim the edit prefill.
        state.editRequest?.requestId === requestId ? { editRequest: null } : {},
      ),
    setReplyEditTarget: (target) => set({ replyEditTarget: target }),
    cancelReplyEdit: () => set({ replyEditTarget: null }),

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
    handleCommentKeyDown: (e, tabId) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        get().handleCommentSubmit(tabId);
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
      const targetCommentId = openReplyId || activeCommentId;

      if (!targetCommentId || !reply.trim()) {
        return;
      }

      const { replyEditTarget } = get();

      if (replyEditTarget) {
        if (replyEditTarget.kind === 'comment') {
          get().editCommentContent(replyEditTarget.commentId, reply);
        } else if (replyEditTarget.replyId) {
          get().editReplyContent(
            replyEditTarget.commentId,
            replyEditTarget.replyId,
            reply,
          );
        }

        set({ reply: '', replyEditTarget: null });
        return;
      }

      const { onCommentReply } = getExtDeps(get);
      get().handleAddReply(targetCommentId, reply, onCommentReply ?? undefined);
      set({ reply: '' });
    },
    handleCommentSubmit: (tabId) => {
      const { comment, username, activeTabId, onComment } = get();
      const { onNewComment, setActiveCommentId } = getExtDeps(get);
      const targetTabId = tabId ?? activeTabId;

      if (!comment.trim() || !username) {
        return;
      }

      const newComment: IComment = {
        id: `comment-${uuid()}`,
        tabId: targetTabId,
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
        activeTabId,
        inlineDrafts,
        setCommentDrawerOpen,
      } = get();
      const draftLocation =
        options?.location ?? (isDesktopFloatingEnabled ? 'floating' : 'drawer');
      const draftTabId = options?.tabId ?? activeTabId;
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
              tabId: draftTabId,
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
      const hasSelectionAnchor =
        !allowEmptySelection && from < to && Boolean(text.trim());

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
            tabId: draftTabId,
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
        refreshCommentAnchorState,
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
        tabId: draft.tabId ?? activeTabId,
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
        refreshCommentAnchorState?.();
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
        const nextResolvedFloatingCards =
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
              : nextFloatingCards;

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
          floatingCards: nextResolvedFloatingCards,
          // Mark this thread as locally created so reconcile can preserve it
          // only until consumer-owned comments catch up.
          pendingPrehydrationFloatingThreadIds: replacementThreadCard
            ? addPendingPrehydrationFloatingThreadId(
                state.pendingPrehydrationFloatingThreadIds,
                newComment.id,
              )
            : state.pendingPrehydrationFloatingThreadIds,
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
      const state = get();
      const commentToOpen = state.tabComments.find(
        (comment) =>
          comment.id === commentId && !comment.deleted && !comment.resolved,
      );

      if (!editor || !commentToOpen?.selectedContent) {
        return;
      }

      const nextFloatingCards = upsertFloatingThreadCard(state.floatingCards, {
        commentId,
        selectedText: commentToOpen.selectedContent || '',
      });

      set({
        floatingCards: nextFloatingCards,
      });
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
      } else if (
        floatingCardToClose.type === 'thread' &&
        editor &&
        activeCommentId === floatingCardToClose.commentId
      ) {
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
    removeInvalidFloatingDrafts: () => {
      const { editor } = getExtDeps(get);
      const { floatingCards } = get();

      if (
        !floatingCards.some((floatingCard) => floatingCard.type === 'draft')
      ) {
        return;
      }

      const removedDraftIds = new Set<string>();
      const nextFloatingCards = floatingCards.filter((floatingCard) => {
        if (floatingCard.type !== 'draft') {
          return true;
        }

        const isValid = Boolean(
          editor && getDraftCommentRange(editor.state, floatingCard.draftId),
        );

        if (!isValid) {
          removedDraftIds.add(floatingCard.draftId);
        }

        return isValid;
      });

      if (nextFloatingCards.length === floatingCards.length) {
        return;
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
    },
    reconcileFloatingThreadsForActiveTab: ({ hydrationReady }) => {
      const { editor, commentAnchorsRef, setActiveCommentId } = getExtDeps(get);
      const {
        activeCommentId,
        activeTabId,
        floatingCards,
        isDesktopFloatingEnabled,
        pendingPrehydrationFloatingThreadIds,
        tabComments,
      } = get();
      const validThreadCommentById = new Map<string, IComment>();
      const pendingPrehydrationFloatingThreadIdSet = new Set(
        pendingPrehydrationFloatingThreadIds,
      );
      const pendingPrehydrationThreadIdsToClear = new Set<string>();
      const tabCommentIdSet = new Set(
        tabComments.flatMap((comment) => (comment.id ? [comment.id] : [])),
      );
      const focusedFloatingThreadCard = floatingCards.find(
        (
          floatingCard,
        ): floatingCard is Extract<CommentFloatingCard, { type: 'thread' }> =>
          isFloatingThreadCard(floatingCard) && floatingCard.isFocused,
      );
      const decorationAnchorById =
        hydrationReady &&
        isDesktopFloatingEnabled &&
        editor &&
        !editor.isDestroyed &&
        commentAnchorsRef
          ? new Map(
              commentAnchorsRef.current.map((anchor) => [anchor.id, anchor]),
            )
          : undefined;

      if (
        hydrationReady &&
        isDesktopFloatingEnabled &&
        editor &&
        !editor.isDestroyed
      ) {
        tabComments.forEach((comment) => {
          const commentId = comment.id;

          if (!commentId) {
            return;
          }

          if ((comment.tabId || DEFAULT_TAB_ID) !== activeTabId) {
            return;
          }

          if (comment.deleted || comment.resolved || !comment.selectedContent) {
            return;
          }

          if (
            !hasValidHydratedThreadAnchor({
              comment,
              decorationAnchorById,
              commentAnchorsRef,
              editor,
            })
          ) {
            return;
          }

          validThreadCommentById.set(commentId, comment);
        });

        pendingPrehydrationFloatingThreadIds.forEach((commentId) => {
          // Pending ids expire as soon as they hydrate or lose the unresolved
          // decoration anchor that proves the thread is still valid.
          if (tabCommentIdSet.has(commentId)) {
            pendingPrehydrationThreadIdsToClear.add(commentId);
            return;
          }

          if (
            !hasValidPendingPrehydrationFloatingThreadAnchor({
              commentId,
              decorationAnchorById,
              commentAnchorsRef,
              editor,
            })
          ) {
            pendingPrehydrationThreadIdsToClear.add(commentId);
          }
        });

        // Preserve only just-created floating threads whose canonical comment
        // object has not rehydrated yet. Resolved/deleted threads and any
        // generic focused card fallback must still reconcile away normally.
        if (
          focusedFloatingThreadCard &&
          pendingPrehydrationFloatingThreadIdSet.has(
            focusedFloatingThreadCard.commentId,
          ) &&
          !tabCommentIdSet.has(focusedFloatingThreadCard.commentId) &&
          !pendingPrehydrationThreadIdsToClear.has(
            focusedFloatingThreadCard.commentId,
          ) &&
          !validThreadCommentById.has(focusedFloatingThreadCard.commentId)
        ) {
          validThreadCommentById.set(focusedFloatingThreadCard.commentId, {
            id: focusedFloatingThreadCard.commentId,
            tabId: activeTabId,
            selectedContent: focusedFloatingThreadCard.selectedText,
          });
        }
      }

      const nextPendingPrehydrationFloatingThreadIds =
        removePendingPrehydrationFloatingThreadIds(
          pendingPrehydrationFloatingThreadIds,
          pendingPrehydrationThreadIdsToClear,
        );
      const didPendingPrehydrationIdsChange =
        nextPendingPrehydrationFloatingThreadIds !==
        pendingPrehydrationFloatingThreadIds;

      const focusedThreadCommentId =
        getFocusedFloatingThreadCommentId(floatingCards);
      const nextFocusedThreadCommentId =
        (focusedThreadCommentId &&
        validThreadCommentById.has(focusedThreadCommentId)
          ? focusedThreadCommentId
          : null) ??
        (activeCommentId && validThreadCommentById.has(activeCommentId)
          ? activeCommentId
          : null);
      const didRemoveFocusedThread = Boolean(
        focusedThreadCommentId &&
          !validThreadCommentById.has(focusedThreadCommentId),
      );
      const didRemoveActiveThread = Boolean(
        activeCommentId &&
          hasFloatingThreadCard(floatingCards, activeCommentId) &&
          !validThreadCommentById.has(activeCommentId),
      );
      const includedThreadCommentIds = new Set<string>();
      const nextFloatingCards: CommentFloatingCard[] = [];

      floatingCards.forEach((floatingCard) => {
        if (floatingCard.type === 'draft') {
          nextFloatingCards.push(floatingCard);
          return;
        }

        const comment = validThreadCommentById.get(floatingCard.commentId);

        if (!comment) {
          return;
        }

        includedThreadCommentIds.add(floatingCard.commentId);

        const selectedText = comment.selectedContent || '';
        const isFocused = floatingCard.commentId === nextFocusedThreadCommentId;

        nextFloatingCards.push(
          floatingCard.selectedText === selectedText &&
            floatingCard.isFocused === isFocused
            ? floatingCard
            : {
                ...floatingCard,
                selectedText,
                isFocused,
              },
        );
      });

      validThreadCommentById.forEach((comment, commentId) => {
        if (includedThreadCommentIds.has(commentId)) {
          return;
        }

        nextFloatingCards.push({
          floatingCardId: `thread:${commentId}`,
          type: 'thread',
          commentId,
          selectedText: comment.selectedContent || '',
          isFocused: commentId === nextFocusedThreadCommentId,
        });
      });
      const didFloatingCardsChange = !areFloatingCardsEqual(
        floatingCards,
        nextFloatingCards,
      );

      if (!didFloatingCardsChange && !didPendingPrehydrationIdsChange) {
        return;
      }

      if (
        !nextFocusedThreadCommentId &&
        (didRemoveFocusedThread || didRemoveActiveThread)
      ) {
        // Mirror the cleanup locally and externally in the same branch so a
        // reconciled-away thread cannot leave stale active-comment state behind.
        get().setActiveCommentId(null);
        setActiveCommentId(null);
        editor?.commands.unsetCommentActive();
      }

      set({
        floatingCards: nextFloatingCards,
        pendingPrehydrationFloatingThreadIds:
          nextPendingPrehydrationFloatingThreadIds,
      });
    },
    // keep active-comment syncing narrow so a simple external focus
    // change does not force a full thread-anchor reconcile.
    syncFloatingThreadCardWithActiveComment: () => {
      const { activeCommentId, isDesktopFloatingEnabled, tabComments } = get();
      const { editor, commentAnchorsRef } = getExtDeps(get);

      if (!isDesktopFloatingEnabled || !activeCommentId) {
        return;
      }

      const activeThread = tabComments.find(
        (comment) =>
          comment.id === activeCommentId &&
          !comment.deleted &&
          !comment.resolved,
      );

      if (
        !activeThread?.selectedContent ||
        !editor ||
        !hasValidHydratedThreadAnchor({
          comment: activeThread,
          commentAnchorsRef,
          editor,
        })
      ) {
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
    applyCommentAnchorEdits: (edits) => {
      // Batch-update selected content for edited anchors.
      // This is called after transaction analysis, BEFORE persistence callbacks.
      // Ensures local UI reflects anchor edits immediately, even if persistence is async.
      if (edits.length === 0) {
        return;
      }

      const nextSelectedContentById = new Map(
        edits.map((edit) => [edit.commentId, edit.selectedContent]),
      );
      const nextComments = get().initialComments.map((comment) => {
        const nextSelectedContent = nextSelectedContentById.get(
          comment.id || '',
        );

        if (nextSelectedContent === undefined) {
          return comment;
        }

        return {
          ...comment,
          selectedContent: nextSelectedContent,
        };
      });

      get().setInitialComments(nextComments);

      getExtDeps(get).setInitialComments?.((previousComments) =>
        previousComments.map((comment) => {
          const nextSelectedContent = nextSelectedContentById.get(
            comment.id || '',
          );

          if (nextSelectedContent === undefined) {
            return comment;
          }

          return {
            ...comment,
            selectedContent: nextSelectedContent,
          };
        }),
      );

      set((state) => ({
        floatingCards: state.floatingCards.map((floatingCard) => {
          if (floatingCard.type !== 'thread') {
            return floatingCard;
          }

          const nextSelectedContent = nextSelectedContentById.get(
            floatingCard.commentId,
          );

          if (nextSelectedContent === undefined) {
            return floatingCard;
          }

          return {
            ...floatingCard,
            selectedText: nextSelectedContent,
          };
        }),
      }));
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
        // Local resolves can happen before props rehydrate, so remove the
        // temporary preserve marker immediately.
        pendingPrehydrationFloatingThreadIds:
          removePendingPrehydrationFloatingThreadIds(
            state.pendingPrehydrationFloatingThreadIds,
            [commentId],
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
    deleteComment: (commentId, options) => {
      const {
        editor,
        onDeleteComment,
        setActiveCommentId,
        commentAnchorsRef,
        setInitialComments,
      } = getExtDeps(get);

      if (!editor) return;

      const isDecoration = commentAnchorsRef?.current.some(
        (a) => a.id === commentId,
      );

      if (isDecoration && commentAnchorsRef) {
        const nextComments = get().initialComments.map((comment) =>
          comment.id === commentId ? { ...comment, deleted: true } : comment,
        );
        const mutationMeta = {
          type: 'delete' as const,
        } satisfies CommentMutationMeta;

        get().setInitialComments(nextComments);
        setInitialComments?.((previousComments) =>
          previousComments.map((comment) =>
            comment.id === commentId ? { ...comment, deleted: true } : comment,
          ),
        );

        commentAnchorsRef.current = commentAnchorsRef.current.filter(
          (a) => a.id !== commentId,
        );

        // Fire persistence callback before forcing a decoration rebuild.
        // `triggerDecorationRebuild()` dispatches a transaction; we don't want a
        // nested dispatch to interfere with consumer-side delete persistence.
        if (!options?.skipExternalCallback) {
          onDeleteComment?.(commentId, mutationMeta);
        }
        triggerDecorationRebuild(editor);
      } else {
        const mutationMeta = get().createMutationMeta('delete', () =>
          editor.commands.unsetComment(commentId),
        );
        if (!options?.skipExternalCallback) {
          onDeleteComment?.(commentId, mutationMeta);
        }
      }

      set((state) => ({
        floatingCards: state.floatingCards.filter(
          (floatingCard) =>
            !(
              floatingCard.type === 'thread' &&
              floatingCard.commentId === commentId
            ),
        ),
        // Deletes invalidate the prehydration exception immediately; reconcile
        // must not preserve a thread whose local lifecycle already ended.
        pendingPrehydrationFloatingThreadIds:
          removePendingPrehydrationFloatingThreadIds(
            state.pendingPrehydrationFloatingThreadIds,
            [commentId],
          ),
      }));

      if (get().activeCommentId === commentId) {
        setActiveCommentId(null);
      }
    },
    acceptSuggestion: (commentId) => {
      const { editor, onResolveComment, setActiveCommentId, commentAnchorsRef } =
        getExtDeps(get);

      if (!editor) return;

      const anchor = commentAnchorsRef?.current.find(
        (a) => a.id === commentId && a.isSuggestion,
      );

      if (!anchor || !commentAnchorsRef) return;

      const applied = applyAcceptedSuggestion(editor, anchor);
      if (!applied) return;

      commentAnchorsRef.current = commentAnchorsRef.current.filter(
        (a) => a.id !== commentId,
      );
      triggerDecorationRebuild(editor);

      onResolveComment?.(commentId, {
        type: 'resolve',
        suggestionType: anchor.suggestionType,
        originalContent: anchor.originalContent,
        suggestedContent: anchor.suggestedContent,
      });

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
    requestEditComment: (commentId) => {
      const comment = findCommentById(get().initialComments, commentId);
      if (!comment) {
        return;
      }

      set({
        // Fire-and-forget signal: whichever UI owns the active thread input
        // should prefill its textarea and enter edit mode.
        editRequest: {
          requestId: `edit-${uuid()}`,
          kind: 'comment',
          commentId,
          text: comment.content || '',
        },
      });
    },
    requestEditReply: (commentId, replyId) => {
      const reply = findReplyById(get().initialComments, commentId, replyId);
      if (!reply) {
        return;
      }

      set({
        editRequest: {
          requestId: `edit-${uuid()}`,
          kind: 'reply',
          commentId,
          replyId,
          text: reply.content || '',
        },
      });
    },
    editCommentContent: (commentId, content) => {
      if (!content.trim()) {
        return;
      }

      const { onEditComment, setInitialComments } = getExtDeps(get);
      const currentComments = get().initialComments;
      const existingComment = findCommentById(currentComments, commentId);

      if (!existingComment) {
        return;
      }

      const nextComments = currentComments.map((comment) =>
        comment.id === commentId ? { ...comment, content } : comment,
      );

      const mutationMeta = {
        type: 'edit' as const,
        content,
      } satisfies CommentMutationMeta;

      // Optimistic local update: keep the UI in sync immediately.
      get().setInitialComments(nextComments);
      setInitialComments?.(nextComments);

      // External persistence hook for consumers (e.g. API/DB sync).
      onEditComment?.(commentId, mutationMeta);
      const activeEdit = get().replyEditTarget;
      if (
        activeEdit &&
        activeEdit.kind === 'comment' &&
        activeEdit.commentId === commentId
      ) {
        // If the drawer is currently editing this comment, clear its shared
        // input state so we don't keep "editing mode" active after submit.
        set({ reply: '', replyEditTarget: null });
      }
      set((state) => ({
        // Notify local-state inputs (floating / drawer) to clear their drafts.
        editCompletion: {
          nonce: (state.editCompletion?.nonce ?? 0) + 1,
          kind: 'comment',
          commentId,
        },
      }));
    },
    editReplyContent: (commentId, replyId, content) => {
      if (!content.trim()) {
        return;
      }

      const { onEditReply, setInitialComments } = getExtDeps(get);
      const currentComments = get().initialComments;
      const existingReply = findReplyById(currentComments, commentId, replyId);

      if (!existingReply) {
        return;
      }

      const nextComments = currentComments.map((comment) => {
        if (comment.id !== commentId) {
          return comment;
        }

        return {
          ...comment,
          replies: (comment.replies || []).map((reply) =>
            reply.id === replyId ? { ...reply, content } : reply,
          ),
        };
      });

      const mutationMeta = {
        type: 'edit' as const,
        content,
      } satisfies CommentMutationMeta;

      // Optimistic local update: keep the UI in sync immediately.
      get().setInitialComments(nextComments);
      setInitialComments?.(nextComments);

      // External persistence hook for consumers (e.g. API/DB sync).
      onEditReply?.(commentId, replyId, mutationMeta);
      const activeEdit = get().replyEditTarget;
      if (
        activeEdit &&
        activeEdit.kind === 'reply' &&
        activeEdit.commentId === commentId &&
        activeEdit.replyId === replyId
      ) {
        // Clear drawer shared edit state on successful submit.
        set({ reply: '', replyEditTarget: null });
      }
      set((state) => ({
        // Notify local-state inputs (floating / drawer) to clear their drafts.
        editCompletion: {
          nonce: (state.editCompletion?.nonce ?? 0) + 1,
          kind: 'reply',
          commentId,
          replyId,
        },
      }));
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
    focusCommentInEditor: (commentId, options) => {
      const { editor, setActiveCommentId, commentAnchorsRef } = getExtDeps(get);

      const foundComment = get()
        .getTabComments()
        .find((comment) => comment.id === commentId);

      if (!foundComment) {
        return;
      }

      if (foundComment.selectedContent) {
        if (!editor?.view?.dom) {
          return;
        }

        const selectionRange = resolveCommentSelectionRange({
          editor,
          commentId,
          commentAnchorsRef,
        });

        if (selectionRange) {
          const tr = editor.state.tr.setSelection(
            TextSelection.create(
              editor.state.doc,
              selectionRange.from,
              selectionRange.to,
            ),
          );

          if (options?.source === 'explicit-ui') {
            // Stamp the selection transaction itself so downstream selection
            // listeners can tell this came from an intentional UI thread jump.
            tr.setMeta(EXPLICIT_COMMENT_FOCUS_META, { commentId });
          }

          editor.view.dispatch(tr);
        }

        if (selectionRange) {
          set({ isBubbleMenuSuppressed: true });
          editor.commands.setCommentActive(commentId);
        }

        if (selectionRange) {
          // Keep the nested requestAnimationFrame so the editor selection and
          // active comment styling settle before measuring scroll coordinates.
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              scrollCommentSelectionRangeIntoView({
                editor,
                selectionRange,
              });
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
