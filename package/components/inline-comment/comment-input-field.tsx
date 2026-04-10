import { Avatar, TextAreaFieldV2, Button } from '@fileverse/ui';
import { useCommentStore } from '../../stores/comment-store';
import EnsLogo from '../../assets/ens.svg';
import { useEffect, useRef, useState } from 'react';
import { EnsStatus } from './types';
import { resizeInlineCommentTextarea } from './resize-inline-comment-textarea';

export const CommentInputField = ({ tabId }: { tabId?: string }) => {
  const comment = useCommentStore((s) => s.comment);
  const username = useCommentStore((s) => s.username);
  const handleCommentChange = useCommentStore((s) => s.handleCommentChange);
  const handleCommentKeyDown = useCommentStore((s) => s.handleCommentKeyDown);
  const handleCommentSubmit = useCommentStore((s) => s.handleCommentSubmit);
  const getEnsStatus = useCommentStore((s) => s.getEnsStatus);
  const ensCache = useCommentStore((s) => s.ensCache);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [ensStatus, setEnsStatus] = useState<EnsStatus>({
    name: username as string,
    isEns: false,
  });

  useEffect(() => {
    getEnsStatus(username as string, setEnsStatus);
  }, [username, ensCache]);

  useEffect(() => {
    if (!commentInputRef.current) {
      return;
    }

    resizeInlineCommentTextarea(commentInputRef.current, 96);
  }, [comment]);

  return (
    <div className="flex flex-col gap-3 color-bg-secondary border-t color-border-default pt-[20px] rounded-b-lg">
      <div className="border mx-4 flex px-[12px] color-bg-default py-[8px] gap-[8px] rounded-[4px]">
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
          ref={commentInputRef}
          data-testid="comment-section-input"
          value={comment}
          onChange={(event) => {
            handleCommentChange(event);
            resizeInlineCommentTextarea(event.currentTarget, 96);
          }}
          onKeyDown={(event) => handleCommentKeyDown(event, tabId)}
          className="color-bg-default w-full text-body-sm color-text-default !p-0 !border-none h-[20px] max-h-[96px] overflow-y-auto no-scrollbar whitespace-pre-wrap"
          placeholder="Add a comment"
          onInput={(event) =>
            resizeInlineCommentTextarea(event.currentTarget, 96)
          }
        />
      </div>

      <div className="flex px-4 items-center color-bg-secondary justify-end">
        <Button
          data-testid="comment-section-send"
          onClick={() => handleCommentSubmit(tabId)}
          className="px-4 py-2 w-20 min-w-20 h-9"
          disabled={!comment.trim() || !username}
        >
          Send
        </Button>
      </div>
    </div>
  );
};
