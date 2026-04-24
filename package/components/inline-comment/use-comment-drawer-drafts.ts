import { useCallback, useState } from 'react';
import { useCommentStore } from '../../stores/comment-store';
import type { SuggestionFloatingDraftCard } from './context/types';

interface UseCommentDrawerDraftsProps {
  selectedCommentTabId: string;
  setOpenReplyId: (commentId: string | null) => void;
}

export const useCommentDrawerDrafts = ({
  selectedCommentTabId,
  setOpenReplyId,
}: UseCommentDrawerDraftsProps) => {
  const activeDraftId = useCommentStore((s) => s.activeDraftId);
  const activeDraft = useCommentStore((s) =>
    s.activeDraftId ? (s.inlineDrafts[s.activeDraftId] ?? null) : null,
  );
  const activeSuggestionDraftCard = useCommentStore(
    (s) =>
      s.floatingCards.find(
        (card): card is SuggestionFloatingDraftCard =>
          card.type === 'suggestion-draft' && card.isFocused,
      ) ??
      s.floatingCards.find(
        (card): card is SuggestionFloatingDraftCard =>
          card.type === 'suggestion-draft',
      ) ??
      null,
  );
  const createFloatingDraft = useCommentStore((s) => s.createFloatingDraft);
  const discardDraft = useCommentStore((s) => s.discardDraft);
  const setCommentDrawerOpen = useCommentStore((s) => s.setCommentDrawerOpen);
  const submitDraft = useCommentStore((s) => s.submitDraft);
  const submitInlineDraft = useCommentStore((s) => s.submitInlineDraft);
  const updateInlineDraftText = useCommentStore((s) => s.updateInlineDraftText);
  const [isDiscardCommentOverlayVisible, setIsDiscardCommentOverlayVisible] =
    useState(false);
  const [
    isDiscardSuggestionOverlayVisible,
    setIsDiscardSuggestionOverlayVisible,
  ] = useState(false);

  // Drawer new-comment state is derived from shared draft state so mobile and desktop
  // follow the same draft lifecycle instead of shadowing it with local UI state.
  const isInlineDraftOpen =
    activeDraft !== null &&
    activeDraftId !== null &&
    activeDraft.location === 'drawer' &&
    // Auth-pending drafts intentionally fall back to the non-draft drawer route so
    // mobile can show the auth screen without discarding the tracked draft.
    !activeDraft.isAuthPending;

  const handleCreateComment = useCallback(() => {
    if (!activeDraftId) {
      return;
    }

    // Submit the shared draft record instead of reading live editor selection.
    submitInlineDraft(activeDraftId);
  }, [activeDraftId, submitInlineDraft]);

  const handleSubmitSuggestionDraft = useCallback(() => {
    if (!activeSuggestionDraftCard) {
      return;
    }

    setIsDiscardSuggestionOverlayVisible(false);
    submitDraft(activeSuggestionDraftCard.suggestionId);
    setOpenReplyId(null);
    setCommentDrawerOpen?.(true);
  }, [
    activeSuggestionDraftCard,
    setCommentDrawerOpen,
    setOpenReplyId,
    submitDraft,
  ]);

  const handleDiscardSuggestionDraft = useCallback(() => {
    if (!activeSuggestionDraftCard) {
      return;
    }

    setIsDiscardSuggestionOverlayVisible(false);
    discardDraft(activeSuggestionDraftCard.suggestionId);
  }, [activeSuggestionDraftCard, discardDraft]);

  const handleStartNewMobileComment = useCallback(() => {
    // The mobile drawer supports top-level comments
    // Keep this drawer-scoped so floating inline comments remain
    // anchored to an explicit editor range.
    createFloatingDraft({
      location: 'drawer',
      allowEmptySelection: true,
      tabId: selectedCommentTabId,
    });
  }, [createFloatingDraft, selectedCommentTabId]);

  return {
    activeDraft,
    activeDraftId,
    activeSuggestionDraftCard,
    handleCreateComment,
    handleDiscardSuggestionDraft,
    handleStartNewMobileComment,
    handleSubmitSuggestionDraft,
    isDiscardCommentOverlayVisible,
    isDiscardSuggestionOverlayVisible,
    isInlineDraftOpen,
    setIsDiscardCommentOverlayVisible,
    setIsDiscardSuggestionOverlayVisible,
    updateInlineDraftText,
  };
};
