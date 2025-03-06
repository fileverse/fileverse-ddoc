/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  cn,
  DynamicDropdown,
  IconButton,
  LucideIcon,
  TextAreaFieldV2,
  Tooltip,
} from '@fileverse/ui';
import uuid from 'react-uuid';
import { CommentCard } from './comment-card';
import { CommentDropdownProps } from './types';
import { useComments } from './context/comment-context';

export const CommentDropdown = ({
  activeCommentId,
  initialComment = '',
  isBubbleMenu = false,
  selectedContent,
  isDisabled,
  isCommentOwner,
}: CommentDropdownProps) => {
  const [comment, setComment] = useState(initialComment);
  const [reply, setReply] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(true);
  const [showReplyView, setShowReplyView] = useState(!!activeCommentId);
  const commentsContainerRef = useRef<HTMLDivElement>(null);

  const {
    addComment,
    comments,
    activeComments,
    username,
    activeComment,
    selectedText,
    dropdownRef,
    handleInput,
    isCommentActive,
    // onNextComment,
    // onPrevComment,
    // activeCommentIndex,
    onCommentReply,
    resolveComment,
    unresolveComment,
    deleteComment,
    isDDocOwner,
    onComment,
    isConnected,
    setCommentDrawerOpen,
  } = useComments();

  const emptyComment =
    !activeComment?.content &&
    !activeComment?.username &&
    !activeComment?.createdAt;

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setComment(value);
    if (!value) {
      e.target.style.height = '40px';
    }
  };

  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setReply(value);
  };

  const handleClick = () => {
    if (comment.trim() && username) {
      addComment(comment);
      setShowReplyView(true);
      onComment?.();
    }
  };

  const handleReplySubmit = () => {
    if (!isConnected) {
      setCommentDrawerOpen(true);
      return;
    }

    const newReply = {
      id: `reply-${uuid()}`,
      username: username!,
      content: reply,
      replies: [],
      createdAt: new Date(),
      selectedContent: selectedContent,
    };

    if (reply.trim() && activeCommentId) {
      onCommentReply?.(activeCommentId, newReply);
      setReply('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!showReplyView && isBubbleMenu) {
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
    deleteComment(activeCommentId as string);
  };

  useEffect(() => {
    if (activeCommentId) {
      if (activeComment) {
        setComment(activeComment.content || '');
      } else {
        setShowReplyView(false);
      }
    }
  }, [activeComment, activeCommentId, comments]);

  useEffect(() => {
    if (commentsContainerRef.current && activeComment?.replies) {
      commentsContainerRef.current.scrollTo({
        top: commentsContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [activeComment?.replies]);

  useEffect(() => {
    if (isConnected && reply.trim()) {
      handleReplySubmit();
    }
  }, [isConnected]);

  const renderInitialView = () => (
    <div className="p-3 flex flex-col gap-2 color-bg-secondary rounded-md">
      <TextAreaFieldV2
        value={comment}
        onChange={handleCommentChange}
        onKeyDown={handleKeyDown}
        className="color-bg-default w-full text-body-sm color-text-default min-h-[40px] max-h-[96px] overflow-y-auto no-scrollbar px-3 py-2 whitespace-pre-wrap"
        placeholder="Type your comment"
        autoFocus
        onInput={(e) => handleInput(e, comment)}
      />

      <div className="h-full flex items-center justify-end">
        <Button
          onClick={handleClick}
          disabled={!username}
          className="px-4 py-2 w-20 min-w-20 h-9 font-medium text-sm"
        >
          Send
        </Button>
      </div>
    </div>
  );

  const renderReplyView = () => (
    <>
      <div className="flex justify-between items-center px-3 py-2 border-b color-border-default">
        <p className="text-sm font-medium color-text-default">
          Highlighted Comments ({activeComments.length})
        </p>
        <div className="relative flex items-center gap-1">
          {/* <IconButton
            icon="ChevronLeft"
            variant="ghost"
            onClick={onPrevComment}
            disabled={activeCommentIndex <= 0}
            className="disabled:!bg-transparent"
          />
          <IconButton
            icon="ChevronRight"
            variant="ghost"
            onClick={onNextComment}
            disabled={activeCommentIndex >= activeComments.length - 1}
            className="disabled:!bg-transparent"
          /> */}
          {(isDDocOwner || isCommentOwner) && !emptyComment && (
            <Tooltip
              text={isDisabled ? 'Available in a moment' : ''}
              sideOffset={0}
              position="top"
            >
              <DynamicDropdown
                key="more-actions"
                align="end"
                sideOffset={4}
                anchorTrigger={
                  <IconButton
                    onClick={handleEllipsisClick}
                    icon={'Ellipsis'}
                    variant="ghost"
                    disabled={isDisabled}
                    className={cn({
                      '!bg-transparent': isDisabled,
                    })}
                  />
                }
                content={
                  isDropdownOpen ? (
                    <div className="flex flex-col gap-1 p-2 w-40 shadow-elevation-3">
                      <button
                        className="flex items-center color-text-danger text-sm font-medium gap-2 rounded p-2 transition-all hover:color-bg-default-hover w-full"
                        onClick={handleDeleteThread}
                        onTouchEnd={handleDeleteThread}
                      >
                        <LucideIcon name="Trash2" size="sm" />
                        Delete thread
                      </button>
                    </div>
                  ) : null
                }
              />

              <Tooltip
                text={
                  !isDisabled
                    ? activeComment?.resolved
                      ? 'Unresolve'
                      : 'Resolve'
                    : ''
                }
                sideOffset={5}
                position="bottom"
              >
                <IconButton
                  icon={
                    activeComment?.resolved ? 'CircleCheck2' : 'CircleCheck'
                  }
                  variant="ghost"
                  disabled={isDisabled}
                  className={cn({
                    '!bg-transparent': isDisabled,
                  })}
                  onClick={() =>
                    activeComment?.resolved
                      ? unresolveComment(activeCommentId as string)
                      : resolveComment(activeCommentId as string)
                  }
                />
              </Tooltip>
            </Tooltip>
          )}
        </div>
      </div>

      <div
        ref={commentsContainerRef}
        className="max-h-[224px] overflow-y-auto no-scrollbar"
      >
        <CommentCard
          username={activeComment?.username}
          selectedContent={activeComment?.selectedContent || selectedText}
          comment={activeComment?.content || comment}
          createdAt={activeComment?.createdAt}
          replies={activeComment?.replies}
          isResolved={activeComment?.resolved}
          isDropdown
          isDisabled={
            activeComment && !Object.hasOwn(activeComment, 'commentIndex')
          }
          version={activeComment?.version}
          emptyComment={emptyComment}
        />
      </div>

      <div className="color-bg-secondary border-t color-border-default p-3 rounded-b">
        <TextAreaFieldV2
          value={reply}
          onChange={handleReplyChange}
          onKeyDown={handleKeyDown}
          className="color-bg-default text-body-sm color-text-default min-h-[40px] max-h-[96px] overflow-y-auto no-scrollbar px-3 py-2 whitespace-pre-wrap"
          placeholder={isDisabled ? 'Available in a moment' : 'Reply'}
          autoFocus
          disabled={activeComment?.resolved || isDisabled || emptyComment}
          onInput={(e) => handleInput(e, reply)}
        />

        <div className="h-full flex justify-end pt-2">
          <Button
            onClick={handleReplySubmit}
            className="px-4 py-2 w-20 min-w-20 h-9"
            disabled={activeComment?.resolved || !reply.trim()}
          >
            Send
          </Button>
        </div>
      </div>
    </>
  );

  const renderDropdownWrapper = (children: React.ReactNode) => (
    <div
      ref={dropdownRef}
      className="w-[300px] color-bg-default shadow-elevation-4 md:shadow-none rounded-md select-text"
    >
      {children}
    </div>
  );

  if (isBubbleMenu) {
    return isCommentActive ? renderDropdownWrapper(renderReplyView()) : null;
  }

  return !isCommentActive ? renderDropdownWrapper(renderInitialView()) : null;
};
