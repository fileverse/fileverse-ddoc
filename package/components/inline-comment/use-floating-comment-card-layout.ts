import type { RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import type { CommentFloatingCard } from './context/types';
import { useAnchorRegistry } from './use-anchor-registry';
import { useFloatingCardState } from './use-floating-card-state';
import { useFloatingLayoutEngine } from './use-floating-layout-engine';

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
  /*
   * Floating comments are split into three parts:
   * - anchor registry: finds where each comment belongs in the editor
   * - floating card state: remembers runtime data like order, size, and mounted cards
   * - layout engine: decides which cards to show and where to place them
   */
  const anchorRegistry = useAnchorRegistry();
  const floatingCardState = useFloatingCardState();
  const { floatingCardListContainerRef, registerCardNode } =
    useFloatingLayoutEngine({
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
    });

  return {
    floatingCardListContainerRef,
    mountedFloatingCardIds: floatingCardState.mountedFloatingCardIds,
    registerCardNode,
  };
};
