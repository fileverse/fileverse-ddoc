import React from 'react';
import {
  Avatar,
  ButtonGroup,
  LucideIcon,
  TextAreaFieldV2,
  Button,
  cn,
} from '@fileverse/ui';
import { CommentCard } from './comment-card';
import { useComments } from './context/comment-context';
import { useCommentActions } from './use-comment-actions';

export const CommentSection = ({
  activeCommentId,
}: {
  activeCommentId: string | null;
}) => {
  const {
    comments,
    username,
    walletAddress,
    focusCommentInEditor,
    editor,
    setComments,
    handleReplyChange,
    handleCommentChange,
    handleCommentKeyDown,
    handleReplySubmit,
    setOpenReplyId,
    handleReplyKeyDown,
    openReplyId,
    showResolved,
    commentsSectionRef,
    comment,
    reply,
    handleCommentSubmit,
  } = useComments();
  const { handleResolveComment, handleUnresolveComment, handleDeleteComment } =
    useCommentActions({
      editor,
      comments,
      setComments,
    });

  const filteredComments = comments.filter((comment) =>
    showResolved ? true : !comment.resolved,
  );

  return (
    <React.Fragment>
      <div
        ref={commentsSectionRef}
        className="flex flex-col px-3 max-h-[60vh] overflow-y-scroll no-scrollbar"
      >
        {filteredComments.map((comment) => (
          <div
            key={comment.id}
            className={cn(
              'flex flex-col gap-1 w-full box-border transition-all border-b color-border-default last:border-b-0',
              comment.id === activeCommentId &&
                'translate-x-[-4px] !opacity-100',
              comment.id !== activeCommentId && 'translate-x-0 !opacity-70',
            )}
            onClick={() => focusCommentInEditor(comment.id)}
          >
            <CommentCard
              id={comment.id}
              activeCommentId={activeCommentId as string}
              username={username as string}
              walletAddress={walletAddress as string}
              selectedText={comment.selectedContent}
              comment={comment.content}
              replies={comment.replies}
              onResolve={() => handleResolveComment(comment.id)}
              onUnresolve={() => handleUnresolveComment(comment.id)}
              onDelete={() => handleDeleteComment(comment.id)}
              isResolved={comment.resolved}
            />

            <div
              className={cn(
                'p-3 flex flex-col gap-2',
                openReplyId === comment.id && 'ml-5 pl-4',
                (comment.id !== activeCommentId || comment.resolved) &&
                  'hidden',
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
                  disabled={comment.id !== activeCommentId}
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
                      'bg-white text-body-sm color-text-secondary min-h-[40px] max-h-[96px] overflow-y-auto no-scrollbar px-3 py-2 whitespace-pre-wrap',
                      comment.id === activeCommentId && 'bg-white',
                    )}
                    id={comment.id}
                    onChange={handleReplyChange}
                    onKeyDown={handleReplyKeyDown}
                    autoFocus
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
      <div className="flex flex-col gap-3 color-bg-secondary border-t color-border-default px-6 py-5 rounded-b-lg min-h-[15vh] absolute bottom-0 w-full">
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
          className="bg-white w-full text-body-sm color-text-secondary min-h-[40px] max-h-[96px] overflow-y-auto no-scrollbar px-3 py-2 whitespace-pre-wrap"
          placeholder="Type your comment"
        />

        <div className="flex justify-end">
          <Button
            onClick={handleCommentSubmit}
            className="px-4 py-2 w-20 min-w-20 h-9"
            disabled={!comment.trim()}
          >
            Send
          </Button>
        </div>
      </div>
    </React.Fragment>
  );
};
