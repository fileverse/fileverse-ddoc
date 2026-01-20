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
  TextField,
  Tooltip,
  Divider,
} from '@fileverse/ui';
import uuid from 'react-uuid';
import { CommentCard } from './comment-card';
import { CommentDropdownProps } from './types';
import { useComments } from './context/comment-context';
import EnsLogo from '../../assets/ens.svg';

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
  const [hideCommentDropdown, setHideCommentDropdown] = useState(false);

  const {
    inlineCommentData,
    setInlineCommentData,
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
    isLoading,
    connectViaUsername,
    connectViaWallet,
    setUsername,
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

  const handleClick = async () => {
    // First check if user is connected and has username
    if (!isConnected || !username) {
      // Store the comment text temporarily
      const pendingComment = comment.trim();

      // Open auth drawer
      setCommentDrawerOpen(true);

      // Store the pending comment data for after auth
      setInlineCommentData((prev) => ({
        ...prev,
        inlineCommentText: pendingComment,
        handleClick: true,
      }));

      setHideCommentDropdown(true);
      return;
    }

    // If we reach here, user is authenticated
    if (comment.trim()) {
      addComment(comment, username);
      setShowReplyView(true);
      onComment?.();
      // Clear the comment after adding
      setComment('');
      setHideCommentDropdown(true); // Hide the dropdown after sending
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
    if (
      isConnected &&
      username &&
      inlineCommentData.handleClick &&
      inlineCommentData.inlineCommentText
    ) {
      // Clear the stored comment data without adding a new comment
      setInlineCommentData((prev) => ({
        ...prev,
        inlineCommentText: '',
        handleClick: false,
      }));

      // Add the comment only if it wasn't already added
      if (!hideCommentDropdown) {
        addComment(inlineCommentData.inlineCommentText, username);
        setShowReplyView(true);
        onComment?.();
      }

      setComment('');
      setHideCommentDropdown(true);
    }
  }, [
    isConnected,
    username,
    inlineCommentData.handleClick,
    inlineCommentData.inlineCommentText,
  ]);

  const renderAuthView = () => (
    <div className="flex flex-col color-bg-secondary rounded-md">
      <p className="inline-flex gap-2 border-b color-border-default text-heading-xsm p-3">
        What would you like to be identified with
      </p>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex flex-col gap-3">
          <TextField
            type="text"
            value={username!}
            onChange={(e) => setUsername?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && username) {
                connectViaUsername?.(username);
                setInlineCommentData((prev) => ({
                  ...prev,
                  handleClick: true,
                }));
              }
            }}
            className="font-normal"
            placeholder="Enter a name"
          />
          <Button
            onClick={() => {
              connectViaUsername?.(username!);
              setInlineCommentData((prev) => ({
                ...prev,
                handleClick: true,
              }));
            }}
            disabled={!username || isLoading}
            isLoading={isLoading}
            className="w-full"
          >
            Join
          </Button>
        </div>

        <div className="text-[12px] text-gray-400 flex items-center my-3">
          <Divider
            direction="horizontal"
            size="md"
            className="flex-grow md:!mr-4"
          />
          or join with your&nbsp;
          <span className="font-semibold">.eth&nbsp;</span> domain
          <Divider
            direction="horizontal"
            size="md"
            className="flex-grow md:!ml-4"
          />
        </div>

        <div className="text-center">
          <Button
            onClick={
              !isConnected &&
              (() => {
                connectViaWallet();
                setInlineCommentData((prev) => ({
                  ...prev,
                  handleClick: true,
                }));
              })
            }
            disabled={isLoading}
            className="custom-ens-button"
          >
            <img alt="ens-logo" src={EnsLogo} />{' '}
            {isLoading ? 'Connecting with ENS ...' : 'Continue with ENS'}
          </Button>
        </div>
      </div>
    </div>
  );

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
          className="px-4 py-2 w-20 min-w-20 h-9 font-medium text-sm"
          disabled={!comment.trim()}
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
                    <div
                      className="flex flex-col gap-1 p-2 w-40 shadow-elevation-3"
                      data-inline-comment-actions-menu
                    >
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
