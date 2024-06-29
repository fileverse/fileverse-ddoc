import { useEffect, useState } from 'react';
import DdocEditor from './packages/ddoc/ddoc-editor';
import { Button } from './packages/ddoc/common/button';
import { Pencil, ScanEye, Share2 } from 'lucide-react';
import { JSONContent } from '@tiptap/react';
// import * as ucan from 'ucans';
// import { buildUCANToken } from './packages/ddoc/utils/buildUCANToken';
import { API_URL, DEFAULT_AUTHENTICATED_HEADER } from './constants/index';

function App() {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [enableCollaboration, setEnableCollaboration] = useState(false);
  const [username, setUsername] = useState('');
  const [title, setTitle] = useState('Untitled');
  // const [auth, setCollaborationAuth] = useState<{
  //   token: string;
  //   did: string;
  // } | null>(null);

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

  // const handleCollaborationAuth = async () => {
  //   const userAuth = localStorage.getItem('x');
  //   if (!userAuth) {
  //     const tempAuth = await ucan.EdKeypair.create({ exportable: true });
  //     console.log({ tempAuth });
  //     localStorage.setItem('x, JSON.stringify({ auth: tempAuth }));
  //     const token = await buildUCANToken(tempAuth);
  //     setCollaborationAuth({ token, did: tempAuth.did() });
  //   } else {
  //     const { auth } = JSON.parse(userAuth);
  //     console.log({ auth });
  //     const token = await buildUCANToken(auth);
  //     setCollaborationAuth({ token, did: auth.did() });
  //   }
  // };

  const callUploadApi = async (file: File, tags = ['public']) => {
    // if (!auth?.token) {
    //   throw new Error('Auth Tokens Not Found');
    // }
  
    const body = new FormData();
    body.append('file', file);
    body.append('name', file.name);
  
    // Serialize tags array to a comma-separated string
    const tagsParam = tags.join(',');
  
    const headers: any = {
      ...DEFAULT_AUTHENTICATED_HEADER,
      'Content-Type': 'multipart/form-data', // Ensure correct content type for FormData
    };
  
    try {
      const response = await fetch(`${API_URL}/upload?tags=${encodeURIComponent(tagsParam)}`, {
        method: 'POST',
        headers: {
          ...headers,
          'Access-Control-Request-Method': 'POST', // Specify the method of the actual request
          'Access-Control-Request-Headers': 'Content-Type', // Specify the headers of the actual request
        },
        body,
      });
  
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
  
      const apiResponse = await response.json();
      return apiResponse;
    } catch (error) {
      // Handle fetch errors or response parsing errors
      console.error('Error during fetch:', error);
      throw error;
    }
  };
  
  const getImageIpfsHash = async (file: File): Promise<string> => {
    const response = await callUploadApi(file);
    return response.ipfsUrl;
  };

  // useEffect(() => {
  //   handleCollaborationAuth();
  // }, []);

  return (
    <div>
      <DdocEditor
        enableCollaboration={enableCollaboration}
        collaborationId={collaborationId}
        username={username}
        handleImageUploadToIpfs={getImageIpfsHash}
        isPreviewMode={isPreviewMode}
        renderToolRightSection={renderRightSection}
        renderToolLeftSection={renderLeftSection}
        onAutoSave={data => console.log(data, title)}
      />
    </div>
  );
}

export default App;
