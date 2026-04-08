import { Avatar, TextAreaFieldV2, Button } from '@fileverse/ui';
import { useCommentStore } from '../../stores/comment-store';
import { useEffect, useRef, useState } from 'react';
import { EnsStatus } from './types';
import { useResponsive } from '../../utils/responsive';

interface CommentReplyInputProps {
  commentId: string;
  commentUsername?: string;
  replyCount: number;
}

export const CommentReplyInput = ({
  commentId,
  commentUsername,
  replyCount,
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
  const replyInputContainerRef = useRef<HTMLDivElement | null>(null);
  const { isBelow1280px } = useResponsive();

  const [ensStatus, setEnsStatus] = useState<EnsStatus>({
    name: username as string,
    isEns: false,
  });

  useEffect(() => {
    getEnsStatus(username as string, setEnsStatus);
  }, [username, ensCache, getEnsStatus]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const focusTarget = replyInputContainerRef.current?.querySelector<
        HTMLTextAreaElement | HTMLInputElement
      >('textarea, input');

      focusTarget?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [commentId]);

  return (
    <div ref={replyInputContainerRef} className="group p-3 mt-[8px] pt-0">
      <div className="border flex px-[12px] color-bg-default py-[8px] gap-[8px] rounded-[4px]">
        <Avatar
          src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(
            ensStatus.name || '',
          )}`}
          className="w-[16px] h-[16px]"
        />
        <TextAreaFieldV2
          data-testid="comment-reply-input"
          value={reply}
          onInput={(event) => handleInput(event, event.currentTarget.value)}
          className="color-bg-default w-full text-body-sm color-text-default !p-0 !border-none h-[20px] max-h-[296px] overflow-y-auto no-scrollbar whitespace-pre-wrap"
          placeholder={
            replyCount === 0
              ? `Reply to @${commentUsername}`
              : replyCount >= 2
                ? `Add a reply`
                : `Reply `
          }
          id={commentId}
          onChange={handleReplyChange}
          onKeyDown={handleReplyKeyDown}
          autoFocus
        />
      </div>
      <div
        className={
          isBelow1280px
            ? 'flex items-center justify-end gap-2 pt-2'
            : 'hidden items-center justify-end gap-2 pt-2 group-focus-within:flex'
        }
      >
        <Button
          variant={'ghost'}
          className="w-20 min-w-20"
          onClick={(e) => {
            e.stopPropagation();
            setOpenReplyId(null);
          }}
        >
          <p className="text-body-sm-bold">Cancel</p>
        </Button>
        <Button
          data-testid="comment-reply-send"
          className="w-20 min-w-20"
          disabled={!reply.trim()}
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
