import { useMemo } from 'react';
import { useCommentStore } from '../../stores/comment-store';
import { useCommentAnchors } from '../../stores/comment-store-provider';
import { DEFAULT_TAB_ID } from '../tabs/utils/tab-utils';

export function useIsSelectedContentDeleted(
  commentId: string | undefined,
  selectedContent: string | undefined,
  commentTabId: string | undefined,
  isSuggestion = false,
): boolean {
  const {
    activeCommentAnchorIds,
    activeCommentAnchorIdsTabId,
    hasRenderedCommentAnchor,
  } = useCommentAnchors();
  const activeTabId = useCommentStore((s) => s.activeTabId);

  return useMemo(() => {
    if (!commentId) {
      return false;
    }

    if (!selectedContent && !isSuggestion) {
      return false;
    }

    if ((commentTabId || DEFAULT_TAB_ID) !== activeTabId) {
      return false;
    }

    if (activeCommentAnchorIdsTabId !== activeTabId) {
      return false;
    }

    if (activeCommentAnchorIds.has(commentId)) {
      return false;
    }

    return !hasRenderedCommentAnchor(commentId);
  }, [
    activeCommentAnchorIds,
    activeCommentAnchorIdsTabId,
    activeTabId,
    commentId,
    commentTabId,
    hasRenderedCommentAnchor,
    isSuggestion,
    selectedContent,
  ]);
}
