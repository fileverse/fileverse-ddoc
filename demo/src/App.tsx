import { useEffect, useMemo, useState } from 'react';
import DdocEditor from '../../package/ddoc-editor';
import { JSONContent } from '@tiptap/react';
import {
  Button,
  Tag,
  IconButton,
  LucideIcon,
  toast,
  Toaster,
  TagType,
} from '@fileverse/ui';
import { useMediaQuery } from 'usehooks-ts';
import { createDdoc, getDdocById, updateDdocById } from './db/db';
import { useNavigate } from 'react-router-dom'
import shortUUID from 'short-uuid';

const sampleTags = [
  { name: 'Talks & Presentations', isActive: true, color: '#F6B1B2' },
  { name: 'Discussions', isActive: true, color: '#FFD6D7' },
  { name: 'Meet-up', isActive: false, color: '#FFD887' },
  { name: 'Workshop', isActive: false, color: '#FFF292' },
  { name: 'Hackathon', isActive: false, color: '#D7F893' },
  { name: 'Devcon Main Event', isActive: true, color: '#B7F1BA' },
  { name: 'Specific Event', isActive: true, color: '#AAF5E4' },
];

function App() {
  const [enableCollaboration, setEnableCollaboration] = useState(false);
  const [username, setUsername] = useState('');
  const [title, setTitle] = useState('Untitled');
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);
  const [isCommentSectionOpen, setIsCommentSectionOpen] = useState(false);
  const [inlineCommentData, setInlineCommentData] = useState({
    inlineCommentText: '',
    highlightedTextContent: '',
    handleClick: false,
  });

  const router = useNavigate()
  
  const [zoomLevel, setZoomLevel] = useState<string>('1');
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const isPreviewMode = false;
  const ddocId = useMemo(() => {
    return window.location.pathname.split('/')[1];
  }, [window.location])

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
            <LucideIcon
              name="BadgeCheck"
              size="sm"
              className="text-[#77818A]"
            />
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

  const [initialContent, setInitialContent] = useState<JSONContent>()


  const initialiseData = async () => {

    if(!ddocId) return

    const ddoc = await getDdocById(ddocId)

    if(!ddoc) return
    setInitialContent(ddoc.content)
  }


  useEffect(() => {
    if(!ddocId){
      router(`/${shortUUID.generate()}`)
    } else {
      initialiseData()
    }

  }, [ddocId])

  const onChange = async (content: JSONContent) => {
    if(!ddocId) return
    const ddoc = await getDdocById(ddocId)
    if(ddoc){
      await updateDdocById(ddocId, {content})
    }else {
      await createDdoc({content, createAt: Date.now(), ddocId})
    }
  }

  const [characterCount, setCharacterCount] = useState<number>(0);
  const [wordCount, setWordCount] = useState<number>(0);

  return (
    <div>
      <DdocEditor
      setCharacterCount={setCharacterCount}
      setWordCount={setWordCount}
        enableCollaboration={enableCollaboration}
        collaborationId={collaborationId}
        username={username}
        initialContent={initialContent}
        isPreviewMode={isPreviewMode}
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
        secureImageUploadUrl={import.meta.env.VITE_SECURE_IMAGE_UPLOAD_URL}
        tags={sampleTags}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
        isCommentSectionOpen={isCommentSectionOpen}
        setIsCommentSectionOpen={setIsCommentSectionOpen}
        setInlineCommentData={setInlineCommentData}
        inlineCommentData={inlineCommentData}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        isNavbarVisible={isNavbarVisible}
        setIsNavbarVisible={setIsNavbarVisible}
        onChange={onChange}
      />
          <div className="w-full h-6 bg-[#F8F9FA] border border-t-[#E8EBEC] absolute text-[#77818A] text-[12px] leading-[16px] right-0 bottom-0 flex justify-end xl:!justify-between items-start py-1 px-3 md:!px-6">
      <div className="hidden xl:flex gap-4">
        <p>P2P. Decentralised. Encrypted.</p>
      </div>
      <div className="flex gap-4">
        <div className="flex gap-1 justify-start items-center">
          <p>Characters:</p>
          <div>{characterCount}</div>
        </div>
        <div className="flex gap-1 justify-start items-center">
          <p>Words:</p> <div>{wordCount}</div>
        </div>
      </div>
    </div>
      <Toaster
        position={!isMobile ? 'bottom-right' : 'center-top'}
        duration={3000}
      />
    </div>
  );
}

export default App;
