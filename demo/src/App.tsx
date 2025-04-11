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
  DynamicDropdown,
  ThemeToggle,
} from '@fileverse/ui';
import { useMediaQuery } from 'usehooks-ts';
import { IComment } from '../../package/extensions/comment';
import {
  TableOfContents,
  getHierarchicalIndexes,
} from '@tiptap-pro/extension-table-of-contents';
import { ReminderBlock } from '../../package/extensions/reminder-block/reminder-block';
import { Reminder } from '../../package/extensions/reminder-block/types';
import notificationService from './services/NotificationService';
import reminderDB from './services/ReminderDB';

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

  const [inlineCommentData, setInlineCommentData] = useState({
    inlineCommentText: '',
    highlightedTextContent: '',
    handleClick: false,
  });

  const [zoomLevel, setZoomLevel] = useState<string>('1');
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

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

  // Add state for reminders
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (collaborationId) {
      const name = prompt('Whats your username');
      if (!name) return;
      setUsername(name);
      setEnableCollaboration(true);
    }
  }, [collaborationId]);

  // Initialize notification service and load reminders
  useEffect(() => {
    // Get the current notification permission status
    setNotificationPermission(Notification.permission);

    // Load existing reminders from the database
    const loadReminders = async () => {
      try {
        const storedReminders = await reminderDB.getAllReminders();
        console.log('Loaded reminders from database:', storedReminders);
        setReminders(storedReminders);
      } catch (error) {
        console.error('Error loading reminders:', error);
      }
    };

    loadReminders();

    // Initialize notification service if permission is granted
    if (Notification.permission === 'granted') {
      notificationService.initialize()
        .then(initialized => {
          if (initialized) {
            console.log('Notification service initialized successfully');
          } else {
            console.warn('Failed to initialize notification service');
          }
        });
    }
  }, []);

  // Handle requesting notification permission
  const requestNotificationPermission = async () => {
    try {
      const permission = await notificationService.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        await notificationService.initialize();
        toast({
          title: 'Notifications enabled!',
          description: 'You will receive reminders when they are due.',
          variant: 'success'
        });
      } else {
        toast({
          title: 'Notification permission denied',
          description: 'You will not receive reminder notifications.',
          variant: 'danger'
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: 'Permission Error',
        description: 'Failed to request notification permission.',
        variant: 'danger'
      });
    }
  };

  // Handle creating a reminder
  const handleReminderCreate = async (reminder: Reminder) => {
    try {
      console.log('Creating reminder:', reminder);

      // Add reminder to state
      setReminders(prev => [...prev, reminder]);

      // Schedule notification for the reminder
      await notificationService.scheduleReminderNotification(reminder);

      // Show toast notification
      toast({
        title: 'Reminder Scheduled',
        description: `Reminder scheduled for ${new Date(reminder.timestamp).toLocaleString()}`,
        variant: 'success'
      });

      // Request notification permission if not granted yet
      if (notificationPermission !== 'granted') {
        await requestNotificationPermission();
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast({
        title: 'Error',
        description: 'Failed to create reminder',
        variant: 'danger'
      });
    }
  };

  // Handle deleting a reminder
  const handleReminderDelete = async (reminderId: string) => {
    try {
      console.log('Deleting reminder:', reminderId);

      // Remove from state
      setReminders(prev => prev.filter(r => r.id !== reminderId));

      // Delete from database
      await reminderDB.deleteReminder(reminderId);

      toast({
        title: 'Success',
        description: 'Reminder deleted',
        variant: 'success'
      });
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete reminder',
        variant: 'danger'
      });
    }
  };

  // Handle updating a reminder
  const handleReminderUpdate = async (reminder: Reminder) => {
    try {
      console.log('Updating reminder:', reminder);

      // Update in state
      setReminders(prev => prev.map(r => (r.id === reminder.id ? reminder : r)));

      // Update in database
      await reminderDB.updateReminder(reminder);

      toast({
        title: 'Success',
        description: 'Reminder updated',
        variant: 'success'
      });
    } catch (error) {
      console.error('Error updating reminder:', error);
      toast({
        title: 'Error',
        description: 'Failed to update reminder',
        variant: 'danger'
      });
    }
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
            </>
          )}
          <IconButton
            variant={'ghost'}
            icon="MessageSquareText"
            size="md"
            onClick={() => setCommentDrawerOpen((prev) => !prev)}
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

  const handleConnectViaUsername = async (username: string) => {
    setUsername(username);
    setIsConnected(true);
  };

  return (
    <div>
      <DdocEditor
        enableCollaboration={enableCollaboration}
        collaborationId={collaborationId}
        username={username}
        setUsername={setUsername}
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
        onComment={(): void => {}}
        onInlineComment={(): void => {}}
        onMarkdownImport={(): void => {}}
        onMarkdownExport={(): void => {}}
        onPdfExport={(): void => {}}
        initialComments={initialComments}
        onCommentReply={handleReplyOnComment}
        onNewComment={handleNewComment}
        setInitialComments={setInitialComment}
        onResolveComment={handleResolveComment}
        onUnresolveComment={handleUnresolveComment}
        onDeleteComment={handleDeleteComment}
        showTOC={showTOC}
        setShowTOC={setShowTOC}
        proExtensions={{
          TableOfContents,
          getHierarchicalIndexes,
        }}
        extensions={[
          ReminderBlock.configure({
            onReminderCreate: handleReminderCreate,
            onReminderDelete: handleReminderDelete,
            onReminderUpdate: handleReminderUpdate,
            reminders: reminders,
          }),
        ]}
        isConnected={isConnected}
        connectViaWallet={async () => {}}
        isLoading={false}
        connectViaUsername={handleConnectViaUsername}
        isDDocOwner={true}
        walletAddress={username}
        onCopyHeadingLink={(link: string) => {
          navigator.clipboard.writeText(link);
        }}
      />
      <Toaster
        position={!isMobile ? 'bottom-right' : 'center-top'}
        duration={3000}
      />
    </div>
  );
}

export default App;
