import { useState } from 'react';
import DdocEditor from './packages/ddoc/ddoc-editor';

function App() {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [enableCollaboration, setEnableCollaboration] = useState(true)

  const collaborationId = window.location.pathname.split('/')[2]  // example url - /doc/1234, that why's used second element of array
  
  return (
    <div>
      <DdocEditor
        enableCollaboration={enableCollaboration}
        toggleCollaboration={() => setEnableCollaboration(false)}
        collaborationId={collaborationId}
        isPreviewMode={isPreviewMode}
        togglePreviewMode={() => setIsPreviewMode(!isPreviewMode)}
        onPublish={(value) => console.log(value)}
      />
    </div>
  );
}

export default App;
