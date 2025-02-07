import EnsLogo from '../../assets/ens.svg';
import { LucideIcon, Divider, TextField, Button, cn } from '@fileverse/ui';
import { CommentUsernameProps } from './context/types';

const CommentUsername = ({
  username,
  setUsername,
  isNavbarVisible,
  isConnected,
  connectViaUsername,
  connectViaWallet,
  isLoading,
}: CommentUsernameProps) => {
  return (
    <div
      className={cn(
        'flex flex-col h-screen xl:!h-[80vh] !bg-white !rounded-b-lg',
        !isNavbarVisible && 'xl:!h-[calc(100vh-150px)]',
      )}
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
                onClick={() => connectViaUsername?.(username!)}
                disabled={!username || isLoading}
                isLoading={isLoading}
                className="min-w-[80px]"
              >
                Join
              </Button>
            </div>

            <div className="text-[12px] text-gray-400 flex items-center my-3">
              <Divider
                direction="horizontal"
                size="md"
                className="flex-grow md:!mr-4"
              />
              or join with your&nbsp;
              <span className="font-semibold">.eth&nbsp;</span> domain
              <Divider
                direction="horizontal"
                size="md"
                className="flex-grow md:!ml-4"
              />
            </div>

            <div className="text-center">
              <button
                onClick={isConnected ? () => {} : connectViaWallet}
                disabled={isLoading}
                className="bg-[#F0F6FF] disabled:opacity-50 disabled:cursor-not-allowed disabled:color-bg-disabled h-10 flex gap-2 items-center justify-center p-3 w-full text-[#388CFB] font-medium rounded"
              >
                <img alt="ens-logo" src={EnsLogo} />{' '}
                {isLoading ? 'Connecting with ENS ...' : 'Continue with ENS'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { CommentUsername };
