import { useEffect, useState } from 'react';
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
import { IComment } from '../../package/extensions/comment';
import { CommentNotification } from './components/CommentNotification';

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
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [inlineCommentData, setInlineCommentData] = useState({
    inlineCommentText: '',
    highlightedTextContent: '',
    handleClick: false,
  });

  const [zoomLevel, setZoomLevel] = useState<string>('1');
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const isPreviewMode = false;

  const collaborationId = window.location.pathname.split('/')[2]; // example url - /doc/1234, that why's used second element of array

  //To handle comments from consumer side
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [initialComments, setInitialComment] = useState<IComment[]>([]);
  const handleReplyOnComment = (id: string, reply: IComment) => {
    setInitialComment((prev) =>
      prev.map((comment) => {
        if (comment.id === id) {
          return {
            ...comment,
            replies: [...(comment.replies || []), reply],
          };
        }
        return comment; // Ensure you return the unchanged comment
      }),
    );
  };
  const handleNewComment = (comment: IComment) => {
    setInitialComment((prev) => {
      const newComments = [...prev, comment];
      localStorage.setItem('initialComments', JSON.stringify(newComments));
      // Dispatch custom event to notify of changes
      window.dispatchEvent(new Event('commentsUpdated'));
      return newComments;
    });
  };
  const handleResolveComment = (commentId: string) => {
    setInitialComment(
      initialComments.map((comment) =>
        comment.id === commentId ? { ...comment, resolved: true } : comment,
      ),
    );
  };

  const handleUnresolveComment = (commentId: string) => {
    setInitialComment(
      initialComments.map((comment) =>
        comment.id === commentId ? { ...comment, resolved: false } : comment,
      ),
    );
  };
  const handleDeleteComment = (commentId: string) => {
    setInitialComment(
      initialComments.filter((comment) => comment.id !== commentId),
    );
  };

  //To handle comments from consumer side

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
          <IconButton
            variant={'ghost'}
            icon="Presentation"
            size="md"
            onClick={() => {
              commentDrawerOpen && setCommentDrawerOpen(false);
              setIsPresentationMode(true);
            }}
          />
          <div className="relative">
            <IconButton
              variant={'ghost'}
              icon="MessageSquareText"
              size="md"
              onClick={() => {
                // Mark all comments as viewed when opening drawer
                if (!commentDrawerOpen) {
                  const allComments = initialComments.map(comment => comment.id);
                  localStorage.setItem('viewedComments', JSON.stringify(allComments));
                  // Dispatch custom event to notify of changes
                  window.dispatchEvent(new Event('commentsUpdated'));
                }
                setCommentDrawerOpen((prev) => !prev);
              }}
            />
            <div className="absolute top-0 right-0">
              <CommentNotification />
            </div>
          </div>
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
        commentDrawerOpen={commentDrawerOpen}
        setCommentDrawerOpen={setCommentDrawerOpen}
        isPresentationMode={isPresentationMode}
        setIsPresentationMode={setIsPresentationMode}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        isNavbarVisible={isNavbarVisible}
        setIsNavbarVisible={setIsNavbarVisible}
        onInlineComment={(): void => { }}
        onMarkdownImport={(): void => { }}
        onMarkdownExport={(): void => { }}
        initialComments={initialComments}
        onCommentReply={handleReplyOnComment}
        onNewComment={handleNewComment}
        setInitialComments={setInitialComment}
        onResolveComment={handleResolveComment}
        onUnresolveComment={handleUnresolveComment}
        onDeleteComment={handleDeleteComment}
      />
      <Toaster
        position={!isMobile ? 'bottom-right' : 'center-top'}
        duration={3000}
      />
    </div>
  );
}

export default App;
