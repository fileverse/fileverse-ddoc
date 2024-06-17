import { useEffect, useState } from 'react';
import DdocEditor from './packages/ddoc/ddoc-editor';
import { Button } from './packages/ddoc/common/button';
import { Pencil, ScanEye, Share2 } from 'lucide-react';
import { Editor } from '@tiptap/react';
import { PluginMetaData } from './packages/ddoc/types';

function App() {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [enableCollaboration, setEnableCollaboration] = useState(false);
  const [username, setUsername] = useState('');

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
    editor,
    pluginMetaData
  }: {
    editor: Editor;
    pluginMetaData: PluginMetaData;
  }): JSX.Element => {
    const publishDoc = () => {
      console.log(editor, pluginMetaData);
    };
    return (
      <div className='flex gap-2'>
        <div>
          <Button
            variant='secondary'
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

  return (
    <div>
      <DdocEditor
        data={null}
        enableCollaboration={enableCollaboration}
        toggleCollaboration={() => setEnableCollaboration(false)}
        collaborationId={collaborationId}
        username={username}
        isPreviewMode={isPreviewMode}
        renderToolRightSection={renderRightSection}
      />
    </div>
  );
}

export default App;
