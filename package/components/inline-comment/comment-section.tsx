/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { Button, LucideIcon, cn } from '@fileverse/ui';
import { CommentCard } from './comment-card';
import { useCommentStore } from '../../stores/comment-store';
import { useCommentRefs } from '../../stores/comment-store-provider';
import { CommentSectionProps } from './types';
import { CommentUsername } from './comment-username';
import { useEffect } from 'react';
import { EmptyComments } from './empty-comments';
import { CommentReplyInput } from './comment-reply-input';
import { CommentComposeInput } from './comment-compose-input';

export const CommentSection = ({
  activeCommentId,
  isNavbarVisible,
  isPresentationMode,
}: CommentSectionProps) => {
  const comments = useCommentStore((s) => s.tabComments);
  const username = useCommentStore((s) => s.username);
  const setUsername = useCommentStore((s) => s.setUsername);
  const focusCommentInEditor = useCommentStore((s) => s.focusCommentInEditor);
  const setOpenReplyId = useCommentStore((s) => s.setOpenReplyId);
  const openReplyId = useCommentStore((s) => s.openReplyId);
  const showResolved = useCommentStore((s) => s.showResolved);
  const resolveComment = useCommentStore((s) => s.resolveComment);
  const unresolveComment = useCommentStore((s) => s.unresolveComment);
  const deleteComment = useCommentStore((s) => s.deleteComment);
  const isConnected = useCommentStore((s) => s.isConnected);
  const connectViaWallet = useCommentStore((s) => s.connectViaWallet);
  const isLoading = useCommentStore((s) => s.isLoading);
  const connectViaUsername = useCommentStore((s) => s.connectViaUsername);
  const isDDocOwner = useCommentStore((s) => s.isDDocOwner);
  const { commentsSectionRef, replySectionRef } = useCommentRefs();

  const _filteredComments = comments.filter((comment) => !comment.deleted);

  const filteredComments = _filteredComments
    .filter((comment) => (showResolved ? true : !comment.resolved))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const handleCommentClick = (commentId: string) => {
    focusCommentInEditor(commentId);
    if (openReplyId && openReplyId !== commentId) {
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
        'flex flex-col h-[100dvh] sm:h-[calc(100vh-40px)] xl:h-[calc(100vh-210px)] !color-bg-default !rounded-b-lg',
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
          {filteredComments.map((comment) => (
            <div
              key={comment.id}
              data-comment-id={comment.id}
              className={cn(
                'flex flex-col w-full box-border transition-all border-b color-border-default hover:color-bg-default-hover last:border-b-0 py-3',
                comment.id === activeCommentId && 'color-bg-default-selected',
                comment.replies?.length > 0 && 'gap-0',
              )}
              onClick={() => handleCommentClick(comment.id as string)}
            >
              <CommentCard
                id={comment.id}
                activeCommentId={activeCommentId as string}
                username={comment.username}
                selectedContent={comment.selectedContent}
                createdAt={comment.createdAt}
                comment={comment.content}
                replies={comment.replies}
                onResolve={resolveComment}
                onUnresolve={unresolveComment}
                onDelete={deleteComment}
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
                className={cn(
                  'pr-6 pl-8 flex flex-col gap-2',
                  openReplyId === comment.id && 'ml-5 pl-4',
                  comment.resolved && 'hidden',
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {openReplyId !== comment.id ? (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenReplyId(comment.id as string);
                    }}
                    className={cn(
                      'w-full flex items-center justify-start gap-2 mt-3 hover:!bg-transparent pl-6',
                      comment.replies?.length === 0 && 'hidden',
                    )}
                    variant="ghost"
                  >
                    <LucideIcon
                      name="MessageSquarePlus"
                      className="color-text-secondary"
                      size="sm"
                    />
                    <span className="text-xs font-medium">
                      Reply to this thread
                    </span>
                  </Button>
                ) : (
                  <CommentReplyInput
                    commentId={comment.id as string}
                    commentUsername={comment.username}
                    replyCount={comment.replies?.length ?? 0}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <CommentComposeInput />
    </div>
  );
};
