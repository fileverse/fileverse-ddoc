/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import {
  Avatar,
  ButtonGroup,
  LucideIcon,
  TextAreaFieldV2,
  Button,
  cn,
  Tooltip,
} from '@fileverse/ui';
import { CommentCard } from './comment-card';
import { useCommentStore } from '../../stores/comment-store';
import { useCommentRefs } from '../../stores/comment-store-provider';
import EnsLogo from '../../assets/ens.svg';
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
  const comments = useCommentStore((s) => s.getTabComments());
  const username = useCommentStore((s) => s.username);
  const setUsername = useCommentStore((s) => s.setUsername);
  const focusCommentInEditor = useCommentStore((s) => s.focusCommentInEditor);
  const handleReplyChange = useCommentStore((s) => s.handleReplyChange);
  const handleCommentChange = useCommentStore((s) => s.handleCommentChange);
  const handleCommentKeyDown = useCommentStore((s) => s.handleCommentKeyDown);
  const handleReplySubmit = useCommentStore((s) => s.handleReplySubmit);
  const setOpenReplyId = useCommentStore((s) => s.setOpenReplyId);
  const handleReplyKeyDown = useCommentStore((s) => s.handleReplyKeyDown);
  const openReplyId = useCommentStore((s) => s.openReplyId);
  const showResolved = useCommentStore((s) => s.showResolved);
  const comment = useCommentStore((s) => s.comment);
  const reply = useCommentStore((s) => s.reply);
  const handleCommentSubmit = useCommentStore((s) => s.handleCommentSubmit);
  const handleInput = useCommentStore((s) => s.handleInput);
  const resolveComment = useCommentStore((s) => s.resolveComment);
  const unresolveComment = useCommentStore((s) => s.unresolveComment);
  const deleteComment = useCommentStore((s) => s.deleteComment);
  const isConnected = useCommentStore((s) => s.isConnected);
  const connectViaWallet = useCommentStore((s) => s.connectViaWallet);
  const isLoading = useCommentStore((s) => s.isLoading);
  const connectViaUsername = useCommentStore((s) => s.connectViaUsername);
  const isDDocOwner = useCommentStore((s) => s.isDDocOwner);
  const getEnsStatus = useCommentStore((s) => s.getEnsStatus);
  const ensCache = useCommentStore((s) => s.ensCache);
  const { commentsSectionRef, replySectionRef } = useCommentRefs();
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
                    <div className="border color-bg-default flex px-[12px] py-[8px] gap-[8px] rounded-[4px]">
                      <Avatar
                        src={
                          ensStatus.isEns
                            ? EnsLogo
                            : `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(
                                ensStatus.name,
                              )}`
                        }
                        className="w-[16px] h-[16px]"
                      />
                      <TextAreaFieldV2
                        data-testid="comment-reply-input"
                        placeholder={
                          comment.replies?.length === 0
                            ? `Reply to @${comment.username}`
                            : comment.replies?.length >= 2
                              ? `Add a reply`
                              : `Reply `
                        }
                        value={reply}
                        style={{
                          ...(!reply ? { height: '20px' } : {}),
                        }}
                        className={cn(
                          'color-bg-default text-body-sm color-text-default  max-h-[96px] !border-none !p-0 overflow-y-auto no-scrollbar whitespace-pre-wrap',
                          comment.id === activeCommentId && 'color-bg-default',
                        )}
                        id={comment.id}
                        onChange={handleReplyChange}
                        onKeyDown={handleReplyKeyDown}
                        autoFocus={isNativeMobile}
                        onInput={(e) => handleInput(e, reply)}
                      />
                    </div>
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
                          data-testid="comment-reply-send"
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
      <div className="flex flex-col gap-3 color-bg-default border-t border-b color-border-default px-6 py-5 rounded-b-lg">
        <div className="border flex px-[12px] py-[8px] gap-[8px] rounded-[4px]">
          <Avatar
            src={
              ensStatus.isEns
                ? EnsLogo
                : `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(
                    ensStatus.name,
                  )}`
            }
            className="w-[16px] h-[16px]"
          />
          <TextAreaFieldV2
            data-testid="comment-section-input"
            value={comment}
            onChange={handleCommentChange}
            onKeyDown={handleCommentKeyDown}
            style={{
              ...(!comment ? { height: '20px' } : {}),
            }}
            className="color-bg-default w-full text-body-sm color-text-default !p-0 !border-none h-[20px] max-h-[96px] overflow-y-auto no-scrollbar whitespace-pre-wrap"
            placeholder="Add a comment"
            onInput={(e) => handleInput(e, comment)}
          />
        </div>

        <div className="flex items-center color-bg-default justify-between">
          <Tooltip
            text={
              'End-to-end encrypted. Only you and selected recipients can access this document.'
            }
            beakAlignment={'start'}
            className="max-w-[275px] w-fit text-helper-text-sm"
          >
            <div className="flex gap-2 py-1">
              <LucideIcon
                name="LockKeyhole"
                className="color-icon-secondary w-[14px] h-[14px]"
              />
              <p className="text-helper-text-sm color-text-secondary">
                Comments are End-to-end Encrypted
              </p>
            </div>
          </Tooltip>
          <Button
            data-testid="comment-section-send"
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
