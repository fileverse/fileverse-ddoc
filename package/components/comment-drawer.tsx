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
import { useState } from 'react';

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
    replyContent: string,
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
  const [comment, setComment] = useState('');
  const [openReplyId, setOpenReplyId] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const handleReplyChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReply(event.target.value);
  };

  const handleCommentChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setComment(event.target.value);
  };

  const handleCommentKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleCommentSubmit();
    }
  };

  const handleCommentSubmit = () => {
    if (!comment.trim()) return;

    console.log('comment', comment);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleReplySubmit();
    }
  };

  const handleReplySubmit = () => {
    if (!activeCommentId || !reply.trim()) return;

    handleAddReply(comments, activeCommentId, reply, setComments);
    setReply('');
    setOpenReplyId(null);
    setActiveCommentId(null);
    editor.commands.focus();
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
          <div className="absolute top-0 right-10 p-3">
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
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={cn(
                  'flex flex-col gap-1 w-full box-border transition-opacity duration-300 border-b color-border-default last:border-b-0',
                  comment.id === activeCommentId && '!opacity-100',
                  comment.id !== activeCommentId && 'opacity-50',
                )}
                onClick={() => focusCommentInEditor(comment.id)}
              >
                <CommentCard
                  username={username as string}
                  walletAddress={walletAddress as string}
                  selectedText={comment.selectedContent}
                  comment={comment.content}
                  replies={comment.replies}
                />

                <div
                  className={cn(
                    'p-3 flex flex-col gap-2',
                    openReplyId === comment.id && 'ml-5 pl-4',
                  )}
                >
                  {openReplyId !== comment.id ? (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenReplyId(comment.id);
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
                        value={reply}
                        disabled={comment.id !== activeCommentId}
                        className={cn(
                          'bg-white text-body-sm color-text-secondary min-h-[40px] max-h-[96px] overflow-y-auto no-scrollbar px-3 py-2',
                          comment.id === activeCommentId && 'bg-white',
                        )}
                        id={comment.id}
                        onChange={handleReplyChange}
                        onKeyDown={handleKeyDown}
                      />
                      {comment.id === activeCommentId && (
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
                            disabled={!reply.trim()}
                            onClick={handleReplySubmit}
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
              value={comment}
              onChange={handleCommentChange}
              onKeyDown={handleCommentKeyDown}
              className="bg-white w-full text-body-sm color-text-secondary min-h-[40px] max-h-[96px] overflow-y-auto no-scrollbar px-3 py-2"
              placeholder="Type your comment"
            />

            <div className="flex justify-end">
              <Button
                onClick={handleCommentSubmit}
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
