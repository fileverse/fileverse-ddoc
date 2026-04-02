import {
  Avatar,
  ButtonGroup,
  cn,
  DynamicDropdown,
  IconButton,
  LucideIcon,
  Skeleton,
  Tooltip,
} from '@fileverse/ui';
import { useRef, useState, useEffect, useCallback } from 'react';
import {
  CommentCardProps,
  CommentReplyProps,
  EnsStatus,
  UserDisplayProps,
} from './types';
import { useComments } from './context/comment-context';
import EnsLogo from '../../assets/ens.svg';
import verifiedMark from '../../assets/ens-check.svg';
import {
  dateFormatter,
  nameFormatter,
  renderTextWithLinks,
} from '../../utils/helpers';
import { Spinner } from '../../common/spinner';

const UserDisplay = ({ username, createdAt }: UserDisplayProps) => {
  const { getEnsStatus, ensCache } = useComments();
  const [ensStatus, setEnsStatus] = useState<EnsStatus>({
    name: username,
    isEns: false,
  });

  useEffect(() => {
    getEnsStatus(username, setEnsStatus);
  }, [username, ensCache]);

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
      <div className="flex gap-[8px]">
        <span className="text-body-sm-bold inline-flex items-center gap-1">
          {nameFormatter(ensStatus.name)}
          {ensStatus.isEns && (
            <img src={verifiedMark} alt="verified" className="w-3.5 h-3.5" />
          )}
        </span>
        <span className="text-helper-text-sm color-text-secondary inline-flex items-center gap-1">
          {createdAt && dateFormatter(createdAt)}
        </span>
      </div>
    </div>
  );
};

const CommentReply = ({
  reply,
  username,
  createdAt,
  // isLast,
}: CommentReplyProps) => {
  return (
    <div className="flex flex-col gap-2 relative pb-3 last:pb-0">
      <UserDisplay username={username} createdAt={createdAt} />
      <span className="text-body-sm flex flex-col gap-2 ml-3 pl-4 border-l custom-border whitespace-pre-wrap break-words">
        {renderTextWithLinks(reply)}
      </span>
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
  onDelete,
  onUnresolve,
  isResolved,
  isDropdown = false,
  activeCommentId,
  id,
  isDisabled = false,
  isCommentOwner,
  version,
  emptyComment,
}: CommentCardProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const { setOpenReplyId } = useComments();
  const { getEnsStatus, ensCache } = useComments();
  const [ensStatus, setEnsStatus] = useState<EnsStatus>({
    name: username as string,
    isEns: false,
  });

  useEffect(() => {
    getEnsStatus(username as string, setEnsStatus);
  }, [username, ensCache]);

  useEffect(() => {
    if (isDropdown) {
      setShowAllReplies(true);
    }

    if (id !== activeCommentId) {
      setShowAllReplies(false);
    }

    if (commentsContainerRef.current && replies) {
      commentsContainerRef.current.scrollTo({
        top: commentsContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [isDropdown, activeCommentId, id, replies]);

  const handleResolveClick = () => {
    onResolve?.(id as string);
    if (dropdownRef.current?.parentElement) {
      const popoverContent = dropdownRef.current.closest('[role="dialog"]');
      if (popoverContent) {
        popoverContent.remove();
      }
    }
  };

  const handleDeleteClick = () => {
    onDelete?.(id as string);
    if (dropdownRef.current?.parentElement) {
      const popoverContent = dropdownRef.current.closest('[role="dialog"]');
      if (popoverContent) {
        popoverContent.remove();
      }
    }
  };

  const handleUnresolveClick = () => {
    onUnresolve?.(id as string);
    if (dropdownRef.current?.parentElement) {
      const popoverContent = dropdownRef.current.closest('[role="dialog"]');
      if (popoverContent) {
        popoverContent.remove();
      }
    }
  };

  const renderReplies = useCallback(() => {
    if (!replies?.length) return null;

    let displayedReplies = replies.sort(
      (a, b) =>
        new Date(a.createdAt || new Date()).getTime() -
        new Date(b.createdAt || new Date()).getTime(),
    );
    if (!showAllReplies && replies.length > 3) {
      displayedReplies = replies.slice(-2);
    }

    return (
      <div className="flex flex-col gap-0 relative">
        {replies.length > 3 && !showAllReplies && (
          <div
            onClick={() => setShowAllReplies(true)}
            className="text-helper-text-sm color-text-secondary hover:underline pb-3 custom-border cursor-pointer flex items-center gap-2 pl-[2px]"
          >
            <IconButton
              icon="ChevronDown"
              variant="ghost"
              size="sm"
              rounded
              className="color-text-secondary border custom-border !min-w-[20px] !w-[20px] !h-[20px]"
              onClick={() => setShowAllReplies(true)}
            />
            <div className="flex items-center -space-x-1">
              {replies.slice(0, 2).map((reply) => (
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
            {replies.length - 2} more replies in this thread
          </div>
        )}

        {displayedReplies.map((reply, index) => (
          <CommentReply
            key={reply.id}
            reply={reply.content || ''}
            username={reply.username || ''}
            createdAt={reply.createdAt || new Date()}
            isLast={index === displayedReplies.length - 1}
          />
        ))}
      </div>
    );
  }, [replies, showAllReplies]);

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

  return (
    <div
      ref={commentsContainerRef}
      data-testid={id ? `comment-card-${id}` : 'comment-card'}
      className={cn(
        'flex flex-col gap-[4px] px-3 group comment-card',
        isResolved && 'opacity-70',
        !isDropdown && '!px-6',
        isDropdown && 'py-3',
      )}
    >
      <div className="flex justify-between items-center">
        <UserDisplay username={username as string} createdAt={createdAt} />
        {version === '2' ? (
          <Tooltip
            text={isDisabled ? 'Available in a moment' : ''}
            sideOffset={0}
            position="top"
          >
            <ButtonGroup className="!space-x-0">
              {!isDropdown && replies && replies.length === 0 && (
                <Tooltip
                  text={!isDisabled ? 'Add reply' : ''}
                  sideOffset={0}
                  position="bottom"
                >
                  <IconButton
                    variant={'ghost'}
                    icon="MessageSquarePlus"
                    size="sm"
                    disabled={isDisabled}
                    className="opacity-0 group-hover:opacity-100  transition-opacity duration-300 disabled:bg-transparent"
                    onClick={() => setOpenReplyId(id as string)}
                  />
                </Tooltip>
              )}

              <div className="flex opacity-0 group-hover:opacity-100 gap-[4px]">
                <IconButton
                  variant={'ghost'}
                  icon="Check"
                  size="sm"
                  className="!min-w-[24px] !w-[24px] !min-h-[24px] !h-[24px]"
                />
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
                    <div className="flex flex-col gap-1 p-2 w-40 shadow-elevation-3">
                      <button className="flex items-center color-text-default text-sm font-medium gap-2 rounded p-2 transition-all hover:color-bg-default-hover w-full">
                        Edit comment
                      </button>
                      <button
                        className="flex items-center color-text-danger text-sm font-medium gap-2 rounded p-2 transition-all hover:color-bg-default-hover w-full"
                        // onClick={() => deleteComment(comment.id as string)}
                      >
                        Delete
                      </button>
                    </div>
                  }
                />
              </div>

              {!isDropdown && isCommentOwner && (
                <DynamicDropdown
                  key="comment-card-more-actions"
                  align="end"
                  sideOffset={4}
                  anchorTrigger={
                    <IconButton
                      icon={'Ellipsis'}
                      variant="ghost"
                      disabled={isDisabled}
                      size="sm"
                      className={cn(
                        'opacity-0 group-hover:opacity-100  transition-opacity duration-300 disabled:bg-transparent',
                      )}
                    />
                  }
                  content={
                    <div
                      ref={dropdownRef}
                      className="flex flex-col gap-1 p-2 w-40 shadow-elevation-3"
                    >
                      <button
                        className={cn(
                          'flex items-center color-text-default text-sm font-medium gap-2 rounded p-2 transition-all hover:color-bg-default-hover w-full',
                        )}
                        onClick={
                          isResolved ? handleUnresolveClick : handleResolveClick
                        }
                      >
                        <LucideIcon name="CircleCheck" size="sm" />
                        {isResolved ? 'Unresolve' : 'Resolve'}
                      </button>
                      <button
                        className="flex items-center color-text-danger text-sm font-medium gap-2 rounded p-2 transition-all hover:color-bg-default-hover w-full"
                        onClick={handleDeleteClick}
                      >
                        <LucideIcon name="Trash2" size="sm" />
                        Delete
                      </button>
                    </div>
                  }
                />
              )}
            </ButtonGroup>
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
      <div className="flex flex-col gap-2 ml-3 pl-4 border-l custom-border py-0 pb-3">
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
            <span className="text-body-sm whitespace-pre-wrap break-words">
              {renderTextWithLinks(comment)}
            </span>
          </div>
        )}
      </div>
      {replies && renderReplies()}
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
