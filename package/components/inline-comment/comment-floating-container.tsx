import React, { useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Button,
  cn,
  Divider,
  TextAreaFieldV2,
  TextField,
} from '@fileverse/ui';
import { Editor } from '@tiptap/react';
import { CommentCard } from './comment-card';
import { IComment } from '../../extensions/comment';
import { useCommentStore } from '../../stores/comment-store';
import {
  CommentFloatingDraftCard,
  CommentFloatingThreadCard,
} from './context/types';
import { DeleteConfirmOverlay } from './delete-confirm-overlay';
import { useCommentListContainer } from './use-comment-list-container';
import EnsLogo from '../../assets/ens.svg';

const FLOATING_CARD_WIDTH = 300;

const FloatingAuthPrompt = () => {
  const connectViaWallet = useCommentStore((s) => s.connectViaWallet);
  const connectViaUsername = useCommentStore((s) => s.connectViaUsername);
  const isLoading = useCommentStore((s) => s.isLoading);
  const [name, setName] = useState('');

  return (
    <div className="p-3 pt-0 flex flex-col gap-2">
      <div className="flex gap-2">
        <TextField
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name) {
              connectViaUsername?.(name);
            }
          }}
          className="font-normal text-body-sm"
          placeholder="Enter a name"
        />
        <Button
          onClick={() => connectViaUsername?.(name)}
          disabled={!name || isLoading}
          isLoading={isLoading}
          className="min-w-[60px]"
          size="sm"
        >
          Join
        </Button>
      </div>
      <div className="text-[11px] text-gray-400 flex items-center">
        <Divider direction="horizontal" size="sm" className="flex-grow" />
        <span className="px-2 whitespace-nowrap">
          or join with <span className="font-semibold">.eth</span>
        </span>
        <Divider direction="horizontal" size="sm" className="flex-grow" />
      </div>
      <Button
        onClick={connectViaWallet ?? undefined}
        disabled={isLoading}
        variant="ghost"
        size="sm"
        className="w-full"
      >
        <img alt="ens-logo" src={EnsLogo} className="w-4 h-4 mr-1" />
        {isLoading ? 'Connecting...' : 'Continue with ENS'}
      </Button>
    </div>
  );
};

const FloatingCardShell = React.forwardRef<
  HTMLDivElement,
  {
    floatingCardId: string;
    isHidden: boolean;
    isFocused: boolean;
    onFocus: () => void;
    children: React.ReactNode;
  }
>(({ floatingCardId, isHidden, isFocused, onFocus, children }, ref) => {
  return (
    <div
      ref={ref}
      data-floating-comment-card={floatingCardId}
      className={cn(
        'absolute left-0 top-0 w-[300px] pb-[12px] rounded-[12px] border will-change-transform transition-[box-shadow,border-color] duration-150 ease-out',
        isFocused
          ? 'shadow-elevation-3 color-bg-default color-border-default'
          : 'color-bg-secondary ',
      )}
      style={{
        contain: 'layout style paint',
        visibility: isHidden ? 'hidden' : 'visible',
        opacity: isHidden ? 0 : 1,
      }}
      onMouseDown={onFocus}
    >
      {children}
    </div>
  );
});

FloatingCardShell.displayName = 'FloatingCardShell';

const DraftFloatingCard = ({
  draft,
  isHidden,
  registerCardNode,
}: {
  draft: CommentFloatingDraftCard;
  isHidden: boolean;
  registerCardNode: (
    floatingCardId: string,
    node: HTMLDivElement | null,
  ) => void;
}) => {
  const cancelFloatingDraft = useCommentStore((s) => s.cancelFloatingDraft);
  const focusFloatingCard = useCommentStore((s) => s.focusFloatingCard);
  const submitFloatingDraft = useCommentStore((s) => s.submitFloatingDraft);
  const updateFloatingDraftText = useCommentStore(
    (s) => s.updateFloatingDraftText,
  );
  const username = useCommentStore((s) => s.username);
  const isConnected = useCommentStore((s) => s.isConnected);
  const draftCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!draft.isFocused || isHidden) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const focusTarget = draftCardRef.current?.querySelector<
        HTMLTextAreaElement | HTMLInputElement
      >('textarea, input');

      focusTarget?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [draft.isFocused, isHidden]);

  return (
    <FloatingCardShell
      ref={(node) => {
        draftCardRef.current = node;
        registerCardNode(draft.floatingCardId, node);
      }}
      floatingCardId={draft.floatingCardId}
      isHidden={isHidden}
      isFocused={draft.isFocused}
      onFocus={() => focusFloatingCard(draft.floatingCardId)}
    >
      {!isConnected ? (
        <FloatingAuthPrompt />
      ) : (
        <>
          <div className="flex items-center gap-2 color-border-default px-3 py-2">
            <Avatar
              src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(
                username || '',
              )}`}
              className="w-[24px] h-[24px]"
            />
            <p className="text-body-sm-bold">{username}</p>
          </div>
          <div className="flex flex-col gap-3 p-3 pt-0">
            <div className="border flex px-[12px] py-[8px] gap-[8px] rounded-[4px]">
              <TextAreaFieldV2
                value={draft.draftText}
                onChange={(event) =>
                  updateFloatingDraftText(draft.draftId, event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    (!event.shiftKey || event.metaKey)
                  ) {
                    event.preventDefault();
                    submitFloatingDraft(draft.draftId);
                  }
                }}
                className="color-bg-default w-full text-body-sm color-text-default !p-0 !border-none h-[20px] max-h-[296px] overflow-y-auto no-scrollbar whitespace-pre-wrap"
                placeholder="Add a comment"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                className="!w-[80px] !min-w-[80px]"
                onClick={() => cancelFloatingDraft(draft.draftId)}
              >
                Cancel
              </Button>
              <Button
                className="w-20 min-w-20"
                disabled={!draft.draftText.trim()}
                onClick={() => submitFloatingDraft(draft.draftId)}
              >
                Send
              </Button>
            </div>
          </div>
        </>
      )}
    </FloatingCardShell>
  );
};

const ThreadFloatingCard = ({
  thread,
  comment,
  tabName,
  isHidden,
  registerCardNode,
}: {
  thread: CommentFloatingThreadCard;
  comment: IComment | undefined;
  tabName: string;
  isHidden: boolean;
  registerCardNode: (
    floatingCardId: string,
    node: HTMLDivElement | null,
  ) => void;
}) => {
  const blurFloatingCard = useCommentStore((s) => s.blurFloatingCard);
  const focusFloatingCard = useCommentStore((s) => s.focusFloatingCard);
  const handleAddReply = useCommentStore((s) => s.handleAddReply);
  const isConnected = useCommentStore((s) => s.isConnected);
  const resolveComment = useCommentStore((s) => s.resolveComment);
  const setCommentDrawerOpen = useCommentStore((s) => s.setCommentDrawerOpen);
  const username = useCommentStore((s) => s.username);
  const deleteComment = useCommentStore((s) => s.deleteComment);
  const isDDocOwner = useCommentStore((s) => s.isDDocOwner);
  const handleInput = useCommentStore((s) => s.handleInput);
  const [replyText, setReplyText] = useState('');
  const [isDeleteOverlayVisible, setIsDeleteOverlayVisible] = useState(false);

  const isCommentOwner =
    Boolean(comment?.username && comment.username === username) || isDDocOwner;
  const canReply = !comment?.resolved && Boolean(comment);

  const onReplySubmit = () => {
    if (!thread.commentId || !replyText.trim()) {
      return;
    }

    if (!isConnected) {
      setCommentDrawerOpen?.(true);
      return;
    }

    handleAddReply(thread.commentId, replyText);
    setReplyText('');
  };

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

  return (
    <FloatingCardShell
      ref={(node) => registerCardNode(thread.floatingCardId, node)}
      floatingCardId={thread.floatingCardId}
      isHidden={isHidden}
      isFocused={thread.isFocused}
      onFocus={() => focusFloatingCard(thread.floatingCardId)}
    >
      <div className="flex flex-col gap-[8px]">
        <p className="text-helper-text-sm px-[12px] pt-[12px] h-[26px] max-w-[270px] truncate color-text-secondary">
          {tabName}
        </p>
        <CommentCard
          id={comment?.id}
          username={comment?.username}
          selectedContent={comment?.selectedContent || thread.selectedText}
          comment={comment?.content}
          createdAt={comment?.createdAt}
          isFocused={thread.isFocused}
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
        {thread.isFocused && !isConnected && <FloatingAuthPrompt />}
        {thread.isFocused && isConnected && (
          <div className="group p-3 pt-0">
            <div className="border flex px-[12px] py-[8px] gap-[8px] rounded-[4px]">
              <Avatar
                src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(
                  username || '',
                )}`}
                className="w-[16px] h-[16px]"
              />
              <TextAreaFieldV2
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                onInput={(event) =>
                  handleInput(event, event.currentTarget.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    (!event.shiftKey || event.metaKey)
                  ) {
                    event.preventDefault();
                    onReplySubmit();
                  }
                }}
                style={{
                  ...(!comment ? { height: '20px' } : {}),
                }}
                className="color-bg-default w-full text-body-sm color-text-default !p-0 !border-none h-[20px] max-h-[296px] overflow-y-auto no-scrollbar whitespace-pre-wrap"
                placeholder={canReply ? 'Add a reply' : 'Thread resolved'}
                disabled={!canReply}
              />
            </div>
            <div className="hidden items-center justify-end gap-2 pt-2 group-focus-within:flex">
              <Button
                variant={'ghost'}
                className="w-20 min-w-20"
                onClick={() => {
                  setReplyText('');
                  blurFloatingCard(thread.floatingCardId);
                }}
              >
                <p className="text-body-sm-bold">Cancel</p>
              </Button>
              <Button
                className="w-20 min-w-20"
                disabled={!canReply || !replyText.trim()}
                onClick={onReplySubmit}
              >
                Send
              </Button>
            </div>
          </div>
        )}
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

export const CommentFloatingContainer = ({
  editor,
  editorWrapperRef,
  scrollContainerRef,
  tabName,
  isHidden,
}: {
  editor: Editor;
  editorWrapperRef: React.RefObject<HTMLDivElement>;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  tabName: string;
  isHidden: boolean;
}) => {
  const comments = useCommentStore((s) => s.tabComments);
  const {
    floatingCardListContainerRef,
    mountedFloatingCards,
    registerCardNode,
    shouldRender,
  } = useCommentListContainer({
    editor,
    editorWrapperRef,
    scrollContainerRef,
    isHidden,
  });

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      ref={floatingCardListContainerRef}
      className={cn(
        'comment-floating-rail relative shrink-0',
        isHidden && 'pointer-events-none',
      )}
      data-floating-comment-hidden={isHidden ? 'true' : 'false'}
      style={{
        width: FLOATING_CARD_WIDTH,
        minHeight: '100%',
      }}
    >
      {mountedFloatingCards.map((floatingCard) => {
        if (floatingCard.type === 'draft') {
          return (
            <DraftFloatingCard
              key={floatingCard.floatingCardId}
              draft={floatingCard}
              isHidden={isHidden}
              registerCardNode={registerCardNode}
            />
          );
        }

        const comment = comments.find(
          (entry) => entry.id === floatingCard.commentId,
        );

        return (
          <ThreadFloatingCard
            key={floatingCard.floatingCardId}
            thread={floatingCard}
            comment={comment}
            tabName={tabName}
            isHidden={isHidden}
            registerCardNode={registerCardNode}
          />
        );
      })}
    </div>
  );
};
