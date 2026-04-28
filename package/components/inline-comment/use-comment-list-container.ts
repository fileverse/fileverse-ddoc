import { useMemo } from 'react';
import type { RefObject } from 'react';
import { Editor } from '@tiptap/react';
import { CommentFloatingCard } from './context/types';
import { useFloatingCommentCardLayout } from './use-floating-comment-card-layout';
import { useFloatingCommentCardState } from './use-floating-comment-card-state';

export interface UseCommentListContainerProps {
  editor: Editor;
  editorWrapperRef: RefObject<HTMLDivElement>;
  scrollContainerRef: RefObject<HTMLDivElement>;
  isHidden: boolean;
}

export interface UseCommentListContainerResult {
  floatingCardListContainerRef: RefObject<HTMLDivElement>;
  mountedFloatingCards: CommentFloatingCard[];
  registerCardNode: (
    floatingCardId: string,
    node: HTMLDivElement | null,
  ) => void;
  shouldRender: boolean;
}

export const useCommentListContainer = ({
  editor,
  editorWrapperRef,
  scrollContainerRef,
  isHidden,
}: UseCommentListContainerProps): UseCommentListContainerResult => {
  const {
    blurFloatingCard,
    closeFloatingCard,
    floatingCardIdsKey,
    floatingCardMap,
    floatingCards,
    focusedFloatingCardId,
    isDesktopFloatingEnabled,
  } = useFloatingCommentCardState();
  const {
    floatingCardListContainerRef,
    mountedFloatingCardIds,
    registerCardNode,
  } = useFloatingCommentCardLayout({
    blurFloatingCard,
    closeFloatingCard,
    editor,
    editorWrapperRef,
    focusedFloatingCardId,
    isDesktopFloatingEnabled,
    isHidden,
    floatingCardIdsKey,
    floatingCards,
    scrollContainerRef,
  });

  const mountedFloatingCards = useMemo(
    () =>
      mountedFloatingCardIds
        .map((floatingCardId) => floatingCardMap.get(floatingCardId))
        .filter(
          (floatingCard): floatingCard is CommentFloatingCard =>
            floatingCard !== undefined,
        ),
    [mountedFloatingCardIds, floatingCardMap],
  );
  const shouldRender = isDesktopFloatingEnabled && floatingCards.length > 0;

  return {
    floatingCardListContainerRef,
    mountedFloatingCards,
    registerCardNode,
    shouldRender,
  };
};
