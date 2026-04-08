/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { cn } from '@fileverse/ui';
import { CommentCard } from './comment-card';
import { useCommentStore } from '../../stores/comment-store';
import { useCommentRefs } from '../../stores/comment-store-provider';
import { CommentSectionProps } from './types';
import { CommentUsername } from './comment-username';
import React, { useEffect, useState } from 'react';
import { EmptyComments } from './empty-comments';
import { CommentReplyInput } from './comment-reply-input';
import { CommentComposeInput } from './comment-compose-input';
import { DeleteConfirmOverlay } from './delete-confirm-overlay';
import { IComment } from '../../extensions/comment';
import { DEFAULT_TAB_ID, DEFAULT_TAB_NAME } from '../tabs/utils/tab-utils';

export const CommentSection = ({
  activeCommentId,
  isNavbarVisible,
  isPresentationMode,
  isMobile,
  comments: commentsProp,
  commentType = 'active',
  tabNameById,
  selectedTabLabel,
  showComposeInput = true,
  onCommentFocus,
}: CommentSectionProps) => {
  const tabComments = useCommentStore((s) => s.tabComments);
  const username = useCommentStore((s) => s.username);
  const setUsername = useCommentStore((s) => s.setUsername);
  const focusCommentInEditor = useCommentStore((s) => s.focusCommentInEditor);
  const setOpenReplyId = useCommentStore((s) => s.setOpenReplyId);
  const openReplyId = useCommentStore((s) => s.openReplyId);
  const resolveComment = useCommentStore((s) => s.resolveComment);
  const unresolveComment = useCommentStore((s) => s.unresolveComment);
  const deleteComment = useCommentStore((s) => s.deleteComment);
  const isConnected = useCommentStore((s) => s.isConnected);
  const connectViaWallet = useCommentStore((s) => s.connectViaWallet);
  const isLoading = useCommentStore((s) => s.isLoading);
  const connectViaUsername = useCommentStore((s) => s.connectViaUsername);
  const isDDocOwner = useCommentStore((s) => s.isDDocOwner);
  const { commentsSectionRef, replySectionRef } = useCommentRefs();

  const filteredComments = (commentsProp ?? tabComments)
    .filter((comment) => !comment.deleted)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  const activeComments = filteredComments.filter(
    (comment) => !comment.resolved,
  );
  const resolvedComments = filteredComments.filter(
    (comment) => comment.resolved,
  );

  const getCommentTabName = (comment: IComment) =>
    tabNameById?.[comment.tabId || DEFAULT_TAB_ID] ??
    selectedTabLabel ??
    DEFAULT_TAB_NAME;

  const renderCommentList = (comments: IComment[], label?: string) => {
    if (comments.length === 0) {
      return null;
    }

    return (
      <>
        {label && (
          <p className="text-body-sm-bold color-text-secondary">
            {label} ({comments.length})
          </p>
        )}
        {comments.map((comment) => (
          <SidebarCommentItem
            key={comment.id}
            comment={comment}
            tabName={getCommentTabName(comment)}
            activeCommentId={activeCommentId}
            isCommentMobileFocused={Boolean(isMobile && openReplyId)}
            username={username}
            isDDocOwner={isDDocOwner}
            openReplyId={openReplyId}
            replySectionRef={replySectionRef}
            onCommentClick={handleCommentClick}
            onResolve={resolveComment}
            onUnresolve={unresolveComment}
            onDelete={deleteComment}
            onSetOpenReplyId={setOpenReplyId}
          />
        ))}
      </>
    );
  };

  const handleCommentClick = (comment: IComment) => {
    if (!comment.id) {
      return;
    }

    if (onCommentFocus) {
      onCommentFocus(comment.id, comment.tabId || DEFAULT_TAB_ID);
    } else {
      focusCommentInEditor(comment.id);
    }
  };

  useEffect(() => {
    if (commentsSectionRef.current) {
      if (activeCommentId) {
        const activeElement = commentsSectionRef.current.querySelector(
          `[data-comment-id="${activeCommentId}"]`,
        );

        if (activeElement) {
          setTimeout(() => {
            activeElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          });
        }
      }
    }
  }, [activeCommentId, commentsSectionRef]);

  if (!isConnected) {
    return (
      <CommentUsername
        connectViaWallet={connectViaWallet}
        username={username as string}
        setUsername={setUsername}
        isNavbarVisible={isNavbarVisible as boolean}
        connectViaUsername={connectViaUsername}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div
      data-testid="comment-section"
      className={cn(
        (!isMobile || !showComposeInput) && 'flex flex-col',
        !isMobile &&
          'h-[100dvh] sm:h-[calc(100vh-40px)] xl:h-[calc(100vh-310px)] !color-bg-default !rounded-b-lg',
        isMobile && !showComposeInput && 'h-full',
        showComposeInput ? 'pb-[3rem] sm:pb-0' : 'pb-0',
        !isNavbarVisible && 'xl:!h-[calc(100vh-150px)]',
        isPresentationMode && 'xl:!h-[86vh]',
      )}
    >
      {filteredComments.length === 0 ? (
        <EmptyComments />
      ) : (
        <div
          ref={commentsSectionRef}
          className="flex flex-col overflow-y-auto flex-1"
        >
          {commentType === 'all' ? (
            <>
              {renderCommentList(activeComments, 'Active')}
              <div className="mt-[16px]" />
              {renderCommentList(resolvedComments, 'Resolved')}
            </>
          ) : (
            renderCommentList(filteredComments)
          )}
        </div>
      )}
      {showComposeInput && <CommentComposeInput />}
    </div>
  );
};

const SidebarCommentItem = ({
  comment,
  tabName,
  activeCommentId,
  isCommentMobileFocused,
  username,
  isDDocOwner,
  openReplyId,
  replySectionRef,
  onCommentClick,
  onResolve,
  onUnresolve,
  onDelete,
  onSetOpenReplyId,
}: {
  comment: IComment;
  tabName: string;
  activeCommentId: string | null;
  isCommentMobileFocused: boolean;
  username: string | null;
  isDDocOwner: boolean;
  openReplyId: string | null;
  replySectionRef: React.RefObject<HTMLDivElement>;
  onCommentClick: (comment: IComment) => void;
  onResolve: (id: string) => void;
  onUnresolve: (id: string) => void;
  onDelete: (id: string) => void;
  onSetOpenReplyId: (id: string | null) => void;
}) => {
  const [isDeleteOverlayVisible, setIsDeleteOverlayVisible] = useState(false);

  const handleSidebarCommentClick = () => {
    if (comment.resolved) {
      onSetOpenReplyId(null);
    } else if (comment.id) {
      onSetOpenReplyId(comment.id);
    }

    onCommentClick(comment);
  };

  return (
    <div
      data-comment-id={comment.id}
      className={cn(
        'relative flex flex-col w-full mt-[8px] pb-[12px] box-border transition-all color-border-default rounded-[12px]',
        isCommentMobileFocused && openReplyId !== comment.id && 'hidden',
        comment.id === activeCommentId
          ? 'color-bg-default border'
          : 'hover:color-bg-default-hover ',
        comment.replies?.length > 0 && 'gap-0',
      )}
      onClick={handleSidebarCommentClick}
    >
      <p className="text-helper-text-sm px-[12px] pt-[12px] h-[26px] max-w-[270px] truncate color-text-secondary">
        {tabName}
      </p>
      <CommentCard
        id={comment.id}
        activeCommentId={activeCommentId as string}
        username={comment.username}
        selectedContent={comment.selectedContent}
        createdAt={comment.createdAt}
        comment={comment.content}
        replies={comment.replies}
        isCommentDrawerContext={true}
        onResolve={onResolve}
        onUnresolve={onUnresolve}
        onRequestDelete={() => setIsDeleteOverlayVisible(true)}
        isResolved={comment.resolved}
        isDisabled={comment && !Object.hasOwn(comment, 'commentIndex')}
        isCommentOwner={comment.username === username || isDDocOwner}
        version={comment.version}
        emptyComment={
          !comment.content && !comment.username && !comment.createdAt
        }
      />

      <div
        ref={replySectionRef}
        className={cn('flex flex-col gap-2', comment.resolved && 'hidden')}
        onClick={(e) => e.stopPropagation()}
      >
        {openReplyId === comment.id && (
          <CommentReplyInput
            commentId={comment.id as string}
            commentUsername={comment.username}
            replyCount={comment.replies?.length ?? 0}
          />
        )}
      </div>

      <DeleteConfirmOverlay
        isVisible={isDeleteOverlayVisible}
        title="Delete this comment?"
        onCancel={() => setIsDeleteOverlayVisible(false)}
        onConfirm={() => {
          setIsDeleteOverlayVisible(false);
          onDelete(comment.id as string);
        }}
      />
    </div>
  );
};
