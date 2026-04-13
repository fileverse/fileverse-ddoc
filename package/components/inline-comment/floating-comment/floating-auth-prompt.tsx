import { Button, Divider, TextField } from '@fileverse/ui';
import { useState } from 'react';
import EnsLogo from '../../../assets/ens.svg';
import { useCommentStore } from '../../../stores/comment-store';

export const FloatingAuthPrompt = () => {
  const connectViaWallet = useCommentStore((s) => s.connectViaWallet);
  const connectViaUsername = useCommentStore((s) => s.connectViaUsername);
  const isLoading = useCommentStore((s) => s.isLoading);
  const [name, setName] = useState('');

  return (
    <div className="p-3 pt-0 flex flex-col gap-2">
      <div className="flex gap-2">
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
          placeholder="Enter a name"
        />
        <Button
          onClick={() => connectViaUsername?.(name)}
          disabled={!name || isLoading}
          isLoading={isLoading}
          className="min-w-[60px]"
          size="sm"
        >
          Join
        </Button>
      </div>
      <div className="text-[11px] text-gray-400 flex items-center">
        <Divider direction="horizontal" size="sm" className="flex-grow" />
        <span className="px-2 whitespace-nowrap">
          or join with <span className="font-semibold">.eth</span>
        </span>
        <Divider direction="horizontal" size="sm" className="flex-grow" />
      </div>
      <Button
        onClick={connectViaWallet ?? undefined}
        disabled={isLoading}
        variant="ghost"
        size="sm"
        className="w-full"
      >
        <img alt="ens-logo" src={EnsLogo} className="w-4 h-4 mr-1" />
        {isLoading ? 'Connecting...' : 'Continue with ENS'}
      </Button>
    </div>
  );
};
