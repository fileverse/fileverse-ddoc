import { useEffect, useState } from 'react';
import DdocEditor from './packages/ddoc/ddoc-editor';
import { Button } from './packages/ddoc/common/button';
import { Pencil, ScanEye, Share2 } from 'lucide-react';
import { JSONContent } from '@tiptap/react';

function App() {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [enableCollaboration, setEnableCollaboration] = useState(false);
  const [username, setUsername] = useState('');
  const [title, setTitle] = useState('Untitled');

  const collaborationId = window.location.pathname.split('/')[2]; // example url - /doc/1234, that why's used second element of array

  useEffect(() => {
    if (collaborationId) {
      const name = prompt('Whats your username');
      if (!name) return;
      setUsername(name);
      setEnableCollaboration(true);
    }
  }, [collaborationId]);

  const renderRightSection = ({
    editor
  }: {
    editor: JSONContent;
  }): JSX.Element => {
    const publishDoc = () => {
      console.log(editor, title);
    };
    return (
      <div className='flex gap-2'>
        <div>
          <Button
            variant='ghost'
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            {isPreviewMode ? <Pencil size={14} /> : <ScanEye size={14} />}{' '}
            {isPreviewMode ? 'Edit' : 'Preview'}
          </Button>
        </div>

        <div>
          <Button onClick={publishDoc}>
            <Share2 size={14} /> Share
          </Button>
        </div>
      </div>
    );
  };

  const renderLeftSection = () => {
    return (
      <div className='flex items-center gap-4'>
        <input
          className='max-w-[6rem] lg:max-w-xs focus:outline-none bg-[#f8f9fa]'
          disabled={isPreviewMode}
          type='text'
          placeholder='Untitled'
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>
    );
  };

  return (
    <div>
      <DdocEditor
        enableCollaboration={enableCollaboration}
        collaborationId={collaborationId}
        username={username}
        isPreviewMode={isPreviewMode}
        renderToolRightSection={renderRightSection}
        renderToolLeftSection={renderLeftSection}
        onAutoSave={data => console.log(data, title)}
      />
    </div>
  );
}

export default App;
