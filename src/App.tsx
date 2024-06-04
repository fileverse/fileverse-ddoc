import { useState } from 'react';
import DdocEditor from './packages/ddoc/ddoc-editor';

function App() {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  return (
    <div>
      <DdocEditor
        isPreviewMode={isPreviewMode}
        togglePreviewMode={() => setIsPreviewMode(!isPreviewMode)}
        onPublish={(value) => console.log(value)}
      />
    </div>
  );
}

export default App;
