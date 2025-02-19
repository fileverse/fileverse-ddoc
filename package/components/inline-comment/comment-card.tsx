import {
  Avatar,
  ButtonGroup,
  cn,
  DynamicDropdown,
  EmojiClickData,
  IconButton,
  LucideIcon,
  Skeleton,
  Tooltip,
} from '@fileverse/ui';
import { useRef, useState, useEffect, useCallback } from 'react';
import { CommentCardProps, CommentReplyProps, UserDisplayProps } from './types';
import { useComments, useEnsName } from './context/comment-context';
import EnsLogo from '../../assets/ens.svg';
import verifiedMark from '../../assets/verified-mark.png';
import {
  dateFormatter,
  nameFormatter,
  renderTextWithLinks,
} from '../../utils/helpers';
import { Spinner } from '../../common/spinner';
import { CommentReactions } from './comment-reactions';

const UserDisplay = ({ ensStatus, createdAt }: UserDisplayProps) => {
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

const CommentReply = ({
  reply,
  username,
  createdAt,
  isLast,
}: CommentReplyProps) => {
  const ensStatus = useEnsName(username);

  return (
    <div className="flex flex-col gap-2 relative pl-4 pb-3 last:pb-0">
      <div
        className={cn('absolute left-0 top-0 h-full w-[1px] bg-[#E8EBEC]', {
          hidden: isLast,
        })}
      />
      <div className="absolute left-0 top-0 w-4">
        <div className="w-[10px] h-[20px] border-l border-b rounded-bl-md color-border-default" />
      </div>
      {ensStatus.isLoading ? (
        <UserDisplaySkeleton />
      ) : (
        <UserDisplay ensStatus={ensStatus} createdAt={createdAt} />
      )}
      <span className="text-body-sm flex flex-col gap-2 ml-3 pl-4 border-l whitespace-pre-wrap break-words">
        {renderTextWithLinks(reply)}
      </span>
    </div>
  );
};

const renderReactions = (
  reactions: {
    type: EmojiClickData;
    users: string[];
    count: number;
  }[],
  username: string,
  id: string,
  handleAddReaction: (id: string, emoji: EmojiClickData) => void,
  handleRemoveReaction: (id: string, emoji: EmojiClickData) => void,
) => {
  return reactions
    ?.reduce(
      (acc, reaction) => {
        const existing = acc.find((r) => r.type.emoji === reaction.type.emoji);
        if (existing) {
          existing.count++;
          return acc;
        }
        return [...acc, { type: reaction.type, count: 1 }];
      },
      [] as { type: EmojiClickData; count: number }[],
    )
    .map((reaction, index) => {
      const hasReacted = reactions.some(
        (r) =>
          r.type.emoji === reaction.type.emoji && r.users.includes(username!),
      );

      return (
        <span
          key={index}
          className="inline-flex items-center justify-center gap-1 color-bg-secondary color-border-default border rounded-full px-2 py-0.5 hover:color-bg-default-hover cursor-pointer transition-all text-helper-text-sm min-w-6"
          onClick={() => {
            if (hasReacted) {
              handleRemoveReaction(id, reaction.type);
            } else {
              handleAddReaction(id, reaction.type);
            }
          }}
        >
          {reaction.type.emoji}
          {reaction.count > 1 && (
            <span className="text-helper-text-sm">{reaction.count}</span>
          )}
        </span>
      );
    });
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
  isDisabled = false,
  isCommentOwner,
  version,
  emptyComment,
  reactions,
}: CommentCardProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const { setOpenReplyId, handleAddReaction, handleRemoveReaction } =
    useComments();
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

    let displayedReplies = replies.sort(
      (a, b) =>
        new Date(a.createdAt || new Date()).getTime() -
        new Date(b.createdAt || new Date()).getTime(),
    );
    if (!showAllReplies && replies.length > 3) {
      displayedReplies = replies.slice(-2);
    }

    return (
      <div className="flex flex-col gap-0 ml-3 relative">
        {replies.length > 3 && !showAllReplies && (
          <div
            onClick={() => setShowAllReplies(true)}
            className="text-helper-text-sm color-text-secondary hover:underline text-left pl-2 pb-3 border-l color-border-default cursor-pointer flex items-center gap-1"
          >
            <IconButton
              icon="ChevronDown"
              variant="ghost"
              size="sm"
              rounded
              className="color-text-secondary border color-border-default scale-[0.8]"
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
        <div className="flex flex-col gap-2 ml-3 pl-4 border-l color-border-default">
          <div className="flex items-center gap-2 color-text-secondary">
            <Spinner size="sm" />
            <p className="text-helper-text-sm">Syncing onchain comments</p>
          </div>
        </div>
      </div>
    );

  return (
    <div
      ref={commentsContainerRef}
      className={cn(
        'flex flex-col gap-0 px-3 group comment-card',
        isResolved && 'opacity-70',
        !isDropdown && '!px-6',
        isDropdown && 'py-3',
      )}
    >
      <div className="flex justify-between items-center">
        {ensStatus.isLoading ? (
          <UserDisplaySkeleton />
        ) : (
          <UserDisplay ensStatus={ensStatus} createdAt={createdAt} />
        )}
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

              <CommentReactions
                commentId={id as string}
                isDropdown={isDropdown}
              />

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
      <div className="flex flex-col gap-2 ml-3 pl-4 border-l color-border-default py-3">
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
              {renderTextWithLinks(comment)}
            </span>
            <div className="flex flex-wrap items-center gap-1 mt-2">
              {reactions &&
                renderReactions(
                  reactions,
                  username!,
                  id as string,
                  handleAddReaction,
                  handleRemoveReaction,
                )}
            </div>
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
      <Skeleton className="w-6 h-6 rounded-full" />
      <Skeleton className="w-32 h-4 rounded" />
    </div>
  );
};
