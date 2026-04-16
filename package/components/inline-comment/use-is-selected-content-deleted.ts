import { useMemo } from 'react';
import { useCommentAnchors } from '../../stores/comment-store-provider';

export function useIsSelectedContentDeleted(
  commentId: string | undefined,
  selectedContent: string | undefined,
): boolean {
  const { activeCommentAnchorIds } = useCommentAnchors();

  return useMemo(() => {
    if (!selectedContent || !commentId) {
      return false;
    }

    return !activeCommentAnchorIds.has(commentId);
  }, [activeCommentAnchorIds, commentId, selectedContent]);
}
