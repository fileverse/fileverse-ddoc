import { Avatar, TextAreaFieldV2, Button, IconButton, cn } from '@fileverse/ui';
import { useCommentStore } from '../../stores/comment-store';
import { useEffect, useRef } from 'react';
import { useResponsive } from '../../utils/responsive';
import { resizeInlineCommentTextarea } from './resize-inline-comment-textarea';
import { useEnsStatus } from './use-ens-status';
import EnsLogo from '../../assets/ens.svg';
import { nameFormatter } from '../../utils/helpers';

interface CommentReplyInputProps {
  commentId: string;
  commentUsername?: string;
  replyCount: number;
  isCollaborationEnabled: boolean;
}

export const CommentReplyInput = ({
  commentId,
  replyCount,
  isCollaborationEnabled,
  commentUsername,
}: CommentReplyInputProps) => {
  const reply = useCommentStore((s) => s.reply);
  const replyEditTarget = useCommentStore((s) => s.replyEditTarget);
  const editRequest = useCommentStore((s) => s.editRequest);
  const clearEditRequest = useCommentStore((s) => s.clearEditRequest);
  const setReply = useCommentStore((s) => s.setReply);
  const setReplyEditTarget = useCommentStore((s) => s.setReplyEditTarget);
  const cancelReplyEdit = useCommentStore((s) => s.cancelReplyEdit);
  const handleReplyChange = useCommentStore((s) => s.handleReplyChange);
  const handleReplyKeyDown = useCommentStore((s) => s.handleReplyKeyDown);
  const handleReplySubmit = useCommentStore((s) => s.handleReplySubmit);
  const setOpenReplyId = useCommentStore((s) => s.setOpenReplyId);
  const username = useCommentStore((s) => s.username);
  const { isBelow1280px } = useResponsive();
  const hasUnsentReply = Boolean(reply.trim());
  const isEditing = Boolean(replyEditTarget);
  const isSendDisabled = Boolean(
    !reply.trim() ||
      !username ||
      (isEditing &&
        reply.trim() === (replyEditTarget?.originalText ?? '').trim()),
  );
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);
  const ensStatus = useEnsStatus(username);

  useEffect(() => {
    if (!editRequest || editRequest.commentId !== commentId) {
      return;
    }

    setReply(editRequest.text);
    setReplyEditTarget({
      kind: editRequest.kind,
      commentId: editRequest.commentId,
      replyId: editRequest.replyId,
      originalText: editRequest.text,
    });
    clearEditRequest(editRequest.requestId);
    replyInputRef.current?.focus();
  }, [clearEditRequest, commentId, editRequest, setReply, setReplyEditTarget]);

  useEffect(() => {
    if (!replyInputRef.current) {
      return;
    }

    resizeInlineCommentTextarea(replyInputRef.current);
  }, [reply]);

  return (
    <div className="group p-3 mt-[8px] pt-0 pb-0">
      <div
        className={cn(
          'border flex px-[12px] py-[8px] gap-[8px] rounded-[4px]',
          isBelow1280px && 'items-center justify-between ',
          isCollaborationEnabled ? 'color-bg-disabled' : 'color-bg-default',
        )}
      >
        <Avatar
          src={
            ensStatus.isEns
              ? EnsLogo
              : `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(
                  ensStatus.name || '',
                )}`
          }
          className="w-[16px] h-[16px]"
        />
        <TextAreaFieldV2
          ref={replyInputRef}
          data-testid="comment-reply-input"
          value={reply}
          onInput={(event) => resizeInlineCommentTextarea(event.currentTarget)}
          className="color-bg-default w-full text-body-sm color-text-default !p-0 !border-none h-[20px] max-h-[296px] overflow-y-auto no-scrollbar whitespace-pre-wrap"
          placeholder={
            isCollaborationEnabled
              ? 'Cannot reply in collaboration mode'
              : replyCount === 0
                ? `Reply to @${nameFormatter(commentUsername ?? 'comment')}`
                : replyCount >= 2
                  ? `Add a reply`
                  : `Reply `
          }
          id={commentId}
          onChange={(event) => {
            handleReplyChange(event);
            resizeInlineCommentTextarea(event.currentTarget);
          }}
          onKeyDown={handleReplyKeyDown}
          disabled={isCollaborationEnabled}
        />
        <IconButton
          onClick={() => {
            if (isSendDisabled || isCollaborationEnabled) {
              return;
            }
            handleReplySubmit();
          }}
          icon={'SendHorizontal'}
          variant="ghost"
          className={cn(
            '!min-w-[24px] !w-[24px] !min-h-[24px] !h-[24px]',
            !isBelow1280px && 'hidden',
          )}
        />
      </div>
      <div
        className={
          isBelow1280px
            ? 'hidden'
            : cn(
                'items-center justify-end gap-2 pt-2',
                hasUnsentReply ? 'flex' : 'hidden group-focus-within:flex',
              )
        }
      >
        <Button
          variant={'ghost'}
          className="w-20 min-w-20"
          onClick={(e) => {
            e.stopPropagation();
            setOpenReplyId(null);
            setReply('');
            cancelReplyEdit();
          }}
        >
          <p className="text-body-sm-bold">Cancel</p>
        </Button>
        <Button
          data-testid="comment-reply-send"
          className="w-20 min-w-20"
          disabled={isSendDisabled || isCollaborationEnabled}
          onClick={(e) => {
            e.stopPropagation();
            handleReplySubmit();
          }}
        >
          Send
        </Button>
      </div>
    </div>
  );
};
