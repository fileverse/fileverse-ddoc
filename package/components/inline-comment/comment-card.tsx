import {
  Avatar,
  ButtonGroup,
  cn,
  DynamicDropdown,
  IconButton,
  LucideIcon,
  Tooltip,
} from '@fileverse/ui';
import { useRef, useState, useEffect } from 'react';
import { CommentCardProps } from './types';

export const CommentCard = ({
  username,
  walletAddress,
  selectedText,
  comment,
  timestamp = new Date(),
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

  useEffect(() => {
    if (commentsContainerRef.current && replies) {
      commentsContainerRef.current.scrollTo({
        top: commentsContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [replies]);

  useEffect(() => {
    if (id !== activeCommentId) {
      setShowAllReplies(false);
    }
  }, [activeCommentId, id]);

  const handleResolveClick = () => {
    onResolve?.();
    if (dropdownRef.current?.parentElement) {
      const popoverContent = dropdownRef.current.closest('[role="dialog"]');
      if (popoverContent) {
        popoverContent.remove();
      }
    }
  };

  const handleDeleteClick = () => {
    onDelete?.();
    if (dropdownRef.current?.parentElement) {
      const popoverContent = dropdownRef.current.closest('[role="dialog"]');
      if (popoverContent) {
        popoverContent.remove();
      }
    }
  };

  const handleUnresolveClick = () => {
    onUnresolve?.();
    if (dropdownRef.current?.parentElement) {
      const popoverContent = dropdownRef.current.closest('[role="dialog"]');
      if (popoverContent) {
        popoverContent.remove();
      }
    }
  };

  const renderReplies = () => {
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

        {displayedReplies.map((reply, index) => (
          <div key={index} className="flex flex-col gap-1">
            <div className="flex justify-start items-center gap-2">
              <Avatar
                src="https://github.com/identicons/random.png"
                size="sm"
                className="min-w-6"
              />
              <div className="flex flex-col">
                <span className="text-body-sm-bold">
                  {username || walletAddress || 'Anonymous'}
                </span>
                <span className="text-helper-text-sm color-text-secondary">
                  {timestamp.toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </span>
              </div>
            </div>
            <span className="text-body-sm flex flex-col gap-2 ml-3 pl-4 border-l">
              {reply.content}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      ref={commentsContainerRef}
      className={cn(
        'flex flex-col gap-3 p-3  max-h-[400px] overflow-y-auto no-scrollbar',
        isResolved && 'opacity-30',
      )}
    >
      <div className="flex justify-between items-center">
        <div className="flex justify-start items-center gap-2">
          <Avatar src={''} size="sm" className="min-w-6" />
          <div className="flex flex-col">
            <span className="text-body-sm-bold">
              {username || walletAddress || 'Anonymous'}
            </span>
            <span className="text-helper-text-sm color-text-secondary">
              {timestamp.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          </div>
        </div>
        <ButtonGroup className="group">
          <Tooltip text="Add reaction" sideOffset={0} position="bottom">
            <IconButton
              variant={'ghost'}
              icon="Smile"
              size="sm"
              className="md:group-hover:opacity-100 md:opacity-0 transition-opacity duration-300"
            />
          </Tooltip>

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
                  isDropdown && 'hidden',
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
                    'flex items-center color-text-default text-sm font-medium gap-2 rounded p-2 transition-all hover:bg-[#FFF1F2] w-full',
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
        </ButtonGroup>
      </div>
      <div className="flex flex-col gap-2 ml-3 pl-4 border-l color-border-default">
        <div className="bg-[#e5fbe7] p-2 rounded-lg">
          <div className="relative">
            <span
              className={cn('text-body-sm italic block', {
                'line-clamp-2': !isExpanded && selectedText.length > 70,
              })}
            >
              "{selectedText}"
            </span>
            {selectedText.length > 70 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-helper-text-sm color-text-secondary hover:underline"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        </div>
        {comment && (
          <div>
            <span className="text-body-sm">{comment}</span>
          </div>
        )}
      </div>
      {replies && renderReplies()}
    </div>
  );
};
