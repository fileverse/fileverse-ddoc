import { useCallback, useEffect, useState } from 'react';
import type { IComment } from '../../extensions/comment';
import { DEFAULT_TAB_ID } from '../tabs/utils/tab-utils';

interface UseCommentDrawerFocusProps {
  activeTabId: string;
  comments: IComment[];
  focusCommentInEditor: (
    commentId: string,
    options?: { source?: 'explicit-ui' },
  ) => void;
  isBelow1280px: boolean;
  onTabChange?: (tabId: string) => void;
  setOpenReplyId: (commentId: string | null) => void;
}

export const useCommentDrawerFocus = ({
  activeTabId,
  comments,
  focusCommentInEditor,
  isBelow1280px,
  onTabChange,
  setOpenReplyId,
}: UseCommentDrawerFocusProps) => {
  const [pendingCommentFocus, setPendingCommentFocus] = useState<{
    commentId: string;
    tabId: string;
  } | null>(null);

  const handleCommentFocus = useCallback(
    (commentId: string, commentTabId?: string) => {
      const targetTabId = commentTabId || DEFAULT_TAB_ID;

      if (targetTabId !== activeTabId) {
        // Cross-tab thread clicks should not silently no-op. Switch tabs first,
        // then replay the requested focus once the target tab is active.
        setPendingCommentFocus({ commentId, tabId: targetTabId });
        onTabChange?.(targetTabId);
        return;
      }

      focusCommentInEditor(
        commentId,
        isBelow1280px ? undefined : { source: 'explicit-ui' },
      );
    },
    [activeTabId, focusCommentInEditor, isBelow1280px, onTabChange],
  );

  useEffect(() => {
    if (
      !pendingCommentFocus ||
      pendingCommentFocus.tabId !== activeTabId ||
      !comments.some(
        (comment) =>
          comment.id === pendingCommentFocus.commentId &&
          (comment.tabId || DEFAULT_TAB_ID) === activeTabId,
      )
    ) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      // Wait a frame so the tab switch can mount the matching comment nodes
      // before trying to focus/scroll them in the editor.
      setOpenReplyId(pendingCommentFocus.commentId);
      focusCommentInEditor(
        pendingCommentFocus.commentId,
        isBelow1280px ? undefined : { source: 'explicit-ui' },
      );
      setPendingCommentFocus(null);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [
    activeTabId,
    comments,
    focusCommentInEditor,
    isBelow1280px,
    pendingCommentFocus,
    setOpenReplyId,
  ]);

  const clearPendingCommentFocus = useCallback(
    () => setPendingCommentFocus(null),
    [],
  );

  return {
    clearPendingCommentFocus,
    handleCommentFocus,
  };
};
