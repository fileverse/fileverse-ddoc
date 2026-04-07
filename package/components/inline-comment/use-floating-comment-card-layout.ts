import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Editor } from '@tiptap/react';
import { useOnClickOutside } from 'usehooks-ts';
import { CommentFloatingCard } from './context/types';
import {
  FLOATING_COMMENT_CARD_GAP,
  FloatingCardLayoutInput,
  FloatingLayoutInvalidationFlag,
  computeFloatingCommentLayout,
  roundFloatingTranslateY,
} from './comment-floating-layout';

type AnchorType = 'draft' | 'thread';

/**
 * Cached DOM rect of an anchor.
 * Stored to avoid unnecessary DOM reads (expensive).
 */
interface CachedAnchorRect {
  top: number;
  height: number;
  scrollTop: number;
  containerTop: number;
}

/**
 * Tracks a single anchor in the editor.
 * This is the "source of truth" linking editor → floating card.
 */
interface AnchorRecord {
  floatingCardId: string;
  anchorId: string;
  anchorType: AnchorType;
  elements: HTMLElement[]; // DOM nodes representing anchor
  pmPos: number | null; // ProseMirror position
  anchorVersion: number; // increments when anchor changes
  cachedRect: CachedAnchorRect | null;
  lastSeenEditorRoot: HTMLElement | null;
  // Used to detect disappearing anchors safely (avoid premature deletion)
  // Anchors can temporarily disappear during
  // editor re-renders (e.g. ProseMirror/Yjs updates), so we only close
  // the card if the anchor remains missing across:
  // - multiple layout cycles, or
  // - a document version change (real structural update)
  missingSinceDocVersion: number | null;
  missingSinceCycle: number | null;
}

/**
 * Runtime state per floating card.
 * This is separate from anchor data to avoid mixing concerns.
 */
interface FloatingCardState {
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

interface UseFloatingCommentCardLayoutProps {
  blurFloatingCard: (floatingCardId: string) => void;
  closeFloatingCard: (floatingCardId: string) => void;
  editor: Editor;
  editorWrapperRef: RefObject<HTMLDivElement>;
  floatingCardIdsKey: string;
  floatingCards: CommentFloatingCard[];
  focusedFloatingCardId: string | null;
  isDesktopFloatingEnabled: boolean;
  isHidden: boolean;
  scrollContainerRef: RefObject<HTMLDivElement>;
}

interface UseFloatingCommentCardLayoutResult {
  floatingCardListContainerRef: RefObject<HTMLDivElement>;
  mountedFloatingCardIds: string[];
  registerCardNode: (
    floatingCardId: string,
    node: HTMLDivElement | null,
  ) => void;
}

/**
 * Controls how far outside viewport we still keep cards "active".
 * Prevents pop-in jitter when scrolling.
 */
const FLOATING_VIEWPORT_BUFFER_MULTIPLIER = 1;

const getAnchorIdentity = (floatingCard: CommentFloatingCard) => {
  if (floatingCard.type === 'draft') {
    return {
      anchorId: floatingCard.draftId,
      anchorType: 'draft' as const,
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
  const attribute =
    anchorType === 'draft' ? 'data-draft-comment-id' : 'data-comment-id';

  return `[${attribute}="${escapeSelectorValue(anchorId)}"]`;
};

/**
 * Query all DOM nodes for an anchor
 */
const getAnchorElements = ({
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

/**
 * Get earliest ProseMirror position of anchor nodes
 */
const getAnchorStartPos = (editor: Editor, elements: HTMLElement[]) => {
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

const getEditorRoot = (editor: Editor): HTMLElement | null => {
  try {
    return editor.view.dom as HTMLElement;
  } catch {
    return null;
  }
};

/**
 * Prevent unnecessary reprocessing if DOM nodes are identical
 */
const areAnchorElementsEqual = (
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

/**
 * Anchor validity check:
 * ensures DOM nodes still belong to editor
 */
const isAnchorEntryValid = (entry: AnchorRecord, editorRoot: HTMLElement) => {
  return (
    entry.lastSeenEditorRoot === editorRoot &&
    entry.elements.length > 0 &&
    entry.elements.every(
      (element) => element.isConnected && editorRoot.contains(element),
    )
  );
};

/**
 * Re-use cached rect when scroll/container shifts.
 * Avoids DOM read.
 */
const getCachedAnchorRect = ({
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

/**
 * Get visible DOM rect (first intersecting)
 */
const getRect = ({
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

/**
 * Ordering logic:
 * primary = PM position
 * fallback = previous order (stable)
 */
const compareOrderPosition = (aPos: number | null, bPos: number | null) => {
  if (aPos === bPos) return 0;
  if (aPos === null) return 1;
  if (bPos === null) return -1;
  return aPos - bPos;
};

/**
 * Used to sort cards based on anchor position
 */
const reconcileOrderedFloatingCardIds = ({
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

const areFloatingCardIdListsEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((value, index) => value === b[index]);
};

export const useFloatingCommentCardLayout = ({
  blurFloatingCard,
  closeFloatingCard,
  editor,
  editorWrapperRef,
  floatingCardIdsKey,
  floatingCards,
  focusedFloatingCardId,
  isDesktopFloatingEnabled,
  isHidden,
  scrollContainerRef,
}: UseFloatingCommentCardLayoutProps): UseFloatingCommentCardLayoutResult => {
  const floatingCardListContainerRef = useRef<HTMLDivElement>(null);
  // Anchor tracking
  const anchorRegistryRef = useRef<Map<string, AnchorRecord>>(new Map());
  // card state
  const floatingCardStateRef = useRef<Map<string, FloatingCardState>>(
    new Map(),
  );
  const orderedFloatingCardIdsRef = useRef<string[]>([]);
  const anchorRefreshQueueRef = useRef<Set<string>>(new Set()); // Used to track whose anchor needs to be re-resolved from the editor DOM.
  // Used to track cards whose DOM height needs to be measured.
  // Batched to avoid forced synchronous layout (layout thrashing).
  const heightMeasurementQueueRef = useRef<Set<string>>(new Set());

  // Tracks changes that affect layout but shouldn't trigger full recompute blindly.
  const layoutVersionRef = useRef({
    scroll: 0,
    appliedScroll: -1,
    doc: 0,
    appliedDoc: -1,
    containerOffset: 0,
    appliedContainerOffset: -1,
  });
  // Ensures layout runs at most once per frame and batches updates.
  const layoutSchedulerRef = useRef({
    rafId: null as number | null,
    cycle: 0,
  });

  // Tracks the earliest index where layout must be recomputed.
  // Prevents recalculating the entire list unnecessarily.
  const layoutBoundaryRef = useRef({
    recomputeFromIndex: 0,
  });
  const lastContainerTopRef = useRef<number | null>(null);
  const lastEditorRootRef = useRef<HTMLElement | null>(null);
  const lastWrapperNodeRef = useRef<HTMLDivElement | null>(null);
  const mountedFloatingCardIdsRef = useRef<string[]>([]);
  const floatingCardsRef = useRef<CommentFloatingCard[]>([]);
  // Stores live DOM nodes and mappings for measurement + updates.
  const domRegistryRef = useRef({
    cardNodes: new Map<string, HTMLDivElement>(),
    focusedCard: null as HTMLDivElement | null,
    nodeToFloatingCardId: new WeakMap<Element, string>(),
  });
  const focusedFloatingCardRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [mountedFloatingCardIds, setMountedFloatingCardIds] = useState<
    string[]
  >([]);

  floatingCardsRef.current = floatingCards;

  const getFloatingCardRuntimeState = useCallback((floatingCardId: string) => {
    const existingRuntimeState =
      floatingCardStateRef.current.get(floatingCardId);

    if (existingRuntimeState) {
      return existingRuntimeState;
    }

    const nextRuntimeState: FloatingCardState = {
      floatingCardId,
      anchorPosition: null,
      anchorVersion: -1,
      anchorTop: null,
      anchorHeight: 0,
      height: 0,
      isMeasured: false,
      isInViewport: false,
      translateY: null,
      lastCommittedTranslateY: null,
      lastCommittedVisible: false,
      needsTransformSync: true,
      invalidationFlags: FloatingLayoutInvalidationFlag.Anchor,
    };

    floatingCardStateRef.current.set(floatingCardId, nextRuntimeState);
    return nextRuntimeState;
  }, []);

  const markRecomputeFromIndex = useCallback((recomputeFromIndex: number) => {
    layoutBoundaryRef.current.recomputeFromIndex = Math.min(
      layoutBoundaryRef.current.recomputeFromIndex,
      Math.max(0, recomputeFromIndex),
    );
  }, []);

  const markFloatingCardInvalidated = useCallback(
    (floatingCardId: string, flag: FloatingLayoutInvalidationFlag) => {
      getFloatingCardRuntimeState(floatingCardId).invalidationFlags |= flag;
    },
    [getFloatingCardRuntimeState],
  );

  const updateLayout = useCallback(() => {
    if (layoutSchedulerRef.current.rafId !== null) {
      return;
    }

    layoutSchedulerRef.current.rafId = window.requestAnimationFrame(() => {
      layoutSchedulerRef.current.rafId = null;

      const floatingCardsSnapshot = floatingCardsRef.current;
      const editorRoot = getEditorRoot(editor);
      const scrollContainer = scrollContainerRef.current;
      const floatingCardListContainer = floatingCardListContainerRef.current;

      if (
        !editorRoot ||
        !scrollContainer ||
        !floatingCardListContainer ||
        !floatingCardsSnapshot.length ||
        !isDesktopFloatingEnabled
      ) {
        if (mountedFloatingCardIdsRef.current.length > 0) {
          mountedFloatingCardIdsRef.current = [];
          setMountedFloatingCardIds([]);
        }
        return;
      }

      const currentCycle = ++layoutSchedulerRef.current.cycle;
      const currentDocVersion = layoutVersionRef.current.doc;
      let shouldScheduleFollowUp = false;
      const nextRegistry = new Map(anchorRegistryRef.current);

      const editorRootChanged =
        lastEditorRootRef.current !== editorRoot ||
        lastWrapperNodeRef.current !== editorWrapperRef.current;
      if (editorRootChanged) {
        lastEditorRootRef.current = editorRoot;
        lastWrapperNodeRef.current = editorWrapperRef.current;
        floatingCardsSnapshot.forEach((floatingCard) => {
          anchorRefreshQueueRef.current.add(floatingCard.floatingCardId);
        });
      }

      const docVersionChanged =
        layoutVersionRef.current.appliedDoc !== currentDocVersion;
      if (docVersionChanged) {
        floatingCardsSnapshot.forEach((floatingCard) => {
          anchorRefreshQueueRef.current.add(floatingCard.floatingCardId);
        });
      }
      layoutVersionRef.current.appliedDoc = currentDocVersion;

      const floatingCardIdsNeedingAnchorRefresh = new Set(
        anchorRefreshQueueRef.current,
      );
      const floatingCardIdSet = new Set(
        floatingCardsSnapshot.map(
          (floatingCard) => floatingCard.floatingCardId,
        ),
      );
      Array.from(nextRegistry.entries()).forEach(([anchorId, entry]) => {
        if (!floatingCardIdSet.has(entry.floatingCardId)) {
          nextRegistry.delete(anchorId);
        }
      });

      const floatingCardIdsToClose = new Set<string>();

      floatingCardsSnapshot.forEach((floatingCard) => {
        const floatingCardRuntimeState = getFloatingCardRuntimeState(
          floatingCard.floatingCardId,
        );
        const { anchorId, anchorType } = getAnchorIdentity(floatingCard);
        const previousEntry = nextRegistry.get(anchorId);
        const shouldRefresh =
          floatingCardIdsNeedingAnchorRefresh.has(
            floatingCard.floatingCardId,
          ) || !previousEntry;

        if (!shouldRefresh) {
          floatingCardRuntimeState.anchorPosition =
            previousEntry?.pmPos ?? floatingCardRuntimeState.anchorPosition;
          return;
        }

        const elements = getAnchorElements({
          editorRoot,
          anchorId,
          anchorType,
        });

        if (!elements.length) {
          const missingSinceDocVersion =
            previousEntry?.missingSinceDocVersion ?? currentDocVersion;
          const missingSinceCycle =
            previousEntry?.missingSinceCycle ?? currentCycle;
          const shouldClose =
            previousEntry !== undefined &&
            ((previousEntry.missingSinceCycle !== null &&
              previousEntry.missingSinceCycle < currentCycle) ||
              (previousEntry.missingSinceDocVersion !== null &&
                previousEntry.missingSinceDocVersion < currentDocVersion));

          if (shouldClose) {
            floatingCardIdsToClose.add(floatingCard.floatingCardId);
            nextRegistry.delete(anchorId);
            return;
          }

          nextRegistry.set(anchorId, {
            floatingCardId: floatingCard.floatingCardId,
            anchorId,
            anchorType,
            elements: previousEntry?.elements ?? [],
            pmPos: previousEntry?.pmPos ?? null,
            anchorVersion: previousEntry?.anchorVersion ?? 0,
            cachedRect: previousEntry?.cachedRect ?? null,
            lastSeenEditorRoot: editorRoot,
            missingSinceDocVersion,
            missingSinceCycle,
          });
          shouldScheduleFollowUp = true;
          floatingCardRuntimeState.anchorPosition =
            previousEntry?.pmPos ?? floatingCardRuntimeState.anchorPosition;
          return;
        }

        const pmPos = getAnchorStartPos(editor, elements);
        const didChange =
          !previousEntry ||
          previousEntry.anchorType !== anchorType ||
          previousEntry.pmPos !== pmPos ||
          previousEntry.lastSeenEditorRoot !== editorRoot ||
          !areAnchorElementsEqual(previousEntry.elements, elements);
        const nextEntry: AnchorRecord = {
          floatingCardId: floatingCard.floatingCardId,
          anchorId,
          anchorType,
          elements,
          pmPos,
          anchorVersion: previousEntry
            ? didChange
              ? previousEntry.anchorVersion + 1
              : previousEntry.anchorVersion
            : 0,
          cachedRect:
            previousEntry && !didChange ? previousEntry.cachedRect : null,
          lastSeenEditorRoot: editorRoot,
          missingSinceDocVersion: null,
          missingSinceCycle: null,
        };

        nextRegistry.set(anchorId, nextEntry);
        floatingCardRuntimeState.anchorPosition = pmPos;

        if (
          didChange ||
          floatingCardRuntimeState.anchorVersion !== nextEntry.anchorVersion
        ) {
          const currentIndex = orderedFloatingCardIdsRef.current.indexOf(
            floatingCard.floatingCardId,
          );
          markFloatingCardInvalidated(
            floatingCard.floatingCardId,
            FloatingLayoutInvalidationFlag.Anchor,
          );
          markRecomputeFromIndex(currentIndex >= 0 ? currentIndex : 0);
        }
      });

      anchorRefreshQueueRef.current.clear();

      const activeFloatingCards = floatingCardsSnapshot.filter(
        (floatingCard) =>
          !floatingCardIdsToClose.has(floatingCard.floatingCardId),
      );
      const activeFloatingCardMap = new Map(
        activeFloatingCards.map((floatingCard) => [
          floatingCard.floatingCardId,
          floatingCard,
        ]),
      );
      const activeAnchorIds = new Set(
        activeFloatingCards.map(
          (floatingCard) => getAnchorIdentity(floatingCard).anchorId,
        ),
      );
      Array.from(nextRegistry.keys()).forEach((anchorId) => {
        if (!activeAnchorIds.has(anchorId)) {
          nextRegistry.delete(anchorId);
        }
      });
      anchorRegistryRef.current = nextRegistry;

      const { orderedFloatingCardIds, firstChangedIndex } =
        reconcileOrderedFloatingCardIds({
          previousOrderedFloatingCardIds:
            orderedFloatingCardIdsRef.current.filter(
              (floatingCardId) => !floatingCardIdsToClose.has(floatingCardId),
            ),
          nextFloatingCards: activeFloatingCards,
          getPos: (floatingCardId) =>
            getFloatingCardRuntimeState(floatingCardId).anchorPosition,
        });

      orderedFloatingCardIdsRef.current = orderedFloatingCardIds;

      if (firstChangedIndex !== null) {
        markRecomputeFromIndex(firstChangedIndex);
        const firstChangedFloatingCardId =
          orderedFloatingCardIds[firstChangedIndex];
        if (firstChangedFloatingCardId) {
          markFloatingCardInvalidated(
            firstChangedFloatingCardId,
            FloatingLayoutInvalidationFlag.Anchor,
          );
        }
      }

      Array.from(floatingCardStateRef.current.keys()).forEach(
        (floatingCardId) => {
          if (!activeFloatingCardMap.has(floatingCardId)) {
            floatingCardStateRef.current.delete(floatingCardId);
          }
        },
      );

      const scrollContainerRect = scrollContainer.getBoundingClientRect();
      const floatingCardListContainerRect =
        floatingCardListContainer.getBoundingClientRect();

      if (
        lastContainerTopRef.current === null ||
        Math.abs(
          lastContainerTopRef.current - floatingCardListContainerRect.top,
        ) > 0.5
      ) {
        lastContainerTopRef.current = floatingCardListContainerRect.top;
        layoutVersionRef.current.containerOffset += 1;
      }

      const viewportHeight = scrollContainerRect.height;
      const viewportTop =
        scrollContainerRect.top - floatingCardListContainerRect.top;
      const viewportBottom = viewportTop + viewportHeight;
      const scrollChanged =
        layoutVersionRef.current.appliedScroll !==
        layoutVersionRef.current.scroll;
      const containerOffsetChanged =
        layoutVersionRef.current.appliedContainerOffset !==
        layoutVersionRef.current.containerOffset;

      orderedFloatingCardIdsRef.current.forEach((floatingCardId, index) => {
        const floatingCard = activeFloatingCardMap.get(floatingCardId);
        if (!floatingCard) {
          return;
        }

        const floatingCardRuntimeState =
          getFloatingCardRuntimeState(floatingCardId);
        const { anchorId } = getAnchorIdentity(floatingCard);
        const anchorEntry = nextRegistry.get(anchorId);

        if (!anchorEntry) {
          if (floatingCardRuntimeState.isInViewport) {
            floatingCardRuntimeState.isInViewport = false;
            markFloatingCardInvalidated(
              floatingCardId,
              FloatingLayoutInvalidationFlag.Visibility,
            );
            markRecomputeFromIndex(index);
          }
          floatingCardRuntimeState.anchorTop = null;
          floatingCardRuntimeState.anchorHeight = 0;
          return;
        }

        let projectedRect = anchorEntry.cachedRect
          ? getCachedAnchorRect({
              cachedRect: anchorEntry.cachedRect,
              scrollTop: scrollContainer.scrollTop,
              containerTop: floatingCardListContainerRect.top,
            })
          : null;

        if (projectedRect) {
          floatingCardRuntimeState.anchorTop = projectedRect.top;
          floatingCardRuntimeState.anchorHeight = projectedRect.height;
        }

        const isProjectedInViewportBuffer =
          projectedRect !== null &&
          projectedRect.top >=
            viewportTop -
              viewportHeight * FLOATING_VIEWPORT_BUFFER_MULTIPLIER &&
          projectedRect.top <=
            viewportBottom +
              viewportHeight * FLOATING_VIEWPORT_BUFFER_MULTIPLIER;
        const anchorVersionChanged =
          floatingCardRuntimeState.anchorVersion !== anchorEntry.anchorVersion;
        const shouldReadRect =
          !anchorEntry.cachedRect ||
          floatingCardRuntimeState.isInViewport ||
          isProjectedInViewportBuffer ||
          anchorVersionChanged ||
          !floatingCardRuntimeState.isMeasured ||
          (containerOffsetChanged && isProjectedInViewportBuffer) ||
          (scrollChanged && floatingCardRuntimeState.isInViewport);

        if (shouldReadRect && isAnchorEntryValid(anchorEntry, editorRoot)) {
          const rect = getRect({
            elements: anchorEntry.elements,
            viewportTop: scrollContainerRect.top,
            viewportBottom: scrollContainerRect.bottom,
          });

          if (rect) {
            const nextTop = rect.top - floatingCardListContainerRect.top;
            floatingCardRuntimeState.anchorTop = nextTop;
            floatingCardRuntimeState.anchorHeight = rect.height;
            anchorEntry.cachedRect = {
              top: nextTop,
              height: rect.height,
              scrollTop: scrollContainer.scrollTop,
              containerTop: floatingCardListContainerRect.top,
            };
            projectedRect = { top: nextTop, height: rect.height };
          } else if (projectedRect) {
            floatingCardRuntimeState.anchorTop = projectedRect.top;
            floatingCardRuntimeState.anchorHeight = projectedRect.height;
          }
        }
        floatingCardRuntimeState.anchorVersion = anchorEntry.anchorVersion;

        const nextIsGated =
          floatingCardRuntimeState.anchorTop !== null &&
          floatingCardRuntimeState.anchorTop >=
            viewportTop -
              viewportHeight * FLOATING_VIEWPORT_BUFFER_MULTIPLIER &&
          floatingCardRuntimeState.anchorTop <=
            viewportBottom +
              viewportHeight * FLOATING_VIEWPORT_BUFFER_MULTIPLIER;

        if (floatingCardRuntimeState.isInViewport !== nextIsGated) {
          const wasGated = floatingCardRuntimeState.isInViewport;
          floatingCardRuntimeState.isInViewport = nextIsGated;
          markFloatingCardInvalidated(
            floatingCardId,
            FloatingLayoutInvalidationFlag.Visibility,
          );
          markRecomputeFromIndex(index);
          if (!wasGated && nextIsGated) {
            floatingCardRuntimeState.needsTransformSync = true;
            heightMeasurementQueueRef.current.add(floatingCardId);
            shouldScheduleFollowUp = true;
          }
        }
      });

      layoutVersionRef.current.appliedScroll = layoutVersionRef.current.scroll;
      layoutVersionRef.current.appliedContainerOffset =
        layoutVersionRef.current.containerOffset;

      const nextMountedFloatingCardIds =
        orderedFloatingCardIdsRef.current.filter((floatingCardId) => {
          const floatingCardRuntimeState =
            floatingCardStateRef.current.get(floatingCardId);
          return Boolean(floatingCardRuntimeState?.isInViewport);
        });

      if (
        !areFloatingCardIdListsEqual(
          nextMountedFloatingCardIds,
          mountedFloatingCardIdsRef.current,
        )
      ) {
        const previousMountedFloatingCardIds = new Set(
          mountedFloatingCardIdsRef.current,
        );
        mountedFloatingCardIdsRef.current = nextMountedFloatingCardIds;
        setMountedFloatingCardIds(nextMountedFloatingCardIds);

        nextMountedFloatingCardIds.forEach((floatingCardId) => {
          if (!previousMountedFloatingCardIds.has(floatingCardId)) {
            heightMeasurementQueueRef.current.add(floatingCardId);
            const mountedIndex =
              orderedFloatingCardIdsRef.current.indexOf(floatingCardId);
            markFloatingCardInvalidated(
              floatingCardId,
              FloatingLayoutInvalidationFlag.Height |
                FloatingLayoutInvalidationFlag.Visibility,
            );
            markRecomputeFromIndex(mountedIndex >= 0 ? mountedIndex : 0);
            shouldScheduleFollowUp = true;
          }
        });
      }

      heightMeasurementQueueRef.current.forEach((floatingCardId) => {
        const node = domRegistryRef.current.cardNodes.get(floatingCardId);
        const floatingCardRuntimeState =
          floatingCardStateRef.current.get(floatingCardId);

        if (!node || !floatingCardRuntimeState) {
          return;
        }

        const nextHeight = Math.round(node.offsetHeight);

        if (
          nextHeight > 0 &&
          (!floatingCardRuntimeState.isMeasured ||
            floatingCardRuntimeState.height !== nextHeight)
        ) {
          floatingCardRuntimeState.height = nextHeight;
          floatingCardRuntimeState.isMeasured = true;
          const floatingCardIndex =
            orderedFloatingCardIdsRef.current.indexOf(floatingCardId);
          markFloatingCardInvalidated(
            floatingCardId,
            FloatingLayoutInvalidationFlag.Height,
          );
          markRecomputeFromIndex(
            floatingCardIndex >= 0 ? floatingCardIndex : 0,
          );
        }
      });
      heightMeasurementQueueRef.current.clear();

      const lastInvalidatedIndex = orderedFloatingCardIdsRef.current.reduce(
        (maxIndex, floatingCardId, index) => {
          const floatingCardRuntimeState =
            floatingCardStateRef.current.get(floatingCardId);
          return floatingCardRuntimeState &&
            floatingCardRuntimeState.invalidationFlags !==
              FloatingLayoutInvalidationFlag.None
            ? index
            : maxIndex;
        },
        -1,
      );

      const recomputeFromIndex = Math.min(
        layoutBoundaryRef.current.recomputeFromIndex,
        Math.max(orderedFloatingCardIdsRef.current.length - 1, 0),
      );
      const floatingCardLayoutInputs: FloatingCardLayoutInput[] =
        orderedFloatingCardIdsRef.current.map((floatingCardId) => {
          const floatingCardRuntimeState =
            getFloatingCardRuntimeState(floatingCardId);

          return {
            floatingCardId,
            anchorTop: floatingCardRuntimeState.anchorTop,
            height: floatingCardRuntimeState.height,
            isVisible: floatingCardRuntimeState.isInViewport,
            isMeasured: floatingCardRuntimeState.isMeasured,
            lastCommittedTranslateY:
              floatingCardRuntimeState.lastCommittedTranslateY,
            invalidationFlags: floatingCardRuntimeState.invalidationFlags,
          };
        });
      const layoutResult = computeFloatingCommentLayout({
        floatingCards: floatingCardLayoutInputs,
        recomputeStartIndex: recomputeFromIndex,
        lastInvalidatedIndex,
        gap: FLOATING_COMMENT_CARD_GAP,
      });

      orderedFloatingCardIdsRef.current.forEach((floatingCardId, index) => {
        const floatingCardRuntimeState =
          floatingCardStateRef.current.get(floatingCardId);
        const node = domRegistryRef.current.cardNodes.get(floatingCardId);
        const floatingCard = activeFloatingCardMap.get(floatingCardId);

        if (!floatingCardRuntimeState || !node || !floatingCard) {
          return;
        }

        const placement = layoutResult.placements.get(floatingCardId) ?? {
          translateY: floatingCardRuntimeState.translateY,
          isVisible: floatingCardRuntimeState.lastCommittedVisible,
        };

        if (layoutResult.placements.has(floatingCardId)) {
          floatingCardRuntimeState.translateY = placement.translateY;
        }

        const roundedTranslateY = roundFloatingTranslateY(placement.translateY);
        const shouldWriteTransform =
          (floatingCardRuntimeState.needsTransformSync &&
            roundedTranslateY !== null) ||
          roundedTranslateY !==
            floatingCardRuntimeState.lastCommittedTranslateY;

        if (shouldWriteTransform && roundedTranslateY !== null) {
          node.style.transform = `translateY(${roundedTranslateY}px)`;
          floatingCardRuntimeState.lastCommittedTranslateY = roundedTranslateY;
          floatingCardRuntimeState.needsTransformSync = false;
        }

        const shouldShow =
          Boolean(placement.isVisible) &&
          floatingCardRuntimeState.isMeasured &&
          floatingCardRuntimeState.anchorTop !== null &&
          !isHidden;

        const shouldWriteVisibility =
          shouldShow !== floatingCardRuntimeState.lastCommittedVisible ||
          (floatingCardRuntimeState.invalidationFlags &
            (FloatingLayoutInvalidationFlag.Visibility |
              FloatingLayoutInvalidationFlag.Height)) !==
            0;

        if (shouldWriteVisibility) {
          node.style.visibility = shouldShow ? 'visible' : 'hidden';
          node.style.opacity = shouldShow ? '1' : '0';
          floatingCardRuntimeState.lastCommittedVisible = shouldShow;
        }

        if (index <= layoutResult.stopIndex) {
          floatingCardRuntimeState.invalidationFlags =
            FloatingLayoutInvalidationFlag.None;
        }
      });

      layoutBoundaryRef.current.recomputeFromIndex =
        orderedFloatingCardIdsRef.current.length;

      if (floatingCardIdsToClose.size > 0) {
        floatingCardIdsToClose.forEach((floatingCardId) => {
          closeFloatingCard(floatingCardId);
        });
      }

      if (shouldScheduleFollowUp && activeFloatingCards.length > 0) {
        updateLayout();
      }
    });
  }, [
    closeFloatingCard,
    editor,
    editorWrapperRef,
    getFloatingCardRuntimeState,
    isDesktopFloatingEnabled,
    isHidden,
    markFloatingCardInvalidated,
    markRecomputeFromIndex,
    scrollContainerRef,
  ]);

  const registerCardNode = useCallback(
    (floatingCardId: string, node: HTMLDivElement | null) => {
      const previousNode = domRegistryRef.current.cardNodes.get(floatingCardId);

      if (previousNode && resizeObserverRef.current) {
        resizeObserverRef.current.unobserve(previousNode);
      }

      if (!node) {
        domRegistryRef.current.cardNodes.delete(floatingCardId);
        if (domRegistryRef.current.focusedCard === previousNode) {
          domRegistryRef.current.focusedCard = null;
          focusedFloatingCardRef.current = null;
        }
        return;
      }

      domRegistryRef.current.cardNodes.set(floatingCardId, node);
      if (floatingCardId === focusedFloatingCardId) {
        domRegistryRef.current.focusedCard = node;
        focusedFloatingCardRef.current = node;
      }
      domRegistryRef.current.nodeToFloatingCardId.set(node, floatingCardId);
      if (previousNode !== node) {
        const floatingCardRuntimeState =
          getFloatingCardRuntimeState(floatingCardId);
        floatingCardRuntimeState.needsTransformSync = true;
        markFloatingCardInvalidated(
          floatingCardId,
          FloatingLayoutInvalidationFlag.Height |
            FloatingLayoutInvalidationFlag.Visibility,
        );
        markRecomputeFromIndex(
          Math.max(
            orderedFloatingCardIdsRef.current.indexOf(floatingCardId),
            0,
          ),
        );
      }
      heightMeasurementQueueRef.current.add(floatingCardId);
      resizeObserverRef.current?.observe(node);
      updateLayout();
    },
    [
      focusedFloatingCardId,
      getFloatingCardRuntimeState,
      markFloatingCardInvalidated,
      markRecomputeFromIndex,
      updateLayout,
    ],
  );

  useEffect(() => {
    domRegistryRef.current.focusedCard = focusedFloatingCardId
      ? (domRegistryRef.current.cardNodes.get(focusedFloatingCardId) ?? null)
      : null;
    focusedFloatingCardRef.current = domRegistryRef.current.focusedCard;
  }, [focusedFloatingCardId, mountedFloatingCardIds]);

  useOnClickOutside(
    focusedFloatingCardRef,
    () => {
      if (!isDesktopFloatingEnabled || !focusedFloatingCardId) {
        return;
      }

      blurFloatingCard(focusedFloatingCardId);
    },
    'mousedown',
    { capture: true },
  );

  useEffect(() => {
    if (!isDesktopFloatingEnabled) {
      anchorRegistryRef.current.clear();
      floatingCardStateRef.current.clear();
      orderedFloatingCardIdsRef.current = [];
      anchorRefreshQueueRef.current.clear();
      mountedFloatingCardIdsRef.current = [];
      lastEditorRootRef.current = null;
      lastWrapperNodeRef.current = null;
      setMountedFloatingCardIds([]);
      return;
    }

    const nextFloatingCardIds = new Set(
      floatingCardsRef.current.map(
        (floatingCard) => floatingCard.floatingCardId,
      ),
    );
    const nextMountedFloatingCardIds = mountedFloatingCardIdsRef.current.filter(
      (floatingCardId) => nextFloatingCardIds.has(floatingCardId),
    );

    if (
      !areFloatingCardIdListsEqual(
        nextMountedFloatingCardIds,
        mountedFloatingCardIdsRef.current,
      )
    ) {
      mountedFloatingCardIdsRef.current = nextMountedFloatingCardIds;
      setMountedFloatingCardIds(nextMountedFloatingCardIds);
    }

    floatingCardsRef.current.forEach((floatingCard) => {
      anchorRefreshQueueRef.current.add(floatingCard.floatingCardId);
      markFloatingCardInvalidated(
        floatingCard.floatingCardId,
        FloatingLayoutInvalidationFlag.Anchor,
      );
    });
    markRecomputeFromIndex(0);
    updateLayout();
  }, [
    isDesktopFloatingEnabled,
    markFloatingCardInvalidated,
    markRecomputeFromIndex,
    floatingCardIdsKey,
    updateLayout,
  ]);

  useEffect(() => {
    if (!isDesktopFloatingEnabled || !floatingCardsRef.current.length) {
      return;
    }

    floatingCardsRef.current.forEach((floatingCard) => {
      markFloatingCardInvalidated(
        floatingCard.floatingCardId,
        FloatingLayoutInvalidationFlag.Visibility,
      );
    });
    markRecomputeFromIndex(0);
    updateLayout();
  }, [
    isDesktopFloatingEnabled,
    isHidden,
    markFloatingCardInvalidated,
    markRecomputeFromIndex,
    updateLayout,
  ]);

  useEffect(() => {
    if (!isDesktopFloatingEnabled) {
      return;
    }

    const handleTransaction = ({
      transaction,
    }: {
      transaction: { docChanged?: boolean };
    }) => {
      if (transaction.docChanged) {
        layoutVersionRef.current.doc += 1;
        floatingCardsRef.current.forEach((floatingCard) => {
          anchorRefreshQueueRef.current.add(floatingCard.floatingCardId);
        });
        updateLayout();
        return;
      }

      const editorRoot = getEditorRoot(editor);
      if (!editorRoot) {
        return;
      }

      let didInvalidateMountedAnchor = false;
      mountedFloatingCardIdsRef.current.forEach((floatingCardId) => {
        const floatingCard = floatingCardsRef.current.find(
          (currentFloatingCard) =>
            currentFloatingCard.floatingCardId === floatingCardId,
        );
        if (!floatingCard) {
          return;
        }

        const { anchorId } = getAnchorIdentity(floatingCard);
        const anchorEntry = anchorRegistryRef.current.get(anchorId);
        if (!anchorEntry || !isAnchorEntryValid(anchorEntry, editorRoot)) {
          anchorRefreshQueueRef.current.add(floatingCardId);
          didInvalidateMountedAnchor = true;
        }
      });

      if (didInvalidateMountedAnchor) {
        updateLayout();
      }
    };

    editor.on('transaction', handleTransaction);
    return () => {
      editor.off('transaction', handleTransaction);
    };
  }, [editor, isDesktopFloatingEnabled, updateLayout]);

  useEffect(() => {
    if (!isDesktopFloatingEnabled) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const floatingCardId = domRegistryRef.current.nodeToFloatingCardId.get(
          entry.target,
        );
        if (floatingCardId) {
          heightMeasurementQueueRef.current.add(floatingCardId);
        } else {
          layoutVersionRef.current.containerOffset += 1;
        }
      });

      updateLayout();
    });

    resizeObserverRef.current = resizeObserver;

    if (floatingCardListContainerRef.current) {
      resizeObserver.observe(floatingCardListContainerRef.current);
    }

    if (editorWrapperRef.current) {
      resizeObserver.observe(editorWrapperRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      resizeObserverRef.current = null;
    };
  }, [editorWrapperRef, isDesktopFloatingEnabled, updateLayout]);

  useEffect(() => {
    if (!isDesktopFloatingEnabled) {
      return;
    }

    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    const onScroll = () => {
      layoutVersionRef.current.scroll += 1;
      updateLayout();
    };

    scrollContainer.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', onScroll);
    };
  }, [isDesktopFloatingEnabled, updateLayout, scrollContainerRef]);

  useEffect(() => {
    const scheduleState = layoutSchedulerRef.current;

    return () => {
      if (scheduleState.rafId !== null) {
        window.cancelAnimationFrame(scheduleState.rafId);
        scheduleState.rafId = null;
      }
    };
  }, []);

  return {
    floatingCardListContainerRef,
    mountedFloatingCardIds,
    registerCardNode,
  };
};
