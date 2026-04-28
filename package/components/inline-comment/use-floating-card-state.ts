import { useCallback, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import {
  FloatingLayoutInvalidationFlag,
  type FloatingCardLayoutInput,
} from './comment-floating-layout';
import type { CommentFloatingCard } from './context/types';
import {
  areFloatingCardIdListsEqual,
  reconcileOrderedFloatingCardIds,
  toFloatingCardLayoutInput,
  type FloatingCardRuntimeState,
} from './floating-comment-layout-utils';

interface SyncMountedFloatingCardIdsResult {
  didChange: boolean;
  previousMountedFloatingCardIds: Set<string>;
}

export interface UseFloatingCardStateResult {
  floatingCardStateRef: MutableRefObject<Map<string, FloatingCardRuntimeState>>;
  orderedFloatingCardIdsRef: MutableRefObject<string[]>;
  orderDirtyRef: MutableRefObject<boolean>;
  heightMeasurementQueueRef: MutableRefObject<Set<string>>;
  layoutBoundaryRef: MutableRefObject<{ recomputeFromIndex: number }>;
  mountedFloatingCardIdsRef: MutableRefObject<string[]>;
  mountedFloatingCardIds: string[];
  getFloatingCardRuntimeState: (
    floatingCardId: string,
  ) => FloatingCardRuntimeState;
  getOrderedFloatingCardIndex: (floatingCardId: string) => number | null;
  markRecomputeFromIndex: (recomputeFromIndex: number) => void;
  markFloatingCardInvalidated: (
    floatingCardId: string,
    flag: FloatingLayoutInvalidationFlag,
  ) => void;
  markFloatingCardOrderDirty: () => void;
  reconcileFloatingCardOrder: (nextFloatingCards: CommentFloatingCard[]) => {
    orderedFloatingCardIds: string[];
    firstChangedIndex: number | null;
  };
  pruneFloatingCardRuntimeState: (activeFloatingCardIds: Set<string>) => void;
  syncMountedFloatingCardIds: (
    nextMountedFloatingCardIds: string[],
  ) => SyncMountedFloatingCardIdsResult;
  clearInvalidationFlagsThroughIndex: (stopIndex: number) => void;
  getFloatingCardLayoutInputs: () => FloatingCardLayoutInput[];
  resetFloatingCardState: () => void;
}

export const useFloatingCardState = (): UseFloatingCardStateResult => {
  // This hook keeps the runtime memory for floating cards.
  // React state is only used for the final mounted card list.
  const floatingCardStateRef = useRef<Map<string, FloatingCardRuntimeState>>(
    new Map(),
  );
  const orderedFloatingCardIdsRef = useRef<string[]>([]);
  const orderedFloatingCardIndexRef = useRef<Map<string, number>>(new Map());
  const orderDirtyRef = useRef(true);
  const heightMeasurementQueueRef = useRef<Set<string>>(new Set());
  const layoutBoundaryRef = useRef({
    recomputeFromIndex: 0, // When something changes, layout restarts from recomputeFromIndex instead of from the top.
  });
  const mountedFloatingCardIdsRef = useRef<string[]>([]);
  const [mountedFloatingCardIds, setMountedFloatingCardIds] = useState<
    string[]
  >([]);

  const getFloatingCardRuntimeState = useCallback((floatingCardId: string) => {
    const existingRuntimeState =
      floatingCardStateRef.current.get(floatingCardId);

    if (existingRuntimeState) {
      return existingRuntimeState;
    }

    const nextRuntimeState: FloatingCardRuntimeState = {
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

  const getOrderedFloatingCardIndex = useCallback((floatingCardId: string) => {
    return orderedFloatingCardIndexRef.current.get(floatingCardId) ?? null;
  }, []);

  const markRecomputeFromIndex = useCallback((recomputeFromIndex: number) => {
    layoutBoundaryRef.current.recomputeFromIndex = Math.min(
      layoutBoundaryRef.current.recomputeFromIndex,
      Math.max(0, recomputeFromIndex),
    );
  }, []);

  const markFloatingCardInvalidated = useCallback(
    (floatingCardId: string, flag: FloatingLayoutInvalidationFlag) => {
      const runtimeState = getFloatingCardRuntimeState(floatingCardId);
      runtimeState.invalidationFlags |= flag;
    },
    [getFloatingCardRuntimeState],
  );

  const markFloatingCardOrderDirty = useCallback(() => {
    // Ordering only changes when card membership or anchor positions change.
    // Keeping this explicit avoids a full sort on every layout cycle.
    orderDirtyRef.current = true;
  }, []);

  const reconcileFloatingCardOrder = useCallback(
    (nextFloatingCards: CommentFloatingCard[]) => {
      const nextFloatingCardIds = nextFloatingCards.map(
        (floatingCard) => floatingCard.floatingCardId,
      );

      if (
        !orderDirtyRef.current &&
        areFloatingCardIdListsEqual(
          nextFloatingCardIds,
          orderedFloatingCardIdsRef.current,
        )
      ) {
        // Reuse the last known order in the steady state. The layout loop still
        // runs, but order reconciliation drops out of the hot path.
        return {
          orderedFloatingCardIds: orderedFloatingCardIdsRef.current,
          firstChangedIndex: null,
        };
      }

      // If two cards point to the same place, keep their older order stable.
      const nextOrderedFloatingCardIds = reconcileOrderedFloatingCardIds({
        previousOrderedFloatingCardIds: orderedFloatingCardIdsRef.current,
        nextFloatingCards,
        getPos: (floatingCardId) =>
          getFloatingCardRuntimeState(floatingCardId).anchorPosition,
      });

      orderedFloatingCardIdsRef.current =
        nextOrderedFloatingCardIds.orderedFloatingCardIds;
      orderedFloatingCardIndexRef.current = new Map(
        nextOrderedFloatingCardIds.orderedFloatingCardIds.map(
          (floatingCardId, index) => [floatingCardId, index],
        ),
      );
      orderDirtyRef.current = false;

      return nextOrderedFloatingCardIds;
    },
    [getFloatingCardRuntimeState],
  );

  const pruneFloatingCardRuntimeState = useCallback(
    (activeFloatingCardIds: Set<string>) => {
      Array.from(floatingCardStateRef.current.keys()).forEach(
        (floatingCardId) => {
          if (!activeFloatingCardIds.has(floatingCardId)) {
            floatingCardStateRef.current.delete(floatingCardId);
          }
        },
      );
    },
    [],
  );

  const syncMountedFloatingCardIds = useCallback(
    (
      nextMountedFloatingCardIds: string[],
    ): SyncMountedFloatingCardIdsResult => {
      // The layout engine reads from the ref.
      // React renders from state.
      // Keep both in sync here.
      const previousMountedFloatingCardIds = new Set(
        mountedFloatingCardIdsRef.current,
      );

      if (
        areFloatingCardIdListsEqual(
          nextMountedFloatingCardIds,
          mountedFloatingCardIdsRef.current,
        )
      ) {
        return {
          didChange: false,
          previousMountedFloatingCardIds,
        };
      }

      mountedFloatingCardIdsRef.current = nextMountedFloatingCardIds;
      setMountedFloatingCardIds(nextMountedFloatingCardIds);

      return {
        didChange: true,
        previousMountedFloatingCardIds,
      };
    },
    [],
  );

  const clearInvalidationFlagsThroughIndex = useCallback(
    (stopIndex: number) => {
      orderedFloatingCardIdsRef.current.forEach((floatingCardId, index) => {
        if (index > stopIndex) {
          return;
        }

        const floatingCardRuntimeState =
          floatingCardStateRef.current.get(floatingCardId);

        if (floatingCardRuntimeState) {
          floatingCardRuntimeState.invalidationFlags =
            FloatingLayoutInvalidationFlag.None;
        }
      });
    },
    [],
  );

  const getFloatingCardLayoutInputs = useCallback(
    () =>
      orderedFloatingCardIdsRef.current.map((floatingCardId) =>
        toFloatingCardLayoutInput(getFloatingCardRuntimeState(floatingCardId)),
      ),
    [getFloatingCardRuntimeState],
  );

  const resetFloatingCardState = useCallback(() => {
    floatingCardStateRef.current.clear();
    orderedFloatingCardIdsRef.current = [];
    orderedFloatingCardIndexRef.current.clear();
    orderDirtyRef.current = true;
    heightMeasurementQueueRef.current.clear();
    layoutBoundaryRef.current.recomputeFromIndex = 0;
    mountedFloatingCardIdsRef.current = [];
    setMountedFloatingCardIds([]);
  }, []);

  return {
    floatingCardStateRef,
    orderedFloatingCardIdsRef,
    orderDirtyRef,
    heightMeasurementQueueRef,
    layoutBoundaryRef,
    mountedFloatingCardIdsRef,
    mountedFloatingCardIds,
    getFloatingCardRuntimeState,
    getOrderedFloatingCardIndex,
    markRecomputeFromIndex,
    markFloatingCardInvalidated,
    markFloatingCardOrderDirty,
    reconcileFloatingCardOrder,
    pruneFloatingCardRuntimeState,
    syncMountedFloatingCardIds,
    clearInvalidationFlagsThroughIndex,
    getFloatingCardLayoutInputs,
    resetFloatingCardState,
  };
};
