import { useEffect } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { clearMobileCommentDrawerCanvasOffset } from '../../utils/comment-scroll-into-view';

interface UseCommentDrawerLifecycleProps {
  activeSuggestionDraftCard: unknown;
  closeFilterSelects: () => void;
  isBelow1280px: boolean;
  isCommentMobileFocused: boolean;
  isInlineDraftOpen: boolean;
  isOpen: boolean;
  onClose: () => void;
  setIsDiscardCommentOverlayVisible: (visible: boolean) => void;
  setIsDiscardSuggestionOverlayVisible: (visible: boolean) => void;
}

export const useCommentDrawerLifecycle = ({
  activeSuggestionDraftCard,
  closeFilterSelects,
  isBelow1280px,
  isCommentMobileFocused,
  isInlineDraftOpen,
  isOpen,
  onClose,
  setIsDiscardCommentOverlayVisible,
  setIsDiscardSuggestionOverlayVisible,
}: UseCommentDrawerLifecycleProps) => {
  useEscapeKey(() => {
    if (isInlineDraftOpen) {
      setIsDiscardCommentOverlayVisible(true);
      return;
    }

    if (isBelow1280px && activeSuggestionDraftCard) {
      setIsDiscardSuggestionOverlayVisible(true);
      return;
    }

    onClose();
  });

  useEffect(() => {
    if (!isOpen && !isInlineDraftOpen) {
      setIsDiscardCommentOverlayVisible(false);
      closeFilterSelects();
    }
  }, [
    closeFilterSelects,
    isInlineDraftOpen,
    isOpen,
    setIsDiscardCommentOverlayVisible,
  ]);

  useEffect(() => {
    if (!activeSuggestionDraftCard) {
      setIsDiscardSuggestionOverlayVisible(false);
    }
  }, [activeSuggestionDraftCard, setIsDiscardSuggestionOverlayVisible]);

  useEffect(() => {
    // Keep the canvas lift scoped to the one state that actually needs it:
    // a focused mobile thread with the drawer sheet covering the viewport.
    if (
      isBelow1280px &&
      isOpen &&
      isCommentMobileFocused &&
      !isInlineDraftOpen
    ) {
      return () => {
        clearMobileCommentDrawerCanvasOffset();
      };
    }

    clearMobileCommentDrawerCanvasOffset();
    return () => {
      clearMobileCommentDrawerCanvasOffset();
    };
  }, [isBelow1280px, isCommentMobileFocused, isInlineDraftOpen, isOpen]);
};
