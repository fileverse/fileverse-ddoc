import { Avatar, TextAreaFieldV2, Button, cn } from '@fileverse/ui';
import { useCommentStore } from '../../stores/comment-store';
import EnsLogo from '../../assets/ens.svg';
import { useEffect, useRef } from 'react';
import { resizeInlineCommentTextarea } from './resize-inline-comment-textarea';
import { useEnsStatus } from './use-ens-status';

export const CommentInputField = ({
  tabId,
  isCollaborationEnabled,
}: {
  tabId?: string;
  isCollaborationEnabled: boolean;
}) => {
  const comment = useCommentStore((s) => s.comment);
  const username = useCommentStore((s) => s.username);
  const handleCommentChange = useCommentStore((s) => s.handleCommentChange);
  const handleCommentKeyDown = useCommentStore((s) => s.handleCommentKeyDown);
  const handleCommentSubmit = useCommentStore((s) => s.handleCommentSubmit);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);
  const ensStatus = useEnsStatus(username);

  useEffect(() => {
    if (!commentInputRef.current) {
      return;
    }

    resizeInlineCommentTextarea(commentInputRef.current, 96);
  }, [comment]);

  return (
    <div className="flex flex-col gap-3 color-bg-default  border-t color-border-default pt-[20px] rounded-b-lg">
      <div
        className={cn(
          'border mx-4 flex px-[12px] color-bg-default py-[8px] gap-[8px] rounded-[4px]',
          isCollaborationEnabled && 'color-bg-disabled',
        )}
      >
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
          disabled={isCollaborationEnabled}
          placeholder={
            isCollaborationEnabled
              ? 'Cannot add comment in collaboration mode'
              : 'Add a comment'
          }
          onInput={(event) =>
            resizeInlineCommentTextarea(event.currentTarget, 96)
          }
        />
      </div>

      <div className="flex px-4 items-center color-bg-default justify-end">
        <Button
          data-testid="comment-section-send"
          onClick={() => handleCommentSubmit(tabId)}
          className="px-4 py-2 w-20 min-w-20 h-9"
          disabled={!comment.trim() || !username || isCollaborationEnabled}
        >
          Send
        </Button>
      </div>
    </div>
  );
};
