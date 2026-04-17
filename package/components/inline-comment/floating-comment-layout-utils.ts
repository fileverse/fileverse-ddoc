import type { Editor } from '@tiptap/react';
import {
  FloatingLayoutInvalidationFlag,
  type FloatingCardLayoutInput,
} from './comment-floating-layout';
import type { CommentFloatingCard } from './context/types';

export type AnchorType = 'draft' | 'thread' | 'suggestion-draft';

export interface CachedAnchorRect {
  top: number;
  height: number;
  scrollTop: number;
  containerTop: number;
}

export interface AnchorRecord {
  floatingCardId: string;
  anchorId: string;
  anchorType: AnchorType;
  elements: HTMLElement[];
  pmPos: number | null;
  anchorVersion: number;
  cachedRect: CachedAnchorRect | null;
  lastSeenEditorRoot: HTMLElement | null;
  missingSinceDocVersion: number | null;
  missingSinceCycle: number | null;
}

export interface FloatingCardRuntimeState {
  floatingCardId: string;
  anchorPosition: number | null;
  anchorVersion: number;
  anchorTop: number | null;
  anchorHeight: number;
  height: number;
  isMeasured: boolean;
  isInViewport: boolean;
  translateY: number | null;
  lastCommittedTranslateY: number | null;
  lastCommittedVisible: boolean;
  needsTransformSync: boolean;
  invalidationFlags: FloatingLayoutInvalidationFlag;
}

export const FLOATING_VIEWPORT_BUFFER_MULTIPLIER = 1;

export const getAnchorIdentity = (floatingCard: CommentFloatingCard) => {
  if (floatingCard.type === 'draft') {
    return {
      anchorId: floatingCard.draftId,
      anchorType: 'draft' as const,
    };
  }

  if (floatingCard.type === 'suggestion-draft') {
    return {
      anchorId: floatingCard.suggestionId,
      anchorType: 'suggestion-draft' as const,
    };
  }

  return {
    anchorId: floatingCard.commentId,
    anchorType: 'thread' as const,
  };
};

const escapeSelectorValue = (value: string) => {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }

  return value.replace(/"/g, '\\"');
};

const getAnchorSelector = ({
  anchorId,
  anchorType,
}: {
  anchorId: string;
  anchorType: AnchorType;
}) => {
  let attribute = 'data-comment-id';
  if (anchorType === 'draft') attribute = 'data-draft-comment-id';
  if (anchorType === 'suggestion-draft') attribute = 'data-suggestion-id';

  return `[${attribute}="${escapeSelectorValue(anchorId)}"]`;
};

export const getAnchorElements = ({
  editorRoot,
  anchorId,
  anchorType,
}: {
  editorRoot: HTMLElement;
  anchorId: string;
  anchorType: AnchorType;
}) => {
  return Array.from(
    editorRoot.querySelectorAll<HTMLElement>(
      getAnchorSelector({ anchorId, anchorType }),
    ),
  );
};

export const getAnchorStartPos = (editor: Editor, elements: HTMLElement[]) => {
  let minPos: number | null = null;

  elements.forEach((element) => {
    try {
      const pos = editor.view.posAtDOM(element, 0);
      minPos = minPos === null ? pos : Math.min(minPos, pos);
    } catch {
      // Ignore transient DOM nodes that are mid-replacement.
    }
  });

  return minPos;
};

export const getEditorRoot = (editor: Editor): HTMLElement | null => {
  try {
    return editor.view.dom as HTMLElement;
  } catch {
    return null;
  }
};

export const areAnchorElementsEqual = (
  previousElements: HTMLElement[],
  nextElements: HTMLElement[],
) => {
  if (previousElements.length !== nextElements.length) {
    return false;
  }

  return previousElements.every(
    (element, index) => element === nextElements[index],
  );
};

export const isAnchorEntryValid = (
  entry: AnchorRecord,
  editorRoot: HTMLElement,
) => {
  return (
    entry.lastSeenEditorRoot === editorRoot &&
    entry.elements.length > 0 &&
    entry.elements.every(
      (element) => element.isConnected && editorRoot.contains(element),
    )
  );
};

export const getCachedAnchorRect = ({
  cachedRect,
  scrollTop,
  containerTop,
}: {
  cachedRect: CachedAnchorRect;
  scrollTop: number;
  containerTop: number;
}) => {
  return {
    top:
      cachedRect.top -
      (scrollTop - cachedRect.scrollTop) +
      (cachedRect.containerTop - containerTop),
    height: cachedRect.height,
  };
};

export const getRect = ({
  elements,
  viewportTop,
  viewportBottom,
}: {
  elements: HTMLElement[];
  viewportTop: number;
  viewportBottom: number;
}) => {
  const clientRects = elements.flatMap((element) =>
    Array.from(element.getClientRects()),
  );

  if (!clientRects.length) {
    return null;
  }

  const intersectingRect = clientRects.find(
    (rect) => rect.bottom >= viewportTop && rect.top <= viewportBottom,
  );

  return intersectingRect ?? clientRects[0];
};

const compareOrderPosition = (aPos: number | null, bPos: number | null) => {
  if (aPos === bPos) return 0;
  if (aPos === null) return 1;
  if (bPos === null) return -1;
  return aPos - bPos;
};

export const reconcileOrderedFloatingCardIds = ({
  previousOrderedFloatingCardIds,
  nextFloatingCards,
  getPos,
}: {
  previousOrderedFloatingCardIds: string[];
  nextFloatingCards: CommentFloatingCard[];
  getPos: (floatingCardId: string) => number | null;
}) => {
  const previousIndexById = new Map(
    previousOrderedFloatingCardIds.map((floatingCardId, index) => [
      floatingCardId,
      index,
    ]),
  );
  const orderedFloatingCardIds = nextFloatingCards
    .map((floatingCard) => floatingCard.floatingCardId)
    .sort((a, b) => {
      const positionComparison = compareOrderPosition(getPos(a), getPos(b));

      if (positionComparison !== 0) {
        return positionComparison;
      }

      const previousIndexComparison =
        (previousIndexById.get(a) ?? Number.POSITIVE_INFINITY) -
        (previousIndexById.get(b) ?? Number.POSITIVE_INFINITY);

      if (previousIndexComparison !== 0) {
        return previousIndexComparison;
      }

      return a.localeCompare(b);
    });

  let firstChangedIndex: number | null = null;
  const maxLength = Math.max(
    previousOrderedFloatingCardIds.length,
    orderedFloatingCardIds.length,
  );

  for (let index = 0; index < maxLength; index += 1) {
    if (
      previousOrderedFloatingCardIds[index] !== orderedFloatingCardIds[index]
    ) {
      firstChangedIndex = index;
      break;
    }
  }

  return {
    orderedFloatingCardIds,
    firstChangedIndex,
  };
};

export const areFloatingCardIdListsEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((value, index) => value === b[index]);
};

export const toFloatingCardLayoutInput = (
  floatingCardState: FloatingCardRuntimeState,
): FloatingCardLayoutInput => {
  return {
    floatingCardId: floatingCardState.floatingCardId,
    anchorTop: floatingCardState.anchorTop,
    height: floatingCardState.height,
    isVisible: floatingCardState.isInViewport,
    isMeasured: floatingCardState.isMeasured,
    lastCommittedTranslateY: floatingCardState.lastCommittedTranslateY,
    invalidationFlags: floatingCardState.invalidationFlags,
  };
};
