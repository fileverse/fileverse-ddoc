import { useEffect, useState } from 'react';
import DdocEditor from './packages/ddoc/ddoc-editor';

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

  return (
    <div>
      <DdocEditor
        enableCollaboration={enableCollaboration}
        toggleCollaboration={() => setEnableCollaboration(false)}
        collaborationId={collaborationId}
        username={username}
        isPreviewMode={isPreviewMode}
        togglePreviewMode={() => setIsPreviewMode(!isPreviewMode)}
        onPublish={value => console.log(value)}
      />
    </div>
  );
}

export default App;
