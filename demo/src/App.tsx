import { useEffect, useState } from 'react';
import DdocEditor from '../../package/ddoc-editor';
import { JSONContent } from '@tiptap/react';
import { Button, Tag, IconButton, LucideIcon, toast, Toaster } from '@fileverse/ui';
import { useMediaQuery } from 'usehooks-ts';

function App() {
  const [enableCollaboration, setEnableCollaboration] = useState(false);
  const [username, setUsername] = useState('');
  const [title, setTitle] = useState('Untitled');
  const isMobile = useMediaQuery('(max-width: 768px)');

  const collaborationId = window.location.pathname.split('/')[2]; // example url - /doc/1234, that why's used second element of array

  useEffect(() => {
    if (collaborationId) {
      const name = prompt('Whats your username');
      if (!name) return;
      setUsername(name);
      setEnableCollaboration(true);
    }
  }, [collaborationId]);

  const renderNavbar = ({ editor }: { editor: JSONContent }): JSX.Element => {
    const publishDoc = () => console.log(editor, title);
    return (
      <>
        <div className="flex items-center gap-[12px]">
          <IconButton variant={'ghost'} icon="Menu" size="md" />

          <div className="relative truncate inline-block xl:!max-w-[300px] !max-w-[108px] bg-[#ffffff] text-[14px] font-medium leading-[20px]">
            <span className="invisible whitespace-pre">
              {title || 'Untitled'}
            </span>
            <input
              className="focus:outline-none truncate bg-[#ffffff] absolute top-0 left-0 right-0 bottom-0 select-text"
              type="text"
              placeholder="Untitled"
              value={title}
              onChange={(e) => setTitle?.(e.target.value)}
            />
          </div>
          <Tag
            icon="BadgeCheck"
            className="h-6 rounded !border !color-border-default color-text-secondary text-[12px] font-normal hidden xl:flex"
          >
            Saved in local storage
          </Tag>
          <div className="w-6 h-6 rounded color-bg-secondary flex justify-center items-center border color-border-default xl:hidden">
            <LucideIcon name="BadgeCheck" size="sm" className="text-[#77818A]" />
          </div>
        </div>
        <div className="flex gap-2">
          <IconButton variant={'ghost'} icon="MessageSquareText" size="md" />
          <IconButton
            variant={'ghost'}
            icon="Share2"
            className="flex xl:hidden"
            size="md"
          />
          <Button
            onClick={publishDoc}
            toggleLeftIcon={true}
            leftIcon="Share2"
            variant={'ghost'}
            className="!min-w-[90px] !px-0 hidden xl:flex"
          >
            Share
          </Button>
          <div className="flex gap-2 px-2 justify-center items-center">
            <LucideIcon name="Farcaster" />
            <div className="flex-col hidden xl:flex">
              <p className="text-heading-xsm">@[username]</p>
              <p className="text-helper-text-sm">Farcaster</p>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div>
      <DdocEditor
        enableCollaboration={enableCollaboration}
        collaborationId={collaborationId}
        username={username}
        isPreviewMode={false}
        onError={(error) => {
          toast({
            title: 'Error',
            description: error,
            variant: 'danger',
            hasIcon: true,
          });
        }}
        renderNavbar={renderNavbar}
        ensResolutionUrl={import.meta.env.ENS_RESOLUTION_URL}
      />
      <Toaster
        position={!isMobile ? 'bottom-right' : 'center-top'}
        duration={3000}
      />
    </div>
  );
}

export default App;
