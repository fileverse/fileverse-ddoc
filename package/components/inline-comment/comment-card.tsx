import {
  Avatar,
  cn,
  DynamicDropdown,
  IconButton,
  LucideIcon,
  Skeleton,
  Tooltip,
} from '@fileverse/ui';
import { useRef, useState, useEffect } from 'react';
import {
  CommentCardProps,
  CommentReplyProps,
  EnsStatus,
  UserDisplayProps,
} from './types';
import { useCommentStore } from '../../stores/comment-store';
import EnsLogo from '../../assets/ens.svg';
import verifiedMark from '../../assets/ens-check.svg';
import {
  dateFormatter,
  nameFormatter,
  renderTextWithLinks,
} from '../../utils/helpers';
import { Spinner } from '../../common/spinner';
import { DeleteConfirmOverlay } from './delete-confirm-overlay';
import { useResponsive } from '../../utils/responsive';

const UserDisplay = ({ username, createdAt }: UserDisplayProps) => {
  const getEnsStatus = useCommentStore((s) => s.getEnsStatus);
  const ensCache = useCommentStore((s) => s.ensCache);
  const [ensStatus, setEnsStatus] = useState<EnsStatus>({
    name: username,
    isEns: false,
  });

  useEffect(() => {
    getEnsStatus(username, setEnsStatus);
  }, [username, ensCache, getEnsStatus]);

  return (
    <div className="flex justify-start items-center gap-2">
      <Avatar
        src={
          ensStatus.isEns
            ? EnsLogo
            : `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(
                ensStatus.name,
              )}`
        }
        size="sm"
        className="min-w-6"
      />
      <div className="flex items-center gap-[8px] flex-wrap">
        <span className="text-body-sm-bold inline-flex items-center gap-1 whitespace-nowrap">
          {nameFormatter(ensStatus.name)}
          {ensStatus.isEns && (
            <img src={verifiedMark} alt="verified" className="w-3.5 h-3.5" />
          )}
        </span>
        <span className="text-helper-text-sm color-text-secondary inline-flex items-center gap-1 whitespace-nowrap">
          {createdAt && dateFormatter(createdAt)}
        </span>
      </div>
    </div>
  );
};

const CommentReply = ({
  commentId,
  replyId,
  reply,
  username,
  createdAt,
  // isLast,
}: CommentReplyProps) => {
  // const dropdownRef = useRef<HTMLDivElement>(null);
  const [isCommentExpanded, setIsCommentExpanded] = useState(false);
  const [isDeleteOverlayVisible, setIsDeleteOverlayVisible] = useState(false);
  const deleteReply = useCommentStore((s) => s.deleteReply);
  const isCommentTruncated = Boolean(reply && reply.length > 70);

  const displayedComment =
    reply && isCommentTruncated && !isCommentExpanded
      ? reply.slice(0, 70) + '...'
      : reply;

  // const removePopoverContent = () => {
  //   if (dropdownRef.current?.parentElement) {
  //     const popoverContent = dropdownRef.current.closest('[role="dialog"]');
  //     if (popoverContent) {
  //       popoverContent.remove();
  //     }
  //   }
  // };

  // const handleRequestDeleteClick = () => {
  //   setIsDeleteOverlayVisible(true);
  //   removePopoverContent();
  // };

  const handleDeleteOverlayClose = () => {
    setIsDeleteOverlayVisible(false);
  };

  const handleDeleteReply = () => {
    setIsDeleteOverlayVisible(false);
    deleteReply(commentId, replyId);
  };

  return (
    <div
      className={cn(
        'flex group relative flex-col gap-2 p-[4px]',
        isDeleteOverlayVisible && 'min-h-[100px]',
      )}
    >
      <div className="flex justify-between">
        <UserDisplay username={username} createdAt={createdAt} />
        {/* <div className=" opacity-0 group-hover:opacity-100">
          <DynamicDropdown
            key={`thread-actions-${createdAt.getTime()}`}
            align="end"
            sideOffset={4}
            anchorTrigger={
              <IconButton
                icon="EllipsisVertical"
                variant="ghost"
                size="sm"
                className="!min-w-[24px] !w-[24px] !min-h-[24px] !h-[24px]"
              />
            }
            content={
              <div
                ref={dropdownRef}
                className="flex flex-col p-2 w-40 shadow-elevation-3"
              >
                <button className="flex items-center h-[32px] color-text-default gap-[12px] rounded p-2 transition-all hover:color-bg-default-hover w-full">
                  <LucideIcon name="Pencil" size="sm" />
                  <p className="text-body-sm color-text-default">Edit</p>
                </button>
                <button
                  className="flex items-center h-[32px] color-text-danger text-sm font-medium gap-[12px] rounded p-2 transition-all hover:color-bg-default-hover w-full"
                  onClick={handleRequestDeleteClick}
                >
                  <LucideIcon name="Trash2" size="sm" stroke="#FB3449" />
                  <p className="text-body-sm color-text-danger">Delete</p>
                </button>
              </div>
            }
          />
        </div> */}
      </div>

      <div className="ml-[13px] pl-[18px] border-l custom-border ">
        <div className="text-body-sm flex flex-col gap-2 whitespace-pre-wrap break-words">
          {renderTextWithLinks(displayedComment)}
        </div>
        {isCommentTruncated && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCommentExpanded((prev) => !prev);
            }}
            className="color-text-link text-left mt-[4px] cursor-pointer text-helper-text-sm"
          >
            {isCommentExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
      <DeleteConfirmOverlay
        isVisible={isDeleteOverlayVisible}
        title="Delete this reply ?"
        onCancel={handleDeleteOverlayClose}
        onConfirm={handleDeleteReply}
      />
    </div>
  );
};

export const CommentCard = ({
  username,
  // selectedContent,
  comment,
  createdAt,
  replies,
  onResolve,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDelete: _onDelete,
  onRequestDelete,
  onUnresolve,
  onFocusRequest,
  isResolved,
  isDropdown = false,
  activeCommentId,
  id,
  isDisabled = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isCommentOwner,
  version,
  emptyComment,
  isFocused,
  isCommentDrawerContext,
}: CommentCardProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [isCommentExpanded, setIsCommentExpanded] = useState(false);
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const openReplyId = useCommentStore((s) => s.openReplyId);
  const getEnsStatus = useCommentStore((s) => s.getEnsStatus);
  const ensCache = useCommentStore((s) => s.ensCache);
  const { isBelow1280px } = useResponsive();
  const [ensStatus, setEnsStatus] = useState<EnsStatus>({
    name: username as string,
    isEns: false,
  });

  useEffect(() => {
    getEnsStatus(username as string, setEnsStatus);
  }, [username, ensCache, getEnsStatus]);

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

  const handleResolveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onResolve?.(id as string);
    removePopoverContent();
  };

  const handleRequestDeleteClick = () => {
    onRequestDelete?.(id as string);
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
  const handleCommentExpandClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isCommentMobileFocused || !isBelow1280px) {
      e.stopPropagation();
    }
    focusCardIfNeeded();
    setIsCommentExpanded((prev) => !prev);
  };
  const handleReplyToggleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (isCommentMobileFocused || !isBelow1280px) {
      e.stopPropagation();
    }

    focusCardIfNeeded();
    setShowAllReplies((prev) => !prev);
  };
  const isCommentMobileFocused = isBelow1280px && Boolean(openReplyId);
  const shouldShowReplyThread = !isBelow1280px || isCommentMobileFocused;
  const replyThreadCount = shouldShowReplyThread ? 2 : 0;

  if (emptyComment)
    return (
      <div
        ref={commentsContainerRef}
        className={cn(
          'flex flex-col gap-3 px-3 group comment-card',
          !isDropdown && '!px-6',
          isDropdown && 'py-3',
        )}
      >
        <div className="flex justify-start items-center">
          <UserDisplaySkeleton />
        </div>
        <div className="flex flex-col gap-2 ml-3 pl-4 border-l custom-border">
          <div className="flex items-center gap-2 color-text-secondary">
            <Spinner size="sm" />
            <p className="text-helper-text-sm">Loading encrypted comments</p>
          </div>
        </div>
      </div>
    );

  const isCommentTruncated = Boolean(comment && comment.length > 70);

  const displayedComment =
    comment && isCommentTruncated && !isCommentExpanded
      ? comment.slice(0, 70) + '...'
      : comment;
  // Keep reply derivation inline here. The previous memoized helper hid stale
  // dependencies around resolution and mobile focus state.
  const visibleReplies = (replies || []).filter((reply) => !reply.deleted);
  let displayedReplies = [...visibleReplies].sort(
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
    isResolved && isCommentMobileFocused && !showAllReplies;
  const shouldShowReplyToggle =
    shouldShowMinimizedReplies ||
    (shouldShowReplyThread && visibleReplies.length > 3 && showAllReplies) ||
    (isResolved && isCommentMobileFocused && showAllReplies);
  const replyToggleLabel = showAllReplies
    ? 'Hide replies'
    : `${visibleReplies.length - replyThreadCount} ${replyThreadCount > 0 ? 'more ' : ''}replies in this thread`;

  return (
    <div
      ref={commentsContainerRef}
      data-testid={id ? `comment-card-${id}` : 'comment-card'}
      onClick={focusCardIfNeeded}
      className={cn(
        'flex flex-col gap-[4px] group comment-card',
        isResolved && 'opacity-70',
        isCommentDrawerContext ? 'p-3 pb-0' : 'px-3',
      )}
    >
      <div className="flex flex-col gap-[8px]">
        <div className="flex justify-between items-center">
          <UserDisplay username={username as string} createdAt={createdAt} />
          {version === '2' ? (
            <Tooltip
              text={isDisabled ? 'Available in a moment' : ''}
              sideOffset={0}
              position="top"
            >
              <div
                className={cn(
                  !isBelow1280px && 'opacity-0 group-hover:opacity-100',
                  'flex  gap-[4px]',
                )}
              >
                {isCommentOwner && !isResolved && (
                  <Tooltip text="Mark as resolved" position="bottom">
                    <IconButton
                      variant={'ghost'}
                      icon="Check"
                      size="sm"
                      className="!min-w-[24px] !w-[24px] !min-h-[24px] !h-[24px]"
                      onClick={handleResolveClick}
                    />
                  </Tooltip>
                )}

                {isCommentOwner && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <DynamicDropdown
                      key={`thread-actions-${id}`}
                      align="end"
                      sideOffset={4}
                      anchorTrigger={
                        <IconButton
                          icon="EllipsisVertical"
                          variant="ghost"
                          size="sm"
                          className="!min-w-[24px] !w-[24px] !min-h-[24px] !h-[24px]"
                        />
                      }
                      content={
                        <div
                          ref={dropdownRef}
                          className="flex flex-col p-2 w-40 shadow-elevation-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isResolved && (
                            <button
                              className="flex items-center h-[32px] color-text-default gap-[12px] rounded p-2 transition-all hover:color-bg-default-hover w-full"
                              onClick={handleUnresolveClick}
                            >
                              <LucideIcon name="RotateCcw" size="sm" />
                              <p className="text-body-sm color-text-default">
                                Unresolve
                              </p>
                            </button>
                          )}
                          <button
                            className="flex items-center h-[32px] color-text-danger text-sm font-medium gap-[12px] rounded p-2 transition-all hover:color-bg-default-hover w-full"
                            onClick={handleRequestDeleteClick}
                          >
                            <LucideIcon
                              name="Trash2"
                              size="sm"
                              stroke="#FB3449"
                            />
                            <p className="text-body-sm color-text-danger">
                              Delete
                            </p>
                          </button>
                        </div>
                      }
                    />
                  </div>
                )}
              </div>
            </Tooltip>
          ) : (
            <Tooltip text="Actions are not supported for old comments">
              <IconButton
                icon={'Info'}
                variant="ghost"
                disabled={true}
                size="sm"
                className={cn(
                  'opacity-0 group-hover:opacity-100  transition-opacity duration-300 disabled:bg-transparent',
                )}
              />
            </Tooltip>
          )}
        </div>
        <div
          className={cn(
            'flex flex-col gap-2   pl-[18px] custom-border py-0',
            // (isFocused || (replies || []).length > 0) && 'pb-3',
            (
              isBelow1280px
                ? isCommentMobileFocused
                : (replies || []).length > 0
            )
              ? 'border-l ml-[13px]'
              : 'ml-[15px]',
          )}
        >
          {/* {selectedContent && (
          <div className="highlight-comment-bg p-1 rounded-lg">
            <div className="relative">
              <span
                className={cn('text-body-sm italic block break-all', {
                  'line-clamp-2': !isExpanded && selectedContent.length > 70,
                })}
              >
                "{selectedContent}"
              </span>
              {selectedContent.length > 70 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-helper-text-sm pt-1 color-text-secondary hover:underline"
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          </div>
        )} */}
          {comment && (
            <div>
              <div className="text-body-sm whitespace-pre-wrap break-words">
                {renderTextWithLinks(displayedComment || '')}
              </div>
              {isCommentTruncated && (
                <button
                  type="button"
                  onClick={handleCommentExpandClick}
                  className="color-text-link mt-[4px] cursor-pointer text-helper-text-sm"
                >
                  {isCommentExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {visibleReplies.length > 0 &&
        (shouldShowResolvedMobileReplyCount ? (
          // Mobile resolved threads stay compact by default, but the count can
          // still expand the thread on demand.
          <button
            type="button"
            onClick={handleReplyToggleClick}
            className="text-helper-text-sm color-text-secondary text-left hover:underline"
          >
            {visibleReplies.length} replies
          </button>
        ) : (
          <div className="flex flex-col gap-0 relative">
            {shouldShowReplyToggle && (
              <div
                onClick={handleReplyToggleClick}
                className={cn(
                  'text-helper-text-sm color-text-secondary min-h-[28px] mb-[4px] hover:underline custom-border cursor-pointer flex items-center gap-2 pr-[8px] pl-[4px]',
                  !shouldShowReplyThread && 'justify-center mt-[4px]',
                )}
              >
                <IconButton
                  icon={showAllReplies ? 'ChevronUp' : 'ChevronDown'}
                  variant="ghost"
                  size="sm"
                  rounded
                  className="color-text-secondary border custom-border !min-w-[20px] !w-[20px] !h-[20px]"
                  onClick={handleReplyToggleClick}
                />
                {!showAllReplies && (
                  <div className="flex items-center -space-x-1">
                    {visibleReplies.slice(0, 2).map((reply) => (
                      <Avatar
                        src={
                          ensStatus.isEns
                            ? EnsLogo
                            : `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(
                                reply.username || '',
                              )}`
                        }
                        size="sm"
                        className="w-4 h-4 last:z-10 bg-transparent"
                        bordered="border"
                        key={reply.id}
                      />
                    ))}
                  </div>
                )}
                {replyToggleLabel}
              </div>
            )}

            {shouldShowReplyThread &&
              displayedReplies.map((reply, index) => (
                <CommentReply
                  key={reply.id}
                  commentId={id as string}
                  replyId={reply.id || ''}
                  reply={reply.content || ''}
                  username={reply.username || ''}
                  createdAt={reply.createdAt || new Date()}
                  isLast={index === displayedReplies.length - 1}
                />
              ))}
          </div>
        ))}
    </div>
  );
};

export const UserDisplaySkeleton = () => {
  return (
    <div className="flex justify-start items-center gap-2">
      <Skeleton className="w-6  h-6 rounded-full" />
      <Skeleton className="w-32 h-4 rounded" />
    </div>
  );
};
