import React, { useState, useEffect, SetStateAction } from 'react';
import {
  Button,
  DynamicDropdown,
  IconButton,
  LucideIcon,
  TextAreaFieldV2,
  Tooltip,
} from '@fileverse/ui';
import { useMediaQuery } from 'usehooks-ts';
import uuid from 'react-uuid';
import { IComment } from '../extensions/comment';
import { CommentCard } from './comment-card';

interface CommentDropdownProps {
  selectedText: string;
  onSubmit: (commentId: string) => void;
  onClose: () => void;
  elementRef: React.RefObject<HTMLDivElement>;
  setComments?: (comments: IComment[]) => void;
  comments?: IComment[];
  username?: string;
  walletAddress?: string;
  activeCommentId?: string;
  unsetComment?: () => void;
  inlineCommentOpen?: boolean;
  setInlineCommentOpen?: React.Dispatch<SetStateAction<boolean>>;
}

export const CommentDropdown = ({
  selectedText,
  onSubmit,
  onClose,
  elementRef,
  setComments,
  comments = [],
  username,
  walletAddress,
  activeCommentId,
  unsetComment,
  inlineCommentOpen,
  setInlineCommentOpen,
}: CommentDropdownProps) => {
  const [comment, setComment] = useState('');
  const [reply, setReply] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(true);
  const [showReplyView, setShowReplyView] = useState(!!activeCommentId);
  const isMobile = useMediaQuery('(max-width: 1023px)');

  useEffect(() => {
    if (activeCommentId) {
      const activeComment = comments.find((c) => c.id === activeCommentId);
      if (activeComment) {
        setComment(activeComment.content);
        setShowReplyView(true);
      }
    }
  }, [activeCommentId, comments]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
  };

  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReply(e.target.value);
  };

  const handleClick = () => {
    if (comment.trim()) {
      const newComment = {
        id: `comment-${uuid()}`,
        content: comment,
        selectedContent: selectedText,
        replies: [],
        createdAt: new Date(),
      };

      setComments?.([...comments, newComment]);
      onSubmit(newComment.id);
      setShowReplyView(true);
      setComment('');
    }
  };

  const handleReplySubmit = () => {
    if (reply.trim()) {
      const updatedComments = comments.map((comment) => {
        if (comment.id === comments[comments.length - 1].id) {
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

      setInlineCommentOpen?.(true);
      setComments?.(updatedComments);
      setReply('');
      onClose();
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

  const renderInitialView = () => (
    <div className="p-2 border-b border-[#E8EBEC] flex flex-col gap-2">
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
                    onClick={() => {
                      unsetComment?.();
                      setIsDropdownOpen(false);
                      onClose();
                    }}
                  >
                    <LucideIcon name="Trash2" size="sm" stroke="#FB3449" />
                    Delete thread
                  </button>
                </div>
              ) : null
            }
          />

          <Tooltip text="Resolve" sideOffset={5} position="bottom">
            <IconButton icon="CircleCheck" variant="ghost" />
          </Tooltip>
        </div>
      </div>

      <CommentCard
        username={username}
        walletAddress={walletAddress}
        selectedText={selectedText}
        comment={comment}
      />

      <div className="color-bg-secondary border-t color-border-default p-3 rounded-b">
        <TextAreaFieldV2
          value={reply}
          onChange={handleReplyChange}
          onKeyDown={handleKeyDown}
          className="bg-white w-[296px] text-body-sm color-text-secondary min-h-[44px] max-h-[196px] overflow-y-auto no-scrollbar px-3 py-2"
          placeholder="Reply"
        />

        <div className="h-full flex justify-end pt-2">
          <Button
            onClick={handleReplySubmit}
            className="px-4 py-2 w-20 min-w-20 h-9"
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
      className="w-[300px] color-bg-default shadow-elevation-1 rounded-md"
    >
      {showReplyView ? renderReplyView() : renderInitialView()}
    </div>
  );
};
