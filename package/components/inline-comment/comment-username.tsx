import { LucideIcon, TextField, Button, cn } from '@fileverse/ui';
import { CommentUsernameProps } from './context/types';

const CommentUsername = ({
  username,
  setUsername,
  isConnected,
  connectViaUsername,
  connectViaWallet,
  isLoading,
}: CommentUsernameProps) => {
  return (
    <div
      data-testid="comment-auth-modal"
      className={cn('flex flex-col !color-bg-default !rounded-b-lg')}
    >
      <div
        className={cn(
          'w-full px-6 h-full flex flex-col justify-center items-center',
        )}
      >
        <div className="inline-flex gap-2">
          <LucideIcon name="Users" className="w-6 h-6" />
          What would you like to be identified with
        </div>
        {/* Content */}
        <div className="pt-4 w-full">
          {' '}
          <div className="flex flex-col gap-2">
            <div className="flex gap-3 mt-2">
              <TextField
                data-testid="comment-name-input"
                type="text"
                value={username!}
                onChange={(e) => setUsername?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && username) {
                    connectViaUsername?.(username);
                  }
                }}
                className="font-normal"
                placeholder="Enter a name"
              />
              <Button
                data-testid="comment-join-btn"
                onClick={() => connectViaUsername?.(username!)}
                disabled={!username || isLoading}
                isLoading={isLoading}
                className="min-w-[80px]"
              >
                Join
              </Button>
            </div>

            <div className="text-[12px] text-gray-400 flex justify-center items-center my-3">
              or join with your
              <span
                onClick={isConnected ? () => null : connectViaWallet}
                className="font-semibold color-text-link mx-[4px] cursor-pointer"
              >
                ENS
              </span>
              domain
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { CommentUsername };
