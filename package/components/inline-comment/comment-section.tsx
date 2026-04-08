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

export const CommentSection = ({
  activeCommentId,
  isNavbarVisible,
  isPresentationMode,
  isMobile,
  comments: commentsProp,
  sectionLabel = 'Comments',
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

  const handleCommentClick = (comment: IComment) => {
    if (!comment.id) {
      return;
    }

    if (onCommentFocus) {
      onCommentFocus(comment.id, comment.tabId);
    } else {
      focusCommentInEditor(comment.id);
    }

    if (openReplyId && openReplyId !== comment.id) {
      setOpenReplyId(null);
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
        !isMobile &&
          'flex flex-col h-[100dvh] sm:h-[calc(100vh-40px)] xl:h-[calc(100vh-310px)] !color-bg-default !rounded-b-lg',
        'pb-[3rem] sm:pb-0',
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
          <p className="text-body-sm-bold color-text-secondary">
            {sectionLabel} ({filteredComments.length})
          </p>
          {filteredComments.map((comment) => (
            <SidebarCommentItem
              key={comment.id}
              comment={comment}
              activeCommentId={activeCommentId}
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
        </div>
      )}
      <CommentComposeInput />
    </div>
  );
};

const SidebarCommentItem = ({
  comment,
  activeCommentId,
  username,
  isDDocOwner,
  openReplyId,
  replySectionRef,
  onCommentClick,
  onResolve,
  onUnresolve,
  onDelete,
}: {
  comment: IComment;
  activeCommentId: string | null;
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

  return (
    <div
      data-comment-id={comment.id}
      className={cn(
        'relative flex flex-col w-full mt-[8px] box-border transition-all color-border-default hover:color-bg-default-hover last:border-b-0 rounded-[12px]',
        comment.id === activeCommentId && 'color-bg-default-selected',
        comment.replies?.length > 0 && 'gap-0',
      )}
      onClick={() => onCommentClick(comment)}
    >
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
