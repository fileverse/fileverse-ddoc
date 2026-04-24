import { Button, cn, TextField } from '@fileverse/ui';
import { useState } from 'react';
import { useCommentStore } from '../../../stores/comment-store';

export const FloatingAuthPrompt = ({ isDraft }: { isDraft?: boolean }) => {
  const connectViaWallet = useCommentStore((s) => s.connectViaWallet);
  const connectViaUsername = useCommentStore((s) => s.connectViaUsername);
  const isLoading = useCommentStore((s) => s.isLoading);
  const [name, setName] = useState('');

  return (
    <div
      className={cn(
        'p-3 color-bg-secondary mx-[12px] rounded-[8px] flex flex-col gap-[12px]',
        isDraft && 'mt-[12px]',
      )}
    >
      <div className="flex flex-col gap-2">
        <TextField
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name) {
              connectViaUsername?.(name);
            }
          }}
          className="font-normal text-body-sm"
          placeholder="Add name to the comment"
        />
        <Button
          onClick={() => connectViaUsername?.(name)}
          disabled={!name || isLoading}
          isLoading={isLoading}
          className="min-w-full text-body-sm-bold"
          size="sm"
        >
          Join
        </Button>
      </div>
      <p className="text-helper-text-sm text-center color-text-secondary">
        or use{' '}
        <span
          onClick={connectViaWallet ?? undefined}
          className="color-text-link cursor-pointer"
        >
          your ENS
        </span>
      </p>
    </div>
  );
};
