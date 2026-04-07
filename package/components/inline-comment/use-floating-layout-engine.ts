import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import { useOnClickOutside } from 'usehooks-ts';
import {
  FLOATING_COMMENT_CARD_GAP,
  FloatingLayoutInvalidationFlag,
  computeFloatingCommentLayout,
  roundFloatingTranslateY,
} from './comment-floating-layout';
import type { CommentFloatingCard } from './context/types';
import {
  FLOATING_VIEWPORT_BUFFER_MULTIPLIER,
  getAnchorIdentity,
  getCachedAnchorRect,
  getEditorRoot,
  getRect,
  isAnchorEntryValid,
} from './floating-comment-layout-utils';
import type { UseAnchorRegistryResult } from './use-anchor-registry';
import type { UseFloatingCardStateResult } from './use-floating-card-state';

interface UseFloatingLayoutEngineProps {
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
  anchorRegistry: UseAnchorRegistryResult;
  floatingCardState: UseFloatingCardStateResult;
}

export interface UseFloatingLayoutEngineResult {
  floatingCardListContainerRef: RefObject<HTMLDivElement>;
  registerCardNode: (
    floatingCardId: string,
    node: HTMLDivElement | null,
  ) => void;
}

export const useFloatingLayoutEngine = ({
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
  anchorRegistry,
  floatingCardState,
}: UseFloatingLayoutEngineProps): UseFloatingLayoutEngineResult => {
  const {
    anchorRegistryRef,
    queueAnchorRefresh,
    queueAnchorRefreshForCards,
    resetAnchorRegistry,
    syncAnchors,
  } = anchorRegistry;
  const {
    clearInvalidationFlagsThroughIndex,
    floatingCardStateRef,
    getFloatingCardLayoutInputs,
    getOrderedFloatingCardIndex,
    getFloatingCardRuntimeState,
    heightMeasurementQueueRef,
    layoutBoundaryRef,
    markFloatingCardInvalidated,
    markRecomputeFromIndex,
    mountedFloatingCardIdsRef,
    orderedFloatingCardIdsRef,
    pruneFloatingCardRuntimeState,
    reconcileFloatingCardOrder,
    resetFloatingCardState,
    syncMountedFloatingCardIds,
    mountedFloatingCardIds,
  } = floatingCardState;
  const floatingCardListContainerRef = useRef<HTMLDivElement>(null);
  const floatingCardsRef = useRef<CommentFloatingCard[]>([]);
  const floatingCardMapRef = useRef<Map<string, CommentFloatingCard>>(
    new Map(),
  );
  const domRegistryRef = useRef({
    cardNodes: new Map<string, HTMLDivElement>(),
    nodeToFloatingCardId: new WeakMap<Element, string>(),
  });
  const focusedFloatingCardRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const lastContainerTopRef = useRef<number | null>(null);
  // Small counters that tell the layout loop what changed since last time.
  const layoutVersionRef = useRef({
    scroll: 0,
    appliedScroll: -1,
    doc: 0,
    appliedDoc: -1,
    containerOffset: 0,
    appliedContainerOffset: -1,
  });
  // Run layout work once per frame even if many things change together.
  const layoutSchedulerRef = useRef({
    rafId: null as number | null,
    cycle: 0,
  });

  floatingCardsRef.current = floatingCards;
  floatingCardMapRef.current = new Map(
    floatingCards.map((floatingCard) => [
      floatingCard.floatingCardId,
      floatingCard,
    ]),
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
          syncMountedFloatingCardIds([]);
        }
        return;
      }

      const currentCycle = ++layoutSchedulerRef.current.cycle;
      const currentDocVersion = layoutVersionRef.current.doc;
      let shouldScheduleFollowUp = false;

      const docVersionChanged =
        layoutVersionRef.current.appliedDoc !== currentDocVersion;

      if (docVersionChanged) {
        queueAnchorRefreshForCards(floatingCardsSnapshot);
      }

      layoutVersionRef.current.appliedDoc = currentDocVersion;

      // Main flow:
      // 1. refresh anchors
      // 2. decide which cards are near view
      // 3. measure visible cards
      // 4. compute stacked positions
      // 5. write styles to the DOM
      const {
        activeFloatingCards,
        activeFloatingCardMap,
        floatingCardIdsToClose,
        shouldScheduleFollowUp: shouldScheduleAnchorFollowUp,
      } = syncAnchors({
        currentCycle,
        currentDocVersion,
        editor,
        editorRoot,
        editorWrapperNode: editorWrapperRef.current,
        floatingCards: floatingCardsSnapshot,
        getFloatingCardRuntimeState,
        markFloatingCardInvalidated,
        markRecomputeFromIndex,
        getOrderedFloatingCardIndex,
      });

      shouldScheduleFollowUp ||= shouldScheduleAnchorFollowUp;

      const { orderedFloatingCardIds, firstChangedIndex } =
        reconcileFloatingCardOrder(activeFloatingCards);

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

      pruneFloatingCardRuntimeState(new Set(activeFloatingCardMap.keys()));

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
        const anchorEntry = anchorRegistryRef.current.get(anchorId);

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

        // Reuse saved anchor position while the card is far away.
        // Read the DOM again when the card is near the viewport or changed.
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

      // Only mount cards inside the viewport buffer. Keeping the DOM smaller is  cheaper than rendering every card while still preserving runtime state.
      const nextMountedFloatingCardIds =
        orderedFloatingCardIdsRef.current.filter((floatingCardId) => {
          const floatingCardRuntimeState =
            floatingCardStateRef.current.get(floatingCardId);
          return Boolean(floatingCardRuntimeState?.isInViewport);
        });
      const { didChange, previousMountedFloatingCardIds } =
        syncMountedFloatingCardIds(nextMountedFloatingCardIds);

      if (didChange) {
        nextMountedFloatingCardIds.forEach((floatingCardId) => {
          if (previousMountedFloatingCardIds.has(floatingCardId)) {
            return;
          }

          heightMeasurementQueueRef.current.add(floatingCardId);
          const mountedIndex = getOrderedFloatingCardIndex(floatingCardId);
          markFloatingCardInvalidated(
            floatingCardId,
            FloatingLayoutInvalidationFlag.Height |
              FloatingLayoutInvalidationFlag.Visibility,
          );
          markRecomputeFromIndex(mountedIndex ?? 0);
          shouldScheduleFollowUp = true;
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
          const floatingCardIndex = getOrderedFloatingCardIndex(floatingCardId);
          markFloatingCardInvalidated(
            floatingCardId,
            FloatingLayoutInvalidationFlag.Height,
          );
          markRecomputeFromIndex(floatingCardIndex ?? 0);
        }
      });
      heightMeasurementQueueRef.current.clear();

      // First calculate positions, then apply them below.
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
      const layoutResult = computeFloatingCommentLayout({
        floatingCards: getFloatingCardLayoutInputs(),
        recomputeStartIndex: recomputeFromIndex,
        lastInvalidatedIndex,
        gap: FLOATING_COMMENT_CARD_GAP,
      });

      orderedFloatingCardIdsRef.current.forEach((floatingCardId) => {
        const floatingCardRuntimeState =
          floatingCardStateRef.current.get(floatingCardId);
        const node = domRegistryRef.current.cardNodes.get(floatingCardId);

        if (!floatingCardRuntimeState || !node) {
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
      });

      clearInvalidationFlagsThroughIndex(layoutResult.stopIndex);
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
    clearInvalidationFlagsThroughIndex,
    closeFloatingCard,
    editor,
    editorWrapperRef,
    floatingCardStateRef,
    getFloatingCardLayoutInputs,
    getOrderedFloatingCardIndex,
    getFloatingCardRuntimeState,
    heightMeasurementQueueRef,
    isDesktopFloatingEnabled,
    isHidden,
    layoutBoundaryRef,
    markFloatingCardInvalidated,
    markRecomputeFromIndex,
    mountedFloatingCardIdsRef,
    orderedFloatingCardIdsRef,
    pruneFloatingCardRuntimeState,
    queueAnchorRefreshForCards,
    reconcileFloatingCardOrder,
    scrollContainerRef,
    syncAnchors,
    syncMountedFloatingCardIds,
    anchorRegistryRef,
  ]);

  const registerCardNode = useCallback(
    (floatingCardId: string, node: HTMLDivElement | null) => {
      const previousNode = domRegistryRef.current.cardNodes.get(floatingCardId);

      if (previousNode) {
        resizeObserverRef.current?.unobserve(previousNode);
        domRegistryRef.current.nodeToFloatingCardId.delete(previousNode);
      }

      if (!node) {
        domRegistryRef.current.cardNodes.delete(floatingCardId);
        if (focusedFloatingCardRef.current === previousNode) {
          focusedFloatingCardRef.current = null;
        }
        return;
      }

      // Every floating card DOM node is registered here so layout can measure it, move it, and react to mount or unmount changes.
      domRegistryRef.current.cardNodes.set(floatingCardId, node);

      if (floatingCardId === focusedFloatingCardId) {
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
          getOrderedFloatingCardIndex(floatingCardId) ?? 0,
        );
      }

      heightMeasurementQueueRef.current.add(floatingCardId);
      resizeObserverRef.current?.observe(node);
      updateLayout();
    },
    [
      focusedFloatingCardId,
      getFloatingCardRuntimeState,
      heightMeasurementQueueRef,
      getOrderedFloatingCardIndex,
      markFloatingCardInvalidated,
      markRecomputeFromIndex,
      updateLayout,
    ],
  );

  useEffect(() => {
    focusedFloatingCardRef.current = focusedFloatingCardId
      ? (domRegistryRef.current.cardNodes.get(focusedFloatingCardId) ?? null)
      : null;
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
    if (isDesktopFloatingEnabled) {
      return;
    }

    const scheduleState = layoutSchedulerRef.current;

    if (scheduleState.rafId !== null) {
      window.cancelAnimationFrame(scheduleState.rafId);
      scheduleState.rafId = null;
    }

    scheduleState.cycle = 0;
    layoutVersionRef.current = {
      scroll: 0,
      appliedScroll: -1,
      doc: 0,
      appliedDoc: -1,
      containerOffset: 0,
      appliedContainerOffset: -1,
    };
    lastContainerTopRef.current = null;
    focusedFloatingCardRef.current = null;
    resetAnchorRegistry();
    resetFloatingCardState();
  }, [isDesktopFloatingEnabled, resetAnchorRegistry, resetFloatingCardState]);

  useEffect(() => {
    if (!isDesktopFloatingEnabled) {
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

    syncMountedFloatingCardIds(nextMountedFloatingCardIds);
    queueAnchorRefreshForCards(floatingCardsRef.current);
    floatingCardsRef.current.forEach((floatingCard) => {
      markFloatingCardInvalidated(
        floatingCard.floatingCardId,
        FloatingLayoutInvalidationFlag.Anchor,
      );
    });
    markRecomputeFromIndex(0);
    updateLayout();
  }, [
    floatingCardIdsKey,
    isDesktopFloatingEnabled,
    markFloatingCardInvalidated,
    markRecomputeFromIndex,
    mountedFloatingCardIdsRef,
    queueAnchorRefreshForCards,
    syncMountedFloatingCardIds,
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

    // Content edits refresh all anchors.
    // Smaller editor changes only recheck cards that are already on screen.
    const handleTransaction = ({
      transaction,
    }: {
      transaction: { docChanged?: boolean };
    }) => {
      if (transaction.docChanged) {
        layoutVersionRef.current.doc += 1;
        updateLayout();
        return;
      }

      if (mountedFloatingCardIdsRef.current.length === 0) {
        return;
      }

      const editorRoot = getEditorRoot(editor);

      if (!editorRoot) {
        return;
      }

      let didInvalidateMountedAnchor = false;

      mountedFloatingCardIdsRef.current.forEach((floatingCardId) => {
        const floatingCard = floatingCardMapRef.current.get(floatingCardId);

        if (!floatingCard) {
          return;
        }

        const { anchorId } = getAnchorIdentity(floatingCard);
        const anchorEntry = anchorRegistryRef.current.get(anchorId);

        if (!anchorEntry || !isAnchorEntryValid(anchorEntry, editorRoot)) {
          queueAnchorRefresh(floatingCardId);
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
  }, [
    anchorRegistryRef,
    editor,
    isDesktopFloatingEnabled,
    mountedFloatingCardIdsRef,
    queueAnchorRefresh,
    queueAnchorRefreshForCards,
    updateLayout,
  ]);

  useEffect(() => {
    if (!isDesktopFloatingEnabled) {
      return;
    }

    // Watch card size changes and container size changes.
    // Both can affect where cards need to sit.
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
  }, [
    editorWrapperRef,
    heightMeasurementQueueRef,
    isDesktopFloatingEnabled,
    updateLayout,
  ]);

  useEffect(() => {
    if (!isDesktopFloatingEnabled) {
      return;
    }

    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    // Scrolling happens often, so just mark that something changed and let the
    // layout loop handle the real work on the next frame.
    const onScroll = () => {
      layoutVersionRef.current.scroll += 1;
      updateLayout();
    };

    scrollContainer.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', onScroll);
    };
  }, [isDesktopFloatingEnabled, scrollContainerRef, updateLayout]);

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
    registerCardNode,
  };
};
