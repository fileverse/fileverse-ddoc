import { Avatar, TextAreaFieldV2, Button } from '@fileverse/ui';
import { useCommentStore } from '../../stores/comment-store';
import EnsLogo from '../../assets/ens.svg';
import { useEffect, useState } from 'react';
import { EnsStatus } from './types';

export const CommentComposeInput = () => {
  const comment = useCommentStore((s) => s.comment);
  const username = useCommentStore((s) => s.username);
  const handleCommentChange = useCommentStore((s) => s.handleCommentChange);
  const handleCommentKeyDown = useCommentStore((s) => s.handleCommentKeyDown);
  const handleCommentSubmit = useCommentStore((s) => s.handleCommentSubmit);
  const handleInput = useCommentStore((s) => s.handleInput);
  const getEnsStatus = useCommentStore((s) => s.getEnsStatus);
  const ensCache = useCommentStore((s) => s.ensCache);

  const [ensStatus, setEnsStatus] = useState<EnsStatus>({
    name: username as string,
    isEns: false,
  });

  useEffect(() => {
    getEnsStatus(username as string, setEnsStatus);
  }, [username, ensCache]);

  return (
    <div className="flex flex-col gap-3 color-bg-default border-t color-border-default pt-[20px] rounded-b-lg">
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

      <div className="flex items-center color-bg-default justify-end">
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
  );
};
