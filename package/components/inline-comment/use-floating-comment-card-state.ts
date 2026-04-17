import { useMemo } from 'react';
import { CommentFloatingCard } from './context/types';
import { useCommentStore } from '../../stores/comment-store';

interface UseFloatingCommentCardStateResult {
  blurFloatingCard: (floatingCardId: string) => void;
  closeFloatingCard: (floatingCardId: string) => void;
  floatingCardIdsKey: string;
  floatingCardMap: Map<string, CommentFloatingCard>;
  floatingCards: CommentFloatingCard[];
  focusedFloatingCardId: string | null;
  isDesktopFloatingEnabled: boolean;
}

export const useFloatingCommentCardState =
  (): UseFloatingCommentCardStateResult => {
    const blurFloatingCard = useCommentStore((s) => s.blurFloatingCard);
    const closeFloatingCard = useCommentStore((s) => s.closeFloatingCard);
    const floatingCards = useCommentStore((s) => s.floatingCards);
    const isDesktopFloatingEnabled = useCommentStore(
      (s) => s.isDesktopFloatingEnabled,
    );

    /**
     * Map for O(1) access by ID.
     * Used heavily in layout logic → avoids repeated .find calls.
     */
    const floatingCardMap = useMemo(
      () =>
        new Map(
          floatingCards.map((floatingCard) => [
            floatingCard.floatingCardId,
            floatingCard,
          ]),
        ),
      [floatingCards],
    );

    /**
     * String key representing floating card IDs.
     *
     * Why:
     * React deps don’t deep-compare arrays → this gives a stable,
     * comparable value to detect changes in the current card set.
     */
    const floatingCardIdsKey = useMemo(
      () =>
        floatingCards
          .map((floatingCard) => floatingCard.floatingCardId)
          .join('|'),
      [floatingCards],
    );
    const focusedFloatingCardId = useMemo(
      () =>
        floatingCards.find((floatingCard) => floatingCard.isFocused)
          ?.floatingCardId ?? null,
      [floatingCards],
    );

    return {
      blurFloatingCard,
      closeFloatingCard,
      floatingCardIdsKey,
      floatingCardMap,
      floatingCards,
      focusedFloatingCardId,
      isDesktopFloatingEnabled,
    };
  };
