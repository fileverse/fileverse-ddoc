export const FLOATING_COMMENT_CARD_GAP = 12;

export const enum FloatingLayoutDirtyFlag {
  None = 0,
  Anchor = 1 << 0,
  Viewport = 1 << 1,
  Height = 1 << 2,
  Visibility = 1 << 3,
}

export interface FloatingLayoutItemInput {
  itemId: string;
  anchorTop: number | null;
  height: number;
  isVisible: boolean;
  isMeasured: boolean;
  previousTranslateY: number | null;
  dirtyFlags: FloatingLayoutDirtyFlag;
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

export const computeFloatingCommentLayout = ({
  items,
  dirtyStartIndex,
  gap = FLOATING_COMMENT_CARD_GAP,
}: {
  items: FloatingLayoutItemInput[];
  dirtyStartIndex: number;
  gap?: number;
}): FloatingLayoutResult => {
  const placements = new Map<
    string,
    {
      translateY: number | null;
      isVisible: boolean;
    }
  >();

  let previousBottom: number | null = null;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const previousTranslateY =
      item.previousTranslateY ?? item.anchorTop ?? null;

    if (
      !item.isVisible ||
      !item.isMeasured ||
      item.anchorTop === null ||
      item.height <= 0
    ) {
      placements.set(item.itemId, {
        translateY: previousTranslateY,
        isVisible: false,
      });
      continue;
    }

    if (index < dirtyStartIndex) {
      const settledTranslateY = previousTranslateY ?? item.anchorTop;

      placements.set(item.itemId, {
        translateY: settledTranslateY,
        isVisible: true,
      });
      previousBottom = settledTranslateY + item.height;
      continue;
    }

    const translateY = Math.max(
      item.anchorTop,
      previousBottom === null ? item.anchorTop : previousBottom + gap,
    );

    placements.set(item.itemId, {
      translateY,
      isVisible: true,
    });

    const hasOwnInvalidation = item.dirtyFlags !== FloatingLayoutDirtyFlag.None;
    const previousPlacementChanged = previousTranslateY !== translateY;

    previousBottom = translateY + item.height;

    if (!hasOwnInvalidation && !previousPlacementChanged) {
      for (
        let remainingIndex = index + 1;
        remainingIndex < items.length;
        remainingIndex += 1
      ) {
        const remainingItem = items[remainingIndex];
        placements.set(remainingItem.itemId, {
          translateY:
            remainingItem.previousTranslateY ?? remainingItem.anchorTop,
          isVisible:
            remainingItem.isVisible &&
            remainingItem.isMeasured &&
            remainingItem.anchorTop !== null &&
            remainingItem.height > 0,
        });
      }

      return {
        placements,
        stopIndex: index,
      };
    }
  }

  return {
    placements,
    stopIndex: items.length - 1,
  };
};
