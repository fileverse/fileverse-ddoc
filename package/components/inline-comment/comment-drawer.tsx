import React from 'react';
import {
  DynamicDrawerV2,
  Tooltip,
  IconButton,
  DynamicDrawer,
} from '@fileverse/ui';
import cn from 'classnames';
import { useState } from 'react';
import { useResponsive } from '../../utils/responsive';
import { useCommentActions } from './use-comment-actions';
import { CommentDrawerProps } from './types';
import { CommentSection } from './comment-section';

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
  const { isBelow1280px } = useResponsive();

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
    // setActiveCommentId(null);
    // editor.commands.focus();
  };

  const { handleResolveComment, handleUnresolveComment, handleDeleteComment } =
    useCommentActions({
      editor,
      comments,
      setComments,
    });

  const commentSectionProps = {
    commentsSectionRef,
    comments,
    activeCommentId,
    username,
    walletAddress,
    reply,
    comment,
    openReplyId,
    handleReplyChange,
    handleCommentChange,
    handleCommentKeyDown,
    handleCommentSubmit,
    handleKeyDown,
    handleReplySubmit,
    setOpenReplyId,
    focusCommentInEditor,
    handleResolveComment,
    handleUnresolveComment,
    handleDeleteComment,
    showResolved,
  };

  const toggleResolved = () => {
    setShowResolved(!showResolved);
  };

  return (
    <div>
      {isBelow1280px ? (
        <DynamicDrawer
          open={isOpen}
          onOpenChange={onClose}
          noOverlay
          side="right"
          className="p-0 !w-screen md:!w-[384px]"
          content={
            <React.Fragment>
              <div className="flex px-4 py-3 border-b flex-row gap-4 items-center">
                <p className="text-heading-sm">Comments</p>
                <div className="absolute top-[2px] right-10 p-2">
                  <Tooltip
                    text={showResolved ? 'Hide resolved' : 'Show resolved'}
                    sideOffset={0}
                    position="bottom"
                  >
                    <IconButton
                      icon={showResolved ? 'CircleCheck2' : 'CircleCheck'}
                      variant="ghost"
                      size="md"
                      className="p-1 !min-w-8 !w-8 !h-8 aspect-square"
                      onClick={toggleResolved}
                    />
                  </Tooltip>
                </div>
              </div>
              <CommentSection {...commentSectionProps} />
            </React.Fragment>
          }
        />
      ) : (
        <DynamicDrawerV2
          open={isOpen}
          onOpenChange={onClose}
          side="right"
          rounded={true}
          dismissible
          className={cn(
            'w-[calc(100vw-24px)] !z-50 min-h-[70vh] md:w-[384px] right-0 shadow-elevation-4 rounded-[16px]',
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
            <React.Fragment>
              <div className="absolute top-0 right-10 p-3">
                <Tooltip
                  text={showResolved ? 'Hide resolved' : 'Show resolved'}
                  sideOffset={0}
                  position="bottom"
                >
                  <IconButton
                    icon={showResolved ? 'CircleCheck2' : 'CircleCheck'}
                    variant="ghost"
                    size="md"
                    onClick={toggleResolved}
                  />
                </Tooltip>
              </div>
              <CommentSection {...commentSectionProps} />
            </React.Fragment>
          }
        />
      )}
    </div>
  );
};
