import {
  Avatar,
  ButtonGroup,
  TextAreaFieldV2,
  Button,
  cn,
} from '@fileverse/ui';
import { useCommentStore } from '../../stores/comment-store';
import EnsLogo from '../../assets/ens.svg';
import { useEffect, useState } from 'react';
import { EnsStatus } from './types';
import { useResponsive } from '../../utils/responsive';

interface CommentReplyInputProps {
  commentId: string;
  commentUsername?: string;
  replyCount: number;
  activeCommentId: string;
}

export const CommentReplyInput = ({
  commentId,
  commentUsername,
  replyCount,
  activeCommentId,
}: CommentReplyInputProps) => {
  const reply = useCommentStore((s) => s.reply);
  const handleReplyChange = useCommentStore((s) => s.handleReplyChange);
  const handleReplyKeyDown = useCommentStore((s) => s.handleReplyKeyDown);
  const handleReplySubmit = useCommentStore((s) => s.handleReplySubmit);
  const handleInput = useCommentStore((s) => s.handleInput);
  const setOpenReplyId = useCommentStore((s) => s.setOpenReplyId);
  const username = useCommentStore((s) => s.username);
  const getEnsStatus = useCommentStore((s) => s.getEnsStatus);
  const ensCache = useCommentStore((s) => s.ensCache);
  const { isNativeMobile } = useResponsive();

  const [ensStatus, setEnsStatus] = useState<EnsStatus>({
    name: username as string,
    isEns: false,
  });

  useEffect(() => {
    getEnsStatus(username as string, setEnsStatus);
  }, [username, ensCache]);

  return (
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
            replyCount === 0
              ? `Reply to @${commentUsername}`
              : replyCount >= 2
                ? `Add a reply`
                : `Reply `
          }
          value={reply}
          style={{
            ...(!reply ? { height: '20px' } : {}),
          }}
          className={cn(
            'color-bg-default text-body-sm color-text-default max-h-[96px] !border-none !p-0 overflow-y-auto no-scrollbar whitespace-pre-wrap',
            commentId === activeCommentId && 'color-bg-default',
          )}
          id={commentId}
          onChange={handleReplyChange}
          onKeyDown={handleReplyKeyDown}
          autoFocus={isNativeMobile}
          onInput={(e) => handleInput(e, reply)}
        />
      </div>
      {commentId === activeCommentId && (
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
  );
};
