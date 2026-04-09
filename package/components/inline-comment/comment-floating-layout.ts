// Keep this function pure so the comment floating container can run it again safely.
// Only recalculate what changed and stop once the remaining cards stay the same.

export const FLOATING_COMMENT_CARD_GAP = 12;

export const enum FloatingLayoutInvalidationFlag {
  None = 0,
  Anchor = 1 << 0,
  Viewport = 1 << 1,
  Height = 1 << 2,
  Visibility = 1 << 3,
}

export interface FloatingCardLayoutInput {
  floatingCardId: string;
  anchorTop: number | null;
  height: number;
  isVisible: boolean;
  isMeasured: boolean;
  lastCommittedTranslateY: number | null;
  invalidationFlags: FloatingLayoutInvalidationFlag;
}

export interface FloatingLayoutResult {
  placements: Map<
    string,
    {
      translateY: number | null;
      isVisible: boolean;
    }
  >;
  stopIndex: number;
}

// Round before compare, save, and write so tiny pixel shifts do not cause extra work.
export const roundFloatingTranslateY = (translateY: number | null) => {
  return translateY === null ? null : Math.round(translateY);
};

// Start placing cards from the first changed card.
// Stop once a card matches its saved position because the cards after it will match too.
export const computeFloatingCommentLayout = ({
  floatingCards,
  recomputeStartIndex,
  lastInvalidatedIndex,
  gap = FLOATING_COMMENT_CARD_GAP,
}: {
  floatingCards: FloatingCardLayoutInput[];
  recomputeStartIndex: number;
  lastInvalidatedIndex: number;
  gap?: number;
}): FloatingLayoutResult => {
  const placements = new Map<
    string,
    {
      translateY: number | null;
      isVisible: boolean;
    }
  >();
  // Keep the bottom edge of the previous card so the next one stacks under it.
  let previousBottom: number | null = null;

  for (let index = 0; index < floatingCards.length; index += 1) {
    const floatingCard = floatingCards[index];
    const lastCommittedTranslateY =
      floatingCard.lastCommittedTranslateY ?? floatingCard.anchorTop ?? null;
    // If the card cannot be shown, keep its last position but hide it.
    if (
      !floatingCard.isVisible ||
      !floatingCard.isMeasured ||
      floatingCard.anchorTop === null ||
      floatingCard.height <= 0
    ) {
      placements.set(floatingCard.floatingCardId, {
        translateY: lastCommittedTranslateY,
        isVisible: false,
      });
      continue;
    }
    // Before the restart point, keep the saved position.
    if (index < recomputeStartIndex) {
      const settledTranslateY =
        lastCommittedTranslateY ?? floatingCard.anchorTop;

      placements.set(floatingCard.floatingCardId, {
        translateY: settledTranslateY,
        isVisible: true,
      });
      previousBottom = settledTranslateY + floatingCard.height;
      continue;
    }
    // Put the card at its anchor or below the previous card, whichever is lower.
    const translateY = Math.max(
      floatingCard.anchorTop,
      previousBottom === null ? floatingCard.anchorTop : previousBottom + gap,
    );

    placements.set(floatingCard.floatingCardId, {
      translateY,
      isVisible: true,
    });

    const hasOwnInvalidation =
      floatingCard.invalidationFlags !== FloatingLayoutInvalidationFlag.None;
    const placementChanged =
      roundFloatingTranslateY(translateY) !==
      floatingCard.lastCommittedTranslateY;

    previousBottom = translateY + floatingCard.height;

    // Stop once this card already matches its saved position.
    // The container will keep using the saved positions for the cards after it.
    if (
      index >= recomputeStartIndex &&
      index >= lastInvalidatedIndex &&
      !hasOwnInvalidation &&
      !placementChanged
    ) {
      return {
        placements,
        stopIndex: index,
      };
    }
  }

  return {
    placements,
    stopIndex: floatingCards.length - 1,
  };
};
