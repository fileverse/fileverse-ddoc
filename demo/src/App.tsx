import { useEffect, useRef, useState } from 'react';
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
  DynamicDropdown,
  ThemeToggle,
} from '@fileverse/ui';
import { useMediaQuery } from 'usehooks-ts';
import { IComment } from '../../package/extensions/comment';
import { fromUint8Array } from 'js-base64';
import { crypto as cryptoUtils } from './crypto';
import { collabStore } from './storage/collab-store';
import { DocumentStylingPanel } from './DocumentStylingPanel';
import { DocumentStyling, ICollaborationConfig } from '../../package/types';
import { getKeyFromURLParams } from './utils';

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
  const [username, setUsername] = useState('username');
  const [title, setTitle] = useState('Untitled');
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isMediaMax1280px = useMediaQuery('(max-width: 1280px)');
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);
  const [isCommentSectionOpen, setIsCommentSectionOpen] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [showTOC, setShowTOC] = useState<boolean>(false);
  const [collaborationId, setCollaborationId] = useState<string>('');

  // Document styling state - starts undefined to allow dark mode to work
  const [documentStyling, setDocumentStyling] = useState<
    DocumentStyling | undefined
  >(undefined);
  const [showStylingControls, setShowStylingControls] = useState(false);

  const [inlineCommentData, setInlineCommentData] = useState({
    inlineCommentText: '',
    highlightedTextContent: '',
    handleClick: false,
  });

  const [zoomLevel, setZoomLevel] = useState<string>('1');
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [disableInlineComment, setDisableInlineComment] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const paramCollaborationId = searchParams.get('collaborationId');
  const paramKey = getKeyFromURLParams(searchParams);
  const [collabConfig, setCollabConf] = useState<
    ICollaborationConfig | undefined
  >(undefined);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);

  useEffect(() => {
    const setupCollaboration = async () => {
      if (paramCollaborationId && paramKey) {
        const name = prompt('Whats your username');
        if (!name) return;

        setCollabConf({
          roomKey: paramKey,
          collaborationId: paramCollaborationId,
          username: name,
          isOwner: false,
          wsUrl: import.meta.env.VITE_COLLAB_WS_URL,
        });

        setEnableCollaboration(true);
      }
    };
    setupCollaboration();
  }, [paramCollaborationId, paramKey]);
  //To handle comments from consumer side

  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [initialComments, setInitialComment] = useState<IComment[]>([]);

  const handleReplyOnComment = (id: string, reply: IComment) => {
    setInitialComment((prev) =>
      prev.map((comment) => {
        if (comment.id === id) {
          return {
            ...comment,
            replies: [
              ...(comment.replies || []),
              { ...reply, commentIndex: comment.replies?.length },
            ],
          };
        }
        return comment; // Ensure you return the unchanged comment
      }),
    );
  };
  const handleNewComment = (comment: IComment) => {
    setInitialComment((prev) => [
      ...prev,
      { ...comment, commentIndex: prev.length, version: '2' },
    ]);
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
      initialComments.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            deleted: true,
          };
        } else {
          return { ...comment };
        }
      }),
    );
  };

  //To handle comments from consumer side

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const collabConfig = collabStore.getCollabConf();
    if (collabConfig) {
      setCollabConf(collabConfig);
      setCollaborationId(collabConfig.collaborationId);
      setUsername(collabConfig.username);
      setEnableCollaboration(true);
    }
  }, []);

  const onToggleCollaboration = async () => {
    const name = prompt('Whats your username');
    if (!name) return;
    const { privateKey } = cryptoUtils.generateKeyPair();

    const collaborationId = crypto.randomUUID();
    const privateKeyBase64 = fromUint8Array(privateKey, true);

    const collabConfig = {
      roomKey: privateKeyBase64,
      collaborationId,
      username: name,
      isOwner: true,
      ownerEdSecret: import.meta.env.VITE_OWNER_ED_SECRET,
      contractAddress: import.meta.env.VITE_COLLAB_CONTRACT_ADDRESS,
      ownerAddress: import.meta.env.VITE_COLLAB_OWNER_ADDRESS,
      isEns: true,
      wsUrl: import.meta.env.VITE_COLLAB_WS_URL,
    };
    setCollabConf(collabConfig);

    collabStore.setCollabConf(collabConfig);

    setCollaborationId(collaborationId);
    setUsername(name);
    setEnableCollaboration(true);
    console.log(
      `${window.location.origin}?collaborationId=${collaborationId}#key=${privateKeyBase64}`,
    );

    // copy to clipboard
    await navigator.clipboard.writeText(
      `${window.location.origin}?collaborationId=${collaborationId}#key=${privateKeyBase64}`,
    );

    toast({
      title: 'Collaboration link copied to clipboard',
      variant: 'success',
      hasIcon: true,
    });
  };

  const renderNavbar = ({ editor }: { editor: JSONContent }): JSX.Element => {
    const publishDoc = () => console.log(editor, title);

    return (
      <>
        <div className="flex items-center gap-[12px]">
          <IconButton variant={'ghost'} icon="Menu" size="md" />

          <div className="relative truncate inline-block xl:!max-w-[300px] !max-w-[108px] color-bg-default text-[14px] font-medium leading-[20px]">
            <span className="invisible whitespace-pre">
              {title || 'Untitled'}
            </span>
            <input
              className="focus:outline-none truncate color-bg-default absolute top-0 left-0 right-0 bottom-0 select-text"
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
              className="color-text-secondary"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <IconButton
            variant={'ghost'}
            icon={disableInlineComment ? 'EyeOff' : 'Eye'}
            size="md"
            onClick={() => setDisableInlineComment(!disableInlineComment)}
          />
          <ThemeToggle />

          {isMediaMax1280px ? (
            <DynamicDropdown
              key="navbar-more-actions"
              align="center"
              sideOffset={10}
              anchorTrigger={
                <IconButton
                  icon={'EllipsisVertical'}
                  variant="ghost"
                  size="md"
                />
              }
              content={
                <div className="flex flex-col gap-1 p-2 w-fit shadow-elevation-3 ">
                  <Button
                    variant={'ghost'}
                    onClick={() => setIsPresentationMode(true)}
                    className="flex justify-start gap-2"
                  >
                    <LucideIcon name="Presentation" size="sm" />
                    Slides
                  </Button>
                  <Button
                    variant={'ghost'}
                    onClick={() => setShowTOC(true)}
                    className="flex justify-start gap-2"
                  >
                    <LucideIcon name="List" size="sm" />
                    Document Outline
                  </Button>
                  <Button
                    variant={'ghost'}
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                    className="flex justify-start gap-2"
                  >
                    <LucideIcon
                      name={isPreviewMode ? 'Pencil' : 'PencilOff'}
                      size="sm"
                    />
                    {isPreviewMode ? 'Edit' : 'Preview'}
                  </Button>
                  <Button
                    variant={'ghost'}
                    onClick={() => {}}
                    className="flex justify-start gap-2"
                  >
                    <LucideIcon name="Share2" size="sm" />
                    Share
                  </Button>
                  <Button
                    variant={'ghost'}
                    onClick={() => setShowStylingControls(!showStylingControls)}
                    className="flex justify-start gap-2"
                  >
                    <LucideIcon name="Palette" size="sm" />
                    Styling
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              <IconButton
                variant={'ghost'}
                icon={isPreviewMode ? 'PencilOff' : 'Pencil'}
                size="md"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
              />
              <IconButton
                variant={'ghost'}
                icon="Presentation"
                size="md"
                onClick={() => {
                  commentDrawerOpen && setCommentDrawerOpen(false);
                  setIsPresentationMode(true);
                }}
              />
              <IconButton
                variant={'ghost'}
                icon="Share2"
                className="flex xl:hidden"
                size="md"
              />
              <IconButton
                variant={'ghost'}
                icon="Palette"
                size="md"
                onClick={() => setShowStylingControls(!showStylingControls)}
              />
            </>
          )}
          <IconButton
            variant={'ghost'}
            icon="MessageSquareText"
            size="md"
            onClick={() => setCommentDrawerOpen((prev) => !prev)}
          />
          {!enableCollaboration ? (
            <IconButton
              variant={'ghost'}
              icon="Users"
              size="md"
              onClick={onToggleCollaboration}
            />
          ) : (
            <DynamicDropdown
              key="navbar-more-actions"
              align="center"
              sideOffset={10}
              anchorTrigger={
                <IconButton icon={'Users'} variant="ghost" size="md" />
              }
              content={
                <div className="flex flex-col gap-1 p-2 w-fit shadow-elevation-3 ">
                  {collabConfig?.isOwner ? (
                    <Button
                      variant={'ghost'}
                      onClick={() => {
                        editorRef.current?.terminateSession();
                        setEnableCollaboration(false);
                        setCollabConf(undefined);
                        setCollaborationId('');
                        setUsername('');
                        collabStore.clearCollabConf();
                      }}
                    >
                      Stop Collaboration
                    </Button>
                  ) : null}
                  <Button
                    onClick={() => {
                      const base_name = 'sussy_baka';
                      const random_number = Math.floor(Math.random() * 1000000);
                      const new_name = `${base_name}_${random_number}`;
                      editorRef.current?.updateCollaboratorName(new_name);
                    }}
                    variant={'ghost'}
                  >
                    Update Collaborator Name
                  </Button>
                </div>
              }
            />
          )}

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

  const handleConnectViaUsername = async (username: string) => {
    setUsername(username);
    setIsConnected(true);
  };

  const onCollaboratorChange = (collaborators: unknown[] | undefined) => {
    console.log('onCollaboratorChange', collaborators);
  };

  return (
    <div>
      <DocumentStylingPanel
        isOpen={showStylingControls}
        onClose={() => setShowStylingControls(false)}
        documentStyling={documentStyling}
        onStylingChange={setDocumentStyling}
      />
      <DdocEditor
        ref={editorRef}
        enableCollaboration={enableCollaboration}
        collaborationId={collaborationId}
        username={username}
        setUsername={setUsername}
        isPreviewMode={isPreviewMode}
        disableInlineComment={disableInlineComment}
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
        onComment={(): void => {}}
        onInlineComment={(): void => {}}
        onMarkdownImport={(): void => {}}
        onMarkdownExport={(): void => {}}
        onPdfExport={(): void => {}}
        onHtmlExport={(): void => {}}
        onTxtExport={(): void => {}}
        onDocxImport={(): void => {}}
        initialComments={initialComments}
        onCommentReply={handleReplyOnComment}
        onNewComment={handleNewComment}
        setInitialComments={setInitialComment}
        onResolveComment={handleResolveComment}
        onUnresolveComment={handleUnresolveComment}
        onDeleteComment={handleDeleteComment}
        showTOC={showTOC}
        setShowTOC={setShowTOC}
        isConnected={isConnected}
        connectViaWallet={async () => {}}
        isLoading={false}
        connectViaUsername={handleConnectViaUsername}
        onCopyHeadingLink={(link: string) => {
          navigator.clipboard.writeText(link);
        }}
        collabConfig={collabConfig}
        onCollaboratorChange={onCollaboratorChange}
        documentStyling={documentStyling}
      />
      <Toaster
        position={!isMobile ? 'bottom-right' : 'center-top'}
        duration={3000}
      />
    </div>
  );
}

export default App;
