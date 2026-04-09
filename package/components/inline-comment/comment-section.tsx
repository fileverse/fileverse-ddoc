/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { cn, LucideIcon, Button } from '@fileverse/ui';
import { CommentCard } from './comment-card';
import { useCommentStore } from '../../stores/comment-store';
import { useCommentRefs } from '../../stores/comment-store-provider';
import { CommentSectionProps } from './types';
import { CommentUsername } from './comment-username';
import React, { useEffect, useState } from 'react';
import { EmptyComments } from './empty-comments';
import { CommentReplyInput } from './comment-reply-input';
import { CommentNewCommentInput } from './comment-compose-input';
import { DeleteConfirmOverlay } from './delete-confirm-overlay';
import { IComment } from '../../extensions/comment';
import { DEFAULT_TAB_ID, DEFAULT_TAB_NAME } from '../tabs/utils/tab-utils';
import { useResponsive } from '../../utils/responsive';

export const CommentSection = ({
  activeCommentId,
  isNavbarVisible,
  isPresentationMode,
  isMobile,
  comments: commentsProp,
  commentType = 'active',
  tabNameById,
  selectedTabLabel,
  showNewCommentInput = true,
  onCommentFocus,
  onReset,
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
  const { isBelow1280px } = useResponsive();
  const isCommentMobileFocused = isMobile && Boolean(openReplyId);
  const [reOpenLabelCommentId, setReOpenLabelCommentId] = useState<
    string | null
  >(null);
  const [resolvedToastCommentId, setResolvedToastCommentId] = useState<
    string | null
  >(null);

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
            showReOpenLabel={reOpenLabelCommentId === comment.id}
            username={username}
            isDDocOwner={isDDocOwner}
            openReplyId={openReplyId}
            replySectionRef={replySectionRef}
            onCommentClick={handleCommentClick}
            onResolve={(commentId) => {
              if (isCommentMobileFocused && openReplyId === commentId) {
                setReOpenLabelCommentId(commentId);
              }

              if (isBelow1280px) {
                setResolvedToastCommentId(commentId);
              }

              resolveComment(commentId);
            }}
            onUnresolve={unresolveComment}
            onDelete={handleDeleteComment}
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

  const handleDeleteComment = (commentId: string) => {
    if (isMobile && openReplyId === commentId) {
      const currentIndex = filteredComments.findIndex(
        (comment) => comment.id === commentId,
      );
      const remainingComments = filteredComments.filter(
        (comment) => comment.id !== commentId,
      );
      const nextFocusedComment =
        currentIndex >= 0
          ? remainingComments[
              Math.min(currentIndex, remainingComments.length - 1)
            ]
          : remainingComments[0];

      // Delete-only behavior: stay in mobile thread mode by hopping to the next
      // remaining comment. Resolve/unresolve intentionally keep the current
      // `openReplyId` so the focused thread stays open.
      setOpenReplyId(nextFocusedComment?.id ?? null);

      if (nextFocusedComment) {
        handleCommentClick(nextFocusedComment);
      }
    }

    deleteComment(commentId);
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

  useEffect(() => {
    setReOpenLabelCommentId(null);
  }, [isCommentMobileFocused]);

  useEffect(() => {
    if (!isBelow1280px || !resolvedToastCommentId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setResolvedToastCommentId(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [isBelow1280px, resolvedToastCommentId]);

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
        (!isMobile || !showNewCommentInput) && 'flex flex-col',
        !isMobile &&
          'h-[100dvh] sm:h-[calc(100vh-40px)] xl:h-[calc(100vh-310px)] !color-bg-default !rounded-b-lg',
        isMobile && !showNewCommentInput && 'h-full',
        showNewCommentInput ? 'pb-[3rem] sm:pb-0' : 'pb-0',
        !isNavbarVisible && 'xl:!h-[calc(100vh-150px)]',
        isPresentationMode && 'xl:!h-[86vh]',
      )}
    >
      <div
        className={cn(
          !isBelow1280px && 'px-4',
          ' w-full overflow-y-auto h-full',
        )}
      >
        {filteredComments.length === 0 ? (
          <EmptyComments commentType={commentType} handleReset={onReset} />
        ) : (
          <div
            ref={commentsSectionRef}
            className="flex flex-col overflow-y-auto flex-1"
          >
            {commentType === 'all' ? (
              <>
                {renderCommentList(
                  activeComments,
                  !isCommentMobileFocused && 'Active',
                )}
                <div
                  className={cn(
                    activeComments.length > 0 &&
                      !isCommentMobileFocused &&
                      'mt-[16px]',
                  )}
                />
                {renderCommentList(
                  resolvedComments,
                  !isCommentMobileFocused && 'Resolved',
                )}
              </>
            ) : (
              renderCommentList(filteredComments)
            )}
          </div>
        )}
      </div>

      {showNewCommentInput && <CommentNewCommentInput />}
      {isBelow1280px && resolvedToastCommentId && (
        <MobileResolvedCommentToast
          onUndo={() => {
            unresolveComment(resolvedToastCommentId);
            setResolvedToastCommentId(null);
          }}
        />
      )}
    </div>
  );
};

const SidebarCommentItem = ({
  comment,
  tabName,
  activeCommentId,
  isCommentMobileFocused,
  showReOpenLabel,
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
  showReOpenLabel: boolean;
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
  const { isBelow1280px } = useResponsive();

  const handleSidebarCommentClick = () => {
    // Keep drawer thread-open state owned by the list item. CommentCard stays
    // presentational so selection does not get written twice through bubbling.
    if (comment.resolved && !isBelow1280px) {
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
        showReOpenLabel && comment.resolved
          ? 'color-bg-default border color-border-default'
          : isCommentMobileFocused &&
              comment.resolved &&
              'color-bg-default-hover',
      )}
      onClick={handleSidebarCommentClick}
    >
      {showReOpenLabel && comment.resolved && (
        <div className="w-full px-[16px] py-[8px] rounded-b-[4px] rounded-t-[12px] items-center flex justify-between color-bg-secondary">
          <p className="color-text-secondary text-body-sm">Resolved comment</p>
          <Button
            onClick={() => onUnresolve(comment.id as string)}
            variant={'ghost'}
            className="flex w-[104px] gap-[8px]"
          >
            <LucideIcon className="w-[16px] h-[16px]" name={'RefreshCw'} />
            <p className="text-body-sm-bold">Re-open</p>
          </Button>
        </div>
      )}
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

const MobileResolvedCommentToast = ({ onUndo }: { onUndo: () => void }) => {
  return (
    <div className="fixed bottom-4 left-0 right-0 z-[999999] flex items-center justify-center">
      <div className="flex h-[46px] items-center space-x-sm rounded-[8px] border color-button-default color-border-default">
        <div className="mr-[8px] flex gap-[8px] pl-[12px]">
          <LucideIcon
            name={'Check'}
            stroke="#FFFFFF"
            className="h-[18px] w-[18px]"
          />
          <p className="text-heading-xsm text-white">Comment resolved</p>
        </div>
        <div className="mx-[4px] h-[16px] border-l border-[#404040]" />
        <Button
          onClick={onUndo}
          className="!min-w-[51px] w-[51px] gap-xsm color-text-default text-body-sm-bold"
        >
          <p className="text-body-sm-bold">Undo</p>
        </Button>
      </div>
    </div>
  );
};
