import { useCallback, useMemo } from 'react';
import type { RefObject } from 'react';
import type { IComment } from '../../extensions/comment';

interface UseMobileCommentNavigationProps {
  comments: IComment[];
  mobileDrawerRef: RefObject<HTMLDivElement>;
  onCommentFocus: (commentId: string, tabId?: string) => void;
  openReplyId: string | null;
  setOpenReplyId: (commentId: string | null) => void;
}

export const useMobileCommentNavigation = ({
  comments,
  mobileDrawerRef,
  onCommentFocus,
  openReplyId,
  setOpenReplyId,
}: UseMobileCommentNavigationProps) => {
  const mobileActiveComments = useMemo(
    () =>
      comments
        .filter((comment) => !comment.deleted)
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        ),
    [comments],
  );
  const mobileFocusedCommentIndex = mobileActiveComments.findIndex(
    (comment) => comment.id === openReplyId,
  );
  const canGoToPreviousMobileComment = mobileFocusedCommentIndex > 0;
  const canGoToNextMobileComment =
    mobileFocusedCommentIndex >= 0 &&
    mobileFocusedCommentIndex < mobileActiveComments.length - 1;

  const handleViewAllComments = useCallback(() => {
    setOpenReplyId(null);
  }, [setOpenReplyId]);

  const focusMobileComment = useCallback(
    (commentIndex: number) => {
      const targetComment = mobileActiveComments[commentIndex];

      if (!targetComment?.id) {
        return;
      }

      setOpenReplyId(targetComment.id);
      onCommentFocus(targetComment.id, targetComment.tabId);

      requestAnimationFrame(() => {
        const commentElement =
          mobileDrawerRef.current?.querySelector<HTMLElement>(
            `[data-comment-id="${targetComment.id}"]`,
          );

        commentElement?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      });
    },
    [mobileActiveComments, mobileDrawerRef, onCommentFocus, setOpenReplyId],
  );

  const handlePreviousMobileComment = useCallback(() => {
    if (!canGoToPreviousMobileComment) {
      return;
    }

    focusMobileComment(mobileFocusedCommentIndex - 1);
  }, [
    canGoToPreviousMobileComment,
    focusMobileComment,
    mobileFocusedCommentIndex,
  ]);

  const handleNextMobileComment = useCallback(() => {
    if (!canGoToNextMobileComment) {
      return;
    }

    focusMobileComment(mobileFocusedCommentIndex + 1);
  }, [canGoToNextMobileComment, focusMobileComment, mobileFocusedCommentIndex]);

  return {
    canGoToNextMobileComment,
    canGoToPreviousMobileComment,
    handleNextMobileComment,
    handlePreviousMobileComment,
    handleViewAllComments,
    mobileActiveCommentsCount: mobileActiveComments.length,
    mobileFocusedCommentIndex,
  };
};
