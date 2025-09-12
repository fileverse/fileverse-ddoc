/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import {
  Avatar,
  ButtonGroup,
  LucideIcon,
  TextAreaFieldV2,
  Button,
  cn,
} from '@fileverse/ui';
import { CommentCard } from './comment-card';
import { useComments } from './context/comment-context';
import EnsLogo from '../../assets/ens.svg';
import verifiedMark from '../../assets/ens-check.svg';
import { nameFormatter } from '../../utils/helpers';
import { CommentSectionProps } from './types';
import { CommentUsername } from './comment-username';
import { useEffect, useState } from 'react';
import { EmptyComments } from './empty-comments';
import { useResponsive } from '../../utils/responsive';

export const CommentSection = ({
  activeCommentId,
  isNavbarVisible,
  isPresentationMode,
}: CommentSectionProps) => {
  const {
    comments,
    username,
    setUsername,
    focusCommentInEditor,
    handleReplyChange,
    handleCommentChange,
    handleCommentKeyDown,
    handleReplySubmit,
    setOpenReplyId,
    handleReplyKeyDown,
    openReplyId,
    showResolved,
    commentsSectionRef,
    replySectionRef,
    comment,
    reply,
    handleCommentSubmit,
    handleInput,
    resolveComment,
    unresolveComment,
    deleteComment,
    isConnected,
    connectViaWallet,
    isLoading,
    connectViaUsername,
    isDDocOwner,
    getEnsStatus,
    ensCache,
  } = useComments();
  const { isNativeMobile } = useResponsive();

  const _filteredComments = comments.filter((comment) => !comment.deleted);

  const filteredComments = _filteredComments
    .filter((comment) => (showResolved ? true : !comment.resolved))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const handleCommentClick = (commentId: string) => {
    focusCommentInEditor(commentId);
    // Close reply section if clicking on a different comment
    if (openReplyId && openReplyId !== commentId) {
      setOpenReplyId(null);
    }
  };

  const [ensStatus, setEnsStatus] = useState<EnsStatus>({
    name: username as string,
    isEns: false,
  });

  useEffect(() => {
    getEnsStatus(username as string, setEnsStatus);
  }, [username, ensCache]);

  useEffect(() => {
    if (commentsSectionRef.current) {
      // If there's an active comment, scroll to it
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
          className="flex flex-col overflow-y-auto no-scrollbar flex-1"
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
                  <div className="pl-4 animate-in fade-in-5 flex flex-col gap-2 duration-300 mt-3">
                    <TextAreaFieldV2
                      placeholder="Reply"
                      value={reply}
                      className={cn(
                        'color-bg-default text-body-sm color-text-default min-h-[40px] max-h-[96px] overflow-y-auto no-scrollbar px-3 py-2 whitespace-pre-wrap',
                        comment.id === activeCommentId && 'color-bg-default',
                      )}
                      id={comment.id}
                      onChange={handleReplyChange}
                      onKeyDown={handleReplyKeyDown}
                      autoFocus={isNativeMobile}
                      onInput={(e) => handleInput(e, reply)}
                    />
                    {comment.id === activeCommentId && (
                      <ButtonGroup className="w-full justify-end">
                        <Button
                          variant="ghost"
                          className="px-4 py-2 w-20 min-w-20 h-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenReplyId(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="px-4 py-2 w-20 min-w-20 h-9"
                          disabled={!reply.trim()}
                          onClick={handleReplySubmit}
                        >
                          Reply
                        </Button>
                      </ButtonGroup>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-3 color-bg-secondary border-t border-b color-border-default px-6 py-5 rounded-b-lg">
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

          <span className="text-body-sm-bold inline-flex items-center gap-1">
            {nameFormatter(ensStatus.name)}
            {ensStatus.isEns && (
              <img src={verifiedMark} alt="verified" className="w-3.5 h-3.5" />
            )}
          </span>
        </div>

        <TextAreaFieldV2
          value={comment}
          onChange={handleCommentChange}
          onKeyDown={handleCommentKeyDown}
          className="color-bg-default w-full text-body-sm color-text-default min-h-[40px] max-h-[96px] overflow-y-auto no-scrollbar px-3 py-2 whitespace-pre-wrap"
          placeholder="Type your comment"
          onInput={(e) => handleInput(e, comment)}
        />

        <div className="flex justify-end">
          <Button
            onClick={handleCommentSubmit}
            className="px-4 py-2 w-20 min-w-20 h-9"
            disabled={!comment.trim() || !username}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};
