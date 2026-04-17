import { useMemo } from 'react';
import { useCommentStore } from '../../stores/comment-store';
import { useCommentAnchors } from '../../stores/comment-store-provider';
import { DEFAULT_TAB_ID } from '../tabs/utils/tab-utils';

export function useIsSelectedContentDeleted(
  commentId: string | undefined,
  selectedContent: string | undefined,
  commentTabId: string | undefined,
): boolean {
  const { activeCommentAnchorIds, activeCommentAnchorIdsTabId } =
    useCommentAnchors();
  const activeTabId = useCommentStore((s) => s.activeTabId);

  return useMemo(() => {
    if (!selectedContent || !commentId) {
      return false;
    }

    if ((commentTabId || DEFAULT_TAB_ID) !== activeTabId) {
      return false;
    }

    if (activeCommentAnchorIdsTabId !== activeTabId) {
      return false;
    }

    return !activeCommentAnchorIds.has(commentId);
  }, [
    activeCommentAnchorIds,
    activeCommentAnchorIdsTabId,
    activeTabId,
    commentId,
    commentTabId,
    selectedContent,
  ]);
}
