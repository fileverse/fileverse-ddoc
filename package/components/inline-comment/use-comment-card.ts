import { MouseEvent, useEffect, useRef, useState } from 'react';
import { IComment } from '../../extensions/comment';
import { useCommentStore } from '../../stores/comment-store';
import { useResponsive } from '../../utils/responsive';
import { CommentCardProps } from './types';
import { useEnsStatus } from './use-ens-status';

export const useCommentCard = ({
  username,
  comment,
  replies,
  onResolve,
  onRequestDelete,
  onUnresolve,
  onFocusRequest,
  isResolved,
  isDropdown = false,
  isCommentDrawerContext,
  activeCommentId,
  id,
  isFocused,
}: CommentCardProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [isCommentExpanded, setIsCommentExpanded] = useState(false);
  const openReplyId = useCommentStore((s) => s.openReplyId);
  const setOpenReplyId = useCommentStore((s) => s.setOpenReplyId);
  const requestEditComment = useCommentStore((s) => s.requestEditComment);
  const currentUsername = useCommentStore((s) => s.username);
  const { isBelow1280px } = useResponsive();
  const ensStatus = useEnsStatus(username);

  const removePopoverContent = () => {
    if (dropdownRef.current?.parentElement) {
      const popoverContent = dropdownRef.current.closest('[role="dialog"]');
      if (popoverContent) {
        popoverContent.remove();
      }
    }
  };

  const shouldKeepDropdownExpanded = isDropdown && isFocused === undefined;
  const isCardActive = Boolean(
    isFocused || (!isDropdown && id === activeCommentId),
  );

  useEffect(() => {
    if (shouldKeepDropdownExpanded) {
      setShowAllReplies(true);
    }

    if (!shouldKeepDropdownExpanded && !isCardActive) {
      setShowAllReplies(false);
      setIsCommentExpanded(false);
    }

    if (commentsContainerRef.current && replies) {
      commentsContainerRef.current.scrollTo({
        top: commentsContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [shouldKeepDropdownExpanded, isCardActive, replies]);

  const handleResolveClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onResolve?.(id as string);
    removePopoverContent();
  };

  const handleRequestDeleteClick = () => {
    onRequestDelete?.(id as string);
    removePopoverContent();
  };

  const handleRequestEditClick = () => {
    if (!id) {
      return;
    }

    const isStrictOwner = Boolean(
      currentUsername && username && username === currentUsername,
    );

    if (!isStrictOwner) {
      return;
    }

    if (isCommentDrawerContext) {
      setOpenReplyId(id);
    }

    requestEditComment(id);
    removePopoverContent();
  };

  const handleUnresolveClick = () => {
    onUnresolve?.(id as string);
    removePopoverContent();
  };

  const focusCardIfNeeded = () => {
    if (!isCardActive) {
      onFocusRequest?.();
    }
  };

  const isCommentMobileFocused = isBelow1280px && Boolean(openReplyId);

  const handleCommentExpandClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isCommentMobileFocused || !isBelow1280px) {
      event.stopPropagation();
    }

    focusCardIfNeeded();
    setIsCommentExpanded((prev) => !prev);
  };

  const handleReplyToggleClick = (event: MouseEvent<HTMLElement>) => {
    if (isCommentMobileFocused || !isBelow1280px) {
      event.stopPropagation();
    }

    focusCardIfNeeded();
    setShowAllReplies((prev) => !prev);
  };

  const shouldShowReplyThread = !isBelow1280px || isCommentMobileFocused;
  const replyThreadCount = shouldShowReplyThread ? 2 : 0;
  const isCommentTruncated = Boolean(comment && comment.length > 70);
  const displayedComment =
    comment && isCommentTruncated && !isCommentExpanded
      ? comment.slice(0, 70) + '...'
      : comment;

  const visibleReplies = (replies || []).filter((reply) => !reply.deleted);
  let displayedReplies: IComment[] = [...visibleReplies].sort(
    (a, b) =>
      new Date(a.createdAt || new Date()).getTime() -
      new Date(b.createdAt || new Date()).getTime(),
  );

  if (!showAllReplies && visibleReplies.length > 3) {
    displayedReplies = displayedReplies.slice(-2);
  }

  const shouldShowMinimizedReplies =
    isBelow1280px && !isCommentMobileFocused
      ? visibleReplies.length > 0
      : visibleReplies.length > 3 && !showAllReplies;
  const shouldShowResolvedMobileReplyCount =
    Boolean(isResolved) && isCommentMobileFocused && !showAllReplies;
  const shouldShowReplyToggle =
    shouldShowMinimizedReplies ||
    (shouldShowReplyThread && visibleReplies.length > 3 && showAllReplies) ||
    (Boolean(isResolved) && isCommentMobileFocused && showAllReplies);
  const replyToggleLabel = showAllReplies
    ? 'Hide replies'
    : `${visibleReplies.length - replyThreadCount} ${replyThreadCount > 0 ? 'more ' : ''}replies in this thread`;

  return {
    commentsContainerRef,
    displayedComment,
    displayedReplies,
    dropdownRef,
    ensStatus,
    focusCardIfNeeded,
    handleCommentExpandClick,
    handleReplyToggleClick,
    handleRequestEditClick,
    handleRequestDeleteClick,
    handleResolveClick,
    handleUnresolveClick,
    isBelow1280px,
    isCardActive,
    isCommentExpanded,
    isCommentMobileFocused,
    isCommentTruncated,
    replyToggleLabel,
    shouldShowReplyThread,
    shouldShowReplyToggle,
    shouldShowResolvedMobileReplyCount,
    showAllReplies,
    visibleReplies,
  };
};
