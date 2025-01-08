import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  DynamicDropdown,
  IconButton,
  LucideIcon,
  TextAreaFieldV2,
  Tooltip,
} from '@fileverse/ui';
import uuid from 'react-uuid';
import { CommentCard } from './comment-card';
import { useResponsive } from '../../utils/responsive';
import { useCommentActions } from './use-comment-actions';
import { CommentDropdownProps } from './types';

export const CommentDropdown = ({
  editor,
  selectedText,
  onSubmit,
  onClose,
  elementRef,
  setComments,
  comments = [],
  username,
  walletAddress,
  activeCommentId,
  setCommentDrawerOpen,
  initialComment = '',
}: CommentDropdownProps) => {
  const [comment, setComment] = useState(initialComment);
  const [reply, setReply] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(true);
  const [showReplyView, setShowReplyView] = useState(!!activeCommentId);
  const { isBelow1280px } = useResponsive();
  const commentsContainerRef = useRef<HTMLDivElement>(null);

  const activeComment = comments.find(
    (comment) => comment.id === activeCommentId,
  );

  const { handleResolveComment, handleUnresolveComment, handleDeleteComment } =
    useCommentActions({
      editor,
      comments,
      setComments: setComments ?? (() => { }),
    });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
  };

  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReply(e.target.value);
  };

  const handleClick = () => {
    if (comment.trim()) {
      onSubmit(comment);
      setShowReplyView(true);
      !isBelow1280px && setCommentDrawerOpen?.(true);
    }
  };

  const handleReplySubmit = () => {
    if (reply.trim() && activeCommentId) {
      const updatedComments = comments.map((comment) => {
        if (comment.id === activeCommentId) {
          return {
            ...comment,
            replies: [
              ...comment.replies,
              {
                id: `reply-${uuid()}`,
                content: reply,
                replies: [],
                createdAt: new Date(),
                selectedContent: selectedText,
              },
            ],
          };
        }
        return comment;
      });

      !isBelow1280px && setCommentDrawerOpen?.(true);
      setComments?.(updatedComments);
      setReply('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showReplyView) {
        handleReplySubmit();
      } else {
        handleClick();
      }
    }
  };

  const handleEllipsisClick = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const handleDeleteThread = () => {
    handleDeleteComment(activeCommentId as string);
    setIsDropdownOpen(false);
    onClose();
  };

  useEffect(() => {
    if (activeCommentId) {
      const activeComment = comments.find(
        (comment) => comment.id === activeCommentId,
      );
      if (activeComment) {
        setComment(activeComment.content);
      } else {
        setShowReplyView(false);
      }
    }
  }, [activeCommentId, comments]);

  useEffect(() => {
    if (commentsContainerRef.current && activeComment?.replies) {
      commentsContainerRef.current.scrollTo({
        top: commentsContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [activeComment?.replies]);

  const renderInitialView = () => (
    <div className="p-3 border-b border-[#E8EBEC] flex flex-col gap-2">
      <TextAreaFieldV2
        value={comment}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className="bg-white w-[296px] text-body-sm color-text-secondary min-h-[44px] max-h-[196px] pt-2 overflow-y-auto no-scrollbar"
        placeholder="Type your comment"
        autoFocus
      />

      <div className="h-full flex items-center justify-end">
        <Button
          onClick={handleClick}
          className="px-4 py-2 w-20 min-w-20 h-9 font-medium text-sm bg-black rounded"
        >
          Send
        </Button>
      </div>
    </div>
  );

  const renderReplyView = () => (
    <>
      <div className="flex justify-between items-center px-3 py-2 border-b border-[#E8EBEC]">
        <p className="text-sm font-medium color-text-default">Comments</p>
        <div className="relative flex items-center gap-2">
          <DynamicDropdown
            key="more-actions"
            align="end"
            sideOffset={4}
            anchorTrigger={
              <IconButton
                onClick={handleEllipsisClick}
                icon={'Ellipsis'}
                variant="ghost"
              />
            }
            content={
              isDropdownOpen ? (
                <div className="flex flex-col gap-1 p-2 w-40 shadow-elevation-3">
                  <button
                    className="flex items-center text-[#FB3449] text-sm font-medium gap-2 rounded p-2 transition-all hover:bg-[#FFF1F2] w-full"
                    onClick={handleDeleteThread}
                    onTouchEnd={handleDeleteThread}
                  >
                    <LucideIcon name="Trash2" size="sm" stroke="#FB3449" />
                    Delete thread
                  </button>
                </div>
              ) : null
            }
          />

          <Tooltip
            text={activeComment?.resolved ? 'Unresolve' : 'Resolve'}
            sideOffset={5}
            position="bottom"
          >
            <IconButton
              icon={activeComment?.resolved ? 'CircleCheck2' : 'CircleCheck'}
              variant="ghost"
              onClick={() =>
                activeComment?.resolved
                  ? handleUnresolveComment(activeCommentId as string)
                  : handleResolveComment(activeCommentId as string)
              }
            />
          </Tooltip>
        </div>
      </div>

      <div
        ref={commentsContainerRef}
        className="max-h-[224px] overflow-y-auto no-scrollbar"
      >
        <CommentCard
          username={username}
          walletAddress={walletAddress}
          selectedText={selectedText}
          comment={comment}
          replies={activeComment?.replies}
          isResolved={activeComment?.resolved}
          isDropdown
        />
      </div>

      <div className="color-bg-secondary border-t color-border-default p-3 rounded-b">
        <TextAreaFieldV2
          value={reply}
          onChange={handleReplyChange}
          onKeyDown={handleKeyDown}
          className="bg-white w-[296px] text-body-sm color-text-secondary min-h-[44px] max-h-[196px] overflow-y-auto no-scrollbar px-3 py-2 disabled:!border-none"
          placeholder="Reply"
          autoFocus
          disabled={activeComment?.resolved}
        />

        <div className="h-full flex justify-end pt-2">
          <Button
            onClick={handleReplySubmit}
            className="px-4 py-2 w-20 min-w-20 h-9"
            disabled={activeComment?.resolved}
          >
            Send
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div
      ref={elementRef}
      className="w-[300px] color-bg-default shadow-elevation-4 md:shadow-none rounded-md"
    >
      {showReplyView ? renderReplyView() : renderInitialView()}
    </div>
  );
};
