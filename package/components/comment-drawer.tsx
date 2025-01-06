import {
  ButtonGroup,
  Button,
  TextAreaFieldV2,
  DynamicDrawerV2,
  Avatar,
  LucideIcon,
  Tooltip,
  IconButton,
} from '@fileverse/ui';
import { Editor } from '@tiptap/react';
import { IComment } from '../extensions/comment';
import { CommentCard } from './comment-card';
import cn from 'classnames';
import { useState, useEffect } from 'react';
import { commentsService } from '../utils/comments-service';
import uuid from 'react-uuid';

interface CommentDrawerProps {
  commentsSectionRef: React.RefObject<HTMLDivElement>;
  isOpen: boolean;
  onClose: () => void;
  comments: IComment[];
  activeCommentId: string | null;
  username?: string;
  walletAddress?: string;
  editor: Editor;
  setComments: (comments: IComment[]) => void;
  setActiveCommentId: (id: string | null) => void;
  focusCommentInEditor: (id: string) => void;
  handleAddReply: (
    comments: IComment[],
    activeCommentId: string,
    content: string,
    setComments: (comments: IComment[]) => void,
  ) => void;
  isNavbarVisible: boolean;
  isPresentationMode: boolean;
}

export const CommentDrawer = ({
  commentsSectionRef,
  isOpen,
  onClose,
  comments,
  activeCommentId,
  username,
  walletAddress,
  editor,
  setComments,
  setActiveCommentId,
  focusCommentInEditor,
  handleAddReply,
  isNavbarVisible,
  isPresentationMode,
}: CommentDrawerProps) => {
  const [reply, setReply] = useState('');
  const [openReplyId, setOpenReplyId] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    // Subscribe to Y.js updates
    const unsubscribe = commentsService.subscribe(async () => {
      const allComments = commentsService.getAllThreads();
      setComments(allComments);

      // Update active comment if exists
      if (activeCommentId) {
        const activeComment = await commentsService.getThread(activeCommentId);
        if (activeComment) {
          const updatedComments = allComments.map((c) =>
            c.id === activeCommentId ? activeComment : c
          );
          setComments(updatedComments);
        }
      }
    });

    // Initial load
    const allComments = commentsService.getAllThreads();
    setComments(allComments);

    return () => unsubscribe();
  }, [setComments, activeCommentId]);

  const handleReplyChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReply(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleReplySubmit();
    }
  };

  const handleReplySubmit = async () => {
    if (reply.trim() && activeCommentId) {
      const parentThread = await commentsService.getThread(activeCommentId);
      if (!parentThread) return;

      const replyComment = {
        id: `reply-${uuid()}`,
        comment: reply,
        replies: [],
        createdAt: new Date(),
        selectedContent: parentThread.selectedContent,
      };

      const updatedThread = await commentsService.addReply(
        activeCommentId,
        replyComment,
      );
      if (updatedThread) {
        setReply('');
        setOpenReplyId(null);
      }
    }
  };

  const handleCommentUpdate = (commentId: string, value: string) => {
    const updatedThread = commentsService.updateThread(commentId, {
      comment: value,
    });
    if (updatedThread) {
      // Y.js will automatically trigger an update through the subscription
      setComments(
        comments.map((c) => (c.id === commentId ? updatedThread : c)),
      );
    }
  };

  const handleReplyToThread = (threadId: string, content: string) => {
    if (content.trim()) {
      handleAddReply(comments, threadId, content, setComments);
      setActiveCommentId(null);
      editor.commands.focus();
    }
  };

  return (
    <DynamicDrawerV2
      open={isOpen}
      onOpenChange={onClose}
      side="right"
      rounded={true}
      dismissible
      className={cn(
        'w-[calc(100vw-24px)] !z-[50] min-h-[70vh] md:w-[384px] right-0 shadow-elevation-4 rounded-[16px]',
        isOpen && 'right-2 md:!right-4',
        isNavbarVisible
          ? 'top-[7.25rem] h-[calc(98vh-140px)]'
          : 'top-[4rem] h-[calc(100vh-90px)] xl:h-[calc(99vh-90px)]',
        isPresentationMode && 'h-[calc(100vh-5rem)] top-[4rem]',
      )}
      headerClassName="border-b color-border-default p-4"
      contentClassName="!rounded-lg min-h-[70vh] p-0 !h-full select-text"
      title="Comments"
      content={
        <>
          <div className="absolute top-0 right-10 p-3 space-x-2">
            {/* TODO: Add a button to clear all comments */}
            <Tooltip sideOffset={0} position="bottom" text="Clear all comments">
              <IconButton
                variant="ghost"
                size="md"
                className="text-[#FB3449]"
                icon="Trash2"
                onClick={() => {
                  commentsService.clearAll();
                  setComments([]);
                }}
              />
            </Tooltip>
            <Tooltip
              text={showResolved ? 'Show resolved' : 'Hide resolved'}
              sideOffset={0}
              position="bottom"
            >
              <IconButton
                icon={showResolved ? 'CircleCheck' : 'CircleCheck2'}
                variant="ghost"
                size="md"
                onClick={() => setShowResolved(!showResolved)}
              />
            </Tooltip>
          </div>
          <div
            ref={commentsSectionRef}
            className="flex flex-col max-h-[60vh] overflow-y-scroll no-scrollbar"
          >
            {comments.map((c) => (
              <div
                key={c.id}
                className={cn(
                  'flex flex-col gap-1 w-full box-border transition-opacity duration-300 border-b color-border-default last:border-b-0',
                  c.id === activeCommentId && '!opacity-100',
                  c.id !== activeCommentId && 'opacity-50',
                )}
                onClick={() => focusCommentInEditor(c.id)}
              >
                <CommentCard
                  username={username as string}
                  walletAddress={walletAddress as string}
                  selectedContent={c.selectedContent}
                  comment={c.comment}
                  replies={c.replies}
                />

                <div
                  className={cn(
                    'p-3 flex flex-col gap-2',
                    openReplyId === c.id && 'ml-5 pl-4',
                  )}
                >
                  {openReplyId !== c.id ? (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenReplyId(c.id);
                      }}
                      className="w-full h-9 rounded-full color-bg-secondary flex items-center justify-center gap-2"
                      variant="ghost"
                    >
                      <LucideIcon name="MessageSquarePlus" />
                      <span className="text-body-sm-bold">
                        Reply to this thread
                      </span>
                    </Button>
                  ) : (
                    <div className="animate-in slide-in-from-bottom flex flex-col gap-2 duration-300">
                      <TextAreaFieldV2
                        placeholder="Reply"
                        value={c.comment || ''}
                        disabled={c.id !== activeCommentId}
                        className={cn(
                          'bg-white text-body-sm color-text-secondary min-h-[40px] max-h-[96px] overflow-y-auto no-scrollbar px-3 py-2',
                          c.id === activeCommentId && 'bg-white',
                        )}
                        id={c.id}
                        onChange={(event) => {
                          const value = (event.target as HTMLTextAreaElement)
                            .value;
                          handleCommentUpdate(c.id, value);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            handleReplyToThread(c.id, c.comment);
                          }
                        }}
                      />
                      {c.id === activeCommentId && (
                        <ButtonGroup className="w-full justify-end">
                          <Button
                            variant="ghost"
                            className="px-4 py-2 w-20 min-w-20 h-9"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenReplyId(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            className="px-4 py-2 w-20 min-w-20 h-9"
                            disabled={!c.comment.trim()}
                            onClick={() => handleReplyToThread(c.id, c.comment)}
                          >
                            Reply
                          </Button>
                        </ButtonGroup>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 color-bg-secondary border-t color-border-default p-3 rounded-b-lg min-h-[15vh] fixed bottom-0 w-full">
            <div className="flex justify-start items-center gap-2">
              <Avatar src={''} size="sm" className="min-w-6" />
              <span className="text-body-sm-bold">
                {username || walletAddress || 'Anonymous'}
              </span>
            </div>
            <TextAreaFieldV2
              value={reply}
              onChange={handleReplyChange}
              onKeyDown={handleKeyDown}
              className="bg-white w-full text-body-sm color-text-secondary min-h-[40px] max-h-[96px] overflow-y-auto no-scrollbar px-3 py-2"
              placeholder="Type your comment"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleReplySubmit}
                className="px-4 py-2 w-20 min-w-20 h-9"
              >
                Send
              </Button>
            </div>
          </div>
        </>
      }
    />
  );
};
