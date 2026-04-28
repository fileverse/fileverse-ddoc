import { Avatar, Button, cn, TextAreaFieldV2 } from '@fileverse/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCommentStore } from '../../../stores/comment-store';
import { CommentCard } from '../comment-card';
import { DeleteConfirmOverlay } from '../delete-confirm-overlay';
import { resizeInlineCommentTextarea } from '../resize-inline-comment-textarea';
import { FloatingAuthPrompt } from './floating-auth-prompt';
import { FloatingCardShell } from './floating-card-shell';
import type { ThreadFloatingCardProps } from './types';
import { useEnsStatus } from '../use-ens-status';
import EnsLogo from '../../../assets/ens.svg';

export const ThreadFloatingCard = ({
  thread,
  comment,
  tabName,
  isHidden,
  registerCardNode,
  isCollaborationEnabled,
}: ThreadFloatingCardProps) => {
  const focusFloatingCard = useCommentStore((s) => s.focusFloatingCard);
  const focusCommentInEditor = useCommentStore((s) => s.focusCommentInEditor);
  const isConnected = useCommentStore((s) => s.isConnected);
  const resolveComment = useCommentStore((s) => s.resolveComment);

  const username = useCommentStore((s) => s.username);
  const deleteComment = useCommentStore((s) => s.deleteComment);
  const isDDocOwner = useCommentStore((s) => s.isDDocOwner);
  const [isDeleteOverlayVisible, setIsDeleteOverlayVisible] = useState(false);

  const isCommentOwner =
    Boolean(comment?.username && comment.username === username) || isDDocOwner;

  const handleDeleteOverlayOpen = () => {
    if (!thread.commentId) {
      return;
    }

    setIsDeleteOverlayVisible(true);
  };

  const handleDeleteOverlayClose = () => {
    setIsDeleteOverlayVisible(false);
  };

  const handleConfirmDelete = () => {
    if (!thread.commentId) {
      return;
    }

    setIsDeleteOverlayVisible(false);
    deleteComment(thread.commentId);
  };

  const handleThreadFocus = () => {
    focusFloatingCard(thread.floatingCardId);

    if (!thread.isFocused && thread.commentId) {
      focusCommentInEditor(thread.commentId);
    }
  };
  const handleCardNode = useCallback(
    (node: HTMLDivElement | null) => {
      registerCardNode(thread.floatingCardId, node);
    },
    [registerCardNode, thread.floatingCardId],
  );

  return (
    <FloatingCardShell
      ref={handleCardNode}
      floatingCardId={thread.floatingCardId}
      isHidden={isHidden}
      isFocused={thread.isFocused}
      onFocus={handleThreadFocus}
    >
      <div className="flex flex-col gap-[8px]">
        <div className="w-full px-[12px] items-center gap-[8px] pt-[12px] flex">
          <p className="text-helper-text-sm shrink-0 color-text-secondary">
            {tabName}
          </p>
          <p className="text-helper-text-sm truncate color-text-secondary">
            {comment?.selectedContent || thread.selectedText}
          </p>
        </div>
        <CommentCard
          id={comment?.id}
          username={comment?.username}
          selectedContent={comment?.selectedContent || thread.selectedText}
          comment={comment?.content}
          createdAt={comment?.createdAt}
          isFocused={thread.isFocused}
          onFocusRequest={handleThreadFocus}
          replies={comment?.replies}
          isResolved={comment?.resolved}
          isDropdown
          onResolve={resolveComment}
          onRequestDelete={handleDeleteOverlayOpen}
          isCommentOwner={isCommentOwner}
          isDisabled={Boolean(
            comment &&
              !Object.prototype.hasOwnProperty.call(comment, 'commentIndex'),
          )}
          version={comment?.version}
          emptyComment={!comment}
        />
        {thread.isFocused && !isConnected && !isCollaborationEnabled && (
          <FloatingAuthPrompt />
        )}
        <div className="px-3">
          <InputField
            comment={comment}
            thread={thread}
            isCollaborationEnabled={isCollaborationEnabled}
          />
        </div>

        <DeleteConfirmOverlay
          isVisible={isDeleteOverlayVisible}
          title="Delete this comment thread ?"
          onCancel={handleDeleteOverlayClose}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </FloatingCardShell>
  );
};

const InputField = ({
  comment,
  thread,
  isCollaborationEnabled,
}: {
  comment: ThreadFloatingCardProps['comment'];
  thread: ThreadFloatingCardProps['thread'];
  isCollaborationEnabled?: boolean;
}) => {
  const username = useCommentStore((s) => s.username);
  const [isReplyInputFocused, setIsReplyInputFocused] = useState(false);
  const canReply = !comment?.resolved && Boolean(comment);
  const setCommentDrawerOpen = useCommentStore((s) => s.setCommentDrawerOpen);
  const handleAddReply = useCommentStore((s) => s.handleAddReply);
  const editRequest = useCommentStore((s) => s.editRequest);
  const clearEditRequest = useCommentStore((s) => s.clearEditRequest);
  const replyEditTarget = useCommentStore((s) => s.replyEditTarget);
  const setReplyEditTarget = useCommentStore((s) => s.setReplyEditTarget);
  const cancelReplyEdit = useCommentStore((s) => s.cancelReplyEdit);
  const editCompletion = useCommentStore((s) => s.editCompletion);
  const editCommentContent = useCommentStore((s) => s.editCommentContent);
  const editReplyContent = useCommentStore((s) => s.editReplyContent);
  const replyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [replyText, setReplyText] = useState('');
  const isConnected = useCommentStore((s) => s.isConnected);
  const ensStatus = useEnsStatus(username);
  const onReplySubmit = () => {
    if (!thread.commentId || !replyText.trim()) {
      return;
    }

    if (!isConnected) {
      setCommentDrawerOpen?.(true);
      return;
    }

    if (replyEditTarget?.commentId === thread.commentId) {
      if (replyEditTarget.kind === 'comment') {
        editCommentContent(replyEditTarget.commentId, replyText);
      } else if (replyEditTarget.replyId) {
        editReplyContent(
          replyEditTarget.commentId,
          replyEditTarget.replyId,
          replyText,
        );
      }

      setReplyText('');
      cancelReplyEdit();
      return;
    }

    handleAddReply(thread.commentId, replyText);
    setReplyText('');
  };
  const hasUnsentReply = Boolean(replyText.trim());
  const isEditingThisThread = replyEditTarget?.commentId === thread.commentId;
  const isSendDisabled = Boolean(
    !canReply ||
      !replyText.trim() ||
      (isEditingThisThread &&
        replyText.trim() === (replyEditTarget?.originalText ?? '').trim()),
  );
  const shouldShowReplyInputField = isCollaborationEnabled
    ? thread.isFocused
    : isConnected && (thread.isFocused || hasUnsentReply);

  useEffect(() => {
    if (!replyTextareaRef.current) {
      return;
    }

    resizeInlineCommentTextarea(replyTextareaRef.current);
  }, [replyText]);

  useEffect(() => {
    if (!editRequest || !thread.commentId) {
      return;
    }

    if (editRequest.commentId !== thread.commentId) {
      return;
    }

    setReplyText(editRequest.text);
    setReplyEditTarget({
      kind: editRequest.kind,
      commentId: editRequest.commentId,
      replyId: editRequest.replyId,
      originalText: editRequest.text,
    });
    clearEditRequest(editRequest.requestId);
    replyTextareaRef.current?.focus();
  }, [clearEditRequest, editRequest, setReplyEditTarget, thread.commentId]);

  useEffect(() => {
    if (!editCompletion || !thread.commentId) {
      return;
    }

    if (editCompletion.commentId !== thread.commentId) {
      return;
    }

    setReplyText('');
    cancelReplyEdit();
  }, [cancelReplyEdit, editCompletion, thread.commentId]);

  if (!shouldShowReplyInputField) return;
  return (
    <div className="group">
      <div
        className={cn(
          'border flex px-[12px] py-[8px] gap-[8px] rounded-[4px]',
          isCollaborationEnabled ? 'color-bg-disabled' : 'color-bg-default',
        )}
      >
        <Avatar
          src={
            ensStatus.isEns
              ? EnsLogo
              : `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(
                  ensStatus.name,
                )}`
          }
          className="w-[16px] h-[16px]"
        />
        <TextAreaFieldV2
          ref={replyTextareaRef}
          value={replyText}
          onChange={(event) => {
            setReplyText(event.target.value);
            resizeInlineCommentTextarea(event.currentTarget);
          }}
          onFocus={() => setIsReplyInputFocused(true)}
          onBlur={() => setIsReplyInputFocused(false)}
          onInput={(event) => resizeInlineCommentTextarea(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (!event.shiftKey || event.metaKey)) {
              event.preventDefault();
              onReplySubmit();
            }
          }}
          className="color-bg-default w-full text-body-sm color-text-default !p-0 !border-none h-[20px] max-h-[296px] overflow-y-auto no-scrollbar whitespace-pre-wrap"
          placeholder={
            isCollaborationEnabled
              ? 'Cannot send reply in collaboration mode'
              : canReply
                ? 'Add a reply'
                : 'Thread resolved'
          }
          disabled={!canReply || isCollaborationEnabled}
        />
      </div>
      <div
        className={cn(
          'items-center justify-end gap-2 pt-2',
          hasUnsentReply || isReplyInputFocused ? 'flex' : 'hidden',
        )}
      >
        <Button
          variant="ghost"
          className="w-20 min-w-20"
          onClick={(event) => {
            event.stopPropagation();
            setReplyText('');
            setIsReplyInputFocused(false);
            cancelReplyEdit();
          }}
        >
          <p className="text-body-sm-bold">Cancel</p>
        </Button>
        <Button
          className="w-20 min-w-20"
          disabled={isSendDisabled || isCollaborationEnabled}
          onClick={onReplySubmit}
        >
          Send
        </Button>
      </div>
    </div>
  );
};
