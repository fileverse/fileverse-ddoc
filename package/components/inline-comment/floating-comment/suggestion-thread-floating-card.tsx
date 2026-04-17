import { Avatar, Button, IconButton, TextAreaFieldV2, cn } from '@fileverse/ui';
import { useEffect, useRef, useState } from 'react';
import { useCommentStore } from '../../../stores/comment-store';
import EnsLogo from '../../../assets/ens.svg';
import verifiedMark from '../../../assets/ens-check.svg';
import { dateFormatter, nameFormatter } from '../../../utils/helpers';
import { useEnsStatus } from '../use-ens-status';
import { resizeInlineCommentTextarea } from '../resize-inline-comment-textarea';
import { FloatingCardShell } from './floating-card-shell';
import type { ThreadFloatingCardProps } from './types';

/**
 * SuggestionThreadFloatingCard
 *
 * Shown in place of the generic ThreadFloatingCard for submitted suggestions
 * (comments with `isSuggestion: true`). Renders the Figma-specified layout:
 * author + timestamp header, Accept/Reject (owner) or Withdraw (author)
 * actions, a one-line diff summary (Add/Delete/Replace), and a reply input.
 *
 * Renders from the underlying IComment — the same source ThreadFloatingCard
 * uses — so once a draft is submitted, nothing else in the pipeline needs
 * to change to show the suggestion here.
 */
export const SuggestionThreadFloatingCard = ({
  thread,
  comment,
  isHidden,
  registerCardNode,
}: ThreadFloatingCardProps) => {
  const focusFloatingCard = useCommentStore((s) => s.focusFloatingCard);
  const focusCommentInEditor = useCommentStore((s) => s.focusCommentInEditor);
  const isDDocOwner = useCommentStore((s) => s.isDDocOwner);
  const currentUsername = useCommentStore((s) => s.username);
  const mySubmittedIds = useCommentStore((s) => s.mySubmittedSuggestionIds);
  const acceptSuggestion = useCommentStore((s) => s.acceptSuggestion);
  const deleteComment = useCommentStore((s) => s.deleteComment);

  if (!comment) return null;

  const handleFocus = () => {
    focusFloatingCard(thread.floatingCardId);
    if (!thread.isFocused && thread.commentId) {
      focusCommentInEditor(thread.commentId);
    }
  };

  // Authored by this viewer if either the stored username matches or the
  // session-local "submitted by me" set has the id (covers viewers without
  // a persistent username).
  const isAuthor =
    Boolean(comment.username && comment.username === currentUsername) ||
    (comment.id ? mySubmittedIds.has(comment.id) : false);
  const canAcceptReject = isDDocOwner;
  const canWithdraw = !isDDocOwner && isAuthor;

  const handleAccept = () => {
    if (!thread.commentId) return;
    acceptSuggestion(thread.commentId);
  };

  const handleReject = () => {
    if (!thread.commentId) return;
    deleteComment(thread.commentId);
  };

  return (
    <FloatingCardShell
      ref={(node) => registerCardNode(thread.floatingCardId, node)}
      floatingCardId={thread.floatingCardId}
      isHidden={isHidden}
      isFocused={thread.isFocused}
      onFocus={handleFocus}
    >
      <div className="flex flex-col gap-2 p-3">
        <Header
          username={comment.username}
          createdAt={comment.createdAt}
          canAcceptReject={canAcceptReject}
          canWithdraw={canWithdraw}
          onAccept={handleAccept}
          onReject={handleReject}
        />

        <DiffSummary comment={comment} />

        <RepliesList comment={comment} />

        <ReplyField thread={thread} comment={comment} />
      </div>
    </FloatingCardShell>
  );
};

// ---------------------------------------------------------------------------
// Header — avatar + username + timestamp + Accept/Reject/Withdraw icons
// ---------------------------------------------------------------------------

interface HeaderProps {
  username: string | undefined;
  createdAt: Date | undefined;
  canAcceptReject: boolean;
  canWithdraw: boolean;
  onAccept: () => void;
  onReject: () => void;
}

const Header = ({
  username,
  createdAt,
  canAcceptReject,
  canWithdraw,
  onAccept,
  onReject,
}: HeaderProps) => {
  const ensStatus = useEnsStatus(username);

  return (
    <div className="flex items-center gap-2">
      <Avatar
        src={
          ensStatus.isEns
            ? EnsLogo
            : `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(
                ensStatus.name,
              )}`
        }
        size="sm"
        className="min-w-6"
      />
      <span className="text-body-sm-bold inline-flex items-center gap-1 whitespace-nowrap">
        {nameFormatter(ensStatus.name)}
        {ensStatus.isEns && (
          <img src={verifiedMark} alt="verified" className="w-3.5 h-3.5" />
        )}
      </span>
      <span className="text-helper-text-sm color-text-secondary whitespace-nowrap">
        {createdAt && dateFormatter(createdAt)}
      </span>
      <div className="ml-auto flex items-center gap-1">
        {canAcceptReject && (
          <>
            <IconButton
              icon="Check"
              variant="ghost"
              size="sm"
              onClick={onAccept}
              title="Accept suggestion"
            />
            <IconButton
              icon="X"
              variant="ghost"
              size="sm"
              onClick={onReject}
              title="Reject suggestion"
            />
          </>
        )}
        {canWithdraw && (
          <IconButton
            icon="X"
            variant="ghost"
            size="sm"
            onClick={onReject}
            title="Withdraw suggestion"
          />
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// DiffSummary — one-line suggestion description
//   Add:     Add: "lorem"
//   Delete:  Delete: "concepts"
//   Replace: Replace: "concepts" with "lorem"
// ---------------------------------------------------------------------------

const DiffSummary = ({
  comment,
}: {
  comment: NonNullable<ThreadFloatingCardProps['comment']>;
}) => {
  const {
    suggestionType,
    originalContent = '',
    suggestedContent = '',
  } = comment;

  if (suggestionType === 'add') {
    return (
      <p className="text-body-sm">
        <span className="font-semibold">Add:</span>{' '}
        <span>&ldquo;{suggestedContent}&rdquo;</span>
      </p>
    );
  }

  if (suggestionType === 'delete') {
    return (
      <p className="text-body-sm">
        <span className="font-semibold">Delete:</span>{' '}
        <span className="line-through">&ldquo;{originalContent}&rdquo;</span>
      </p>
    );
  }

  if (suggestionType === 'replace') {
    return (
      <p className="text-body-sm">
        <span className="font-semibold">Replace:</span>{' '}
        <span className="line-through">&ldquo;{originalContent}&rdquo;</span>{' '}
        <span className="font-semibold">with</span>{' '}
        <span>&ldquo;{suggestedContent}&rdquo;</span>
      </p>
    );
  }

  return null;
};

// ---------------------------------------------------------------------------
// RepliesList — renders existing replies under the diff summary so users see
// their reply show up after sending (the generic CommentCard's reply renderer
// is coupled to its thread header, so we render a compact list inline here).
// ---------------------------------------------------------------------------

const RepliesList = ({
  comment,
}: {
  comment: NonNullable<ThreadFloatingCardProps['comment']>;
}) => {
  const replies = (comment.replies ?? []).filter((reply) => !reply.deleted);
  if (replies.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 pt-1">
      {replies.map((reply) => (
        <ReplyRow
          key={reply.id}
          username={reply.username}
          createdAt={reply.createdAt}
          content={reply.content ?? ''}
        />
      ))}
    </div>
  );
};

const ReplyRow = ({
  username,
  createdAt,
  content,
}: {
  username: string | undefined;
  createdAt: Date | undefined;
  content: string;
}) => {
  const ensStatus = useEnsStatus(username);

  return (
    <div className="flex items-start gap-2">
      <Avatar
        src={
          ensStatus.isEns
            ? EnsLogo
            : `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(
                ensStatus.name,
              )}`
        }
        size="sm"
        className="min-w-6 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-body-sm-bold truncate">
            {nameFormatter(ensStatus.name)}
          </span>
          <span className="text-helper-text-sm color-text-secondary whitespace-nowrap">
            {createdAt && dateFormatter(createdAt)}
          </span>
        </div>
        <p className="text-body-sm whitespace-pre-wrap break-words">
          {content}
        </p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ReplyField — same behavior as ThreadFloatingCard's reply input, scoped here
// ---------------------------------------------------------------------------

const ReplyField = ({
  thread,
  comment,
}: {
  thread: ThreadFloatingCardProps['thread'];
  comment: NonNullable<ThreadFloatingCardProps['comment']>;
}) => {
  const username = useCommentStore((s) => s.username);
  const isConnected = useCommentStore((s) => s.isConnected);
  const handleAddReply = useCommentStore((s) => s.handleAddReply);
  const setCommentDrawerOpen = useCommentStore((s) => s.setCommentDrawerOpen);
  const [replyText, setReplyText] = useState('');
  const replyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canReply = !comment.resolved && !comment.deleted;

  useEffect(() => {
    if (replyTextareaRef.current) {
      resizeInlineCommentTextarea(replyTextareaRef.current);
    }
  }, [replyText]);

  const handleSubmit = () => {
    if (!thread.commentId || !replyText.trim()) return;
    if (!isConnected) {
      setCommentDrawerOpen?.(true);
      return;
    }
    handleAddReply(thread.commentId, replyText);
    setReplyText('');
  };

  if (!canReply) return null;

  return (
    <div className={cn('flex items-start gap-2 pt-1')}>
      <Avatar
        src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(
          username ?? 'anon',
        )}`}
        size="sm"
        className="min-w-6 mt-1"
      />
      <div className="flex-1">
        <TextAreaFieldV2
          ref={replyTextareaRef}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Reply"
          className="resize-none"
        />
      </div>
      <Button
        size="sm"
        disabled={!replyText.trim()}
        onClick={handleSubmit}
        className="!min-w-[64px]"
      >
        Send
      </Button>
    </div>
  );
};
