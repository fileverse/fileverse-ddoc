import DdocEditor from '../../package/ddoc-editor';
import { toast, Toaster } from '@fileverse/ui';
import { useMediaQuery } from 'usehooks-ts';
import CommentSection from './comment-section';
import useDdocEditor from './hooks/use-ddoc-editor';

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
  const isMobile = useMediaQuery('(max-width: 768px)');
  const {
    isCommentSectionOpen,
    setInlineCommentData,
    setIsCommentSectionOpen,
    inlineCommentData,
    ddocId,
    characterCount,
    wordCount,
    onChange,
    setIsNavbarVisible,
    isNavbarVisible,
    setZoomLevel,
    zoomLevel,
    setSelectedTags,
    selectedTags,
    renderNavbar,
    initialContent,
    username,
    collaborationId,
    enableCollaboration,
    setWordCount,
    setCharacterCount,
  } = useDdocEditor();

  return (
    <div>
      <DdocEditor
        setCharacterCount={setCharacterCount}
        setWordCount={setWordCount}
        enableCollaboration={enableCollaboration}
        collaborationId={collaborationId}
        username={username}
        initialContent={initialContent}
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
      <CommentSection
        username={username}
        isCommentSectionOpen={isCommentSectionOpen}
        setInlineCommentData={setInlineCommentData}
        inlineCommentData={inlineCommentData}
        setIsCommentSectionOpen={setIsCommentSectionOpen}
        ddocId={ddocId}
      />
    </div>
  );
}

export default App;
