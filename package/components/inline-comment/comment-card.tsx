import {
  Avatar,
  ButtonGroup,
  cn,
  DynamicDropdown,
  IconButton,
  LucideIcon,
  Tooltip,
} from '@fileverse/ui';
import { useRef, useState, useEffect, useCallback } from 'react';
import { CommentCardProps, CommentReplyProps, UserDisplayProps } from './types';
import { useComments, useEnsName } from './context/comment-context';
import EnsLogo from '../../assets/ens.svg';
import verifiedMark from '../../assets/verified-mark.png';
import { dateFormatter, nameFormatter } from '../../utils/helpers';

const UserDisplay = ({ ensStatus, createdAt }: UserDisplayProps) => {
  return (
    <div className="flex justify-start items-center gap-2">
      <Avatar
        src={ensStatus.isEns ? EnsLogo : undefined}
        size="sm"
        className="min-w-6"
      />
      <div className="flex flex-col">
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

const CommentReply = ({ reply, username, createdAt }: CommentReplyProps) => {
  const ensStatus = useEnsName(username);

  return (
    <div className="flex flex-col gap-2">
      <UserDisplay ensStatus={ensStatus} createdAt={createdAt} />
      <span className="text-body-sm flex flex-col gap-2 ml-3 pl-4 border-l whitespace-pre-wrap break-words">
        {reply}
      </span>
    </div>
  );
};

export const CommentCard = ({
  username,
  selectedContent,
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
}: CommentCardProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const { setOpenReplyId } = useComments();
  const ensStatus = useEnsName(username);

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

    let displayedReplies = replies;
    if (!showAllReplies && replies.length > 3) {
      displayedReplies = replies.slice(-2);
    }

    return (
      <div className="flex flex-col gap-3">
        {replies.length > 3 && !showAllReplies && (
          <button
            onClick={() => setShowAllReplies(true)}
            className="text-helper-text-sm color-text-secondary hover:underline text-left ml-3 pl-4"
          >
            {replies.length - 2} more replies in this thread
          </button>
        )}

        {displayedReplies.map((reply) => (
          <CommentReply
            key={reply.id}
            reply={reply.content || ''}
            username={reply.username || ''}
            createdAt={reply.createdAt || new Date()}
          />
        ))}
      </div>
    );
  }, [replies, showAllReplies]);

  return (
    <div
      ref={commentsContainerRef}
      className={cn(
        'flex flex-col gap-3 px-3 group comment-card',
        isResolved && 'opacity-70',
        !isDropdown && '!px-6',
        isDropdown && 'py-3',
      )}
    >
      <div className="flex justify-between items-center">
        <UserDisplay ensStatus={ensStatus} createdAt={createdAt} />
        <ButtonGroup className="!space-x-0">
          {!isDropdown && replies && replies.length === 0 && (
            <Tooltip text="Add reply" sideOffset={0} position="bottom">
              <IconButton
                variant={'ghost'}
                icon="MessageSquarePlus"
                size="sm"
                className="md:group-hover:opacity-100 md:opacity-0 transition-opacity duration-300"
                onClick={() => setOpenReplyId(id as string)}
              />
            </Tooltip>
          )}

          <Tooltip text="Coming soon" sideOffset={0} position="bottom">
            <IconButton
              variant={'ghost'}
              icon="Smile"
              disabled
              size="sm"
              className="md:group-hover:disabled:opacity-50 md:opacity-0 transition-opacity duration-300 disabled:bg-transparent"
            />
          </Tooltip>

          {!isDropdown && (
            <DynamicDropdown
              key="comment-card-more-actions"
              align="end"
              sideOffset={4}
              anchorTrigger={
                <IconButton
                  icon={'Ellipsis'}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'md:group-hover:opacity-100 md:opacity-0 transition-opacity duration-300',
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
                    className="flex items-center text-[#FB3449] text-sm font-medium gap-2 rounded p-2 transition-all hover:bg-[#FFF1F2] w-full"
                    onClick={handleDeleteClick}
                  >
                    <LucideIcon name="Trash2" size="sm" stroke="#FB3449" />
                    Delete
                  </button>
                </div>
              }
            />
          )}
        </ButtonGroup>
      </div>
      <div className="flex flex-col gap-2 ml-3 pl-4 border-l color-border-default">
        {selectedContent && (
          <div className="bg-[#e5fbe7] p-1 rounded-lg">
            <div className="relative">
              <span
                className={cn('text-body-sm italic block', {
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
        )}
        {comment && (
          <div>
            <span className="text-body-sm whitespace-pre-wrap break-words">
              {comment}
            </span>
          </div>
        )}
      </div>
      {replies && renderReplies()}
    </div>
  );
};
