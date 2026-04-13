import { Avatar, Button, TextAreaFieldV2 } from '@fileverse/ui';
import { useEffect, useRef } from 'react';
import { useCommentStore } from '../../../stores/comment-store';
import { resizeInlineCommentTextarea } from '../resize-inline-comment-textarea';
import { FloatingAuthPrompt } from './floating-auth-prompt';
import { FloatingCardShell } from './floating-card-shell';
import type { DraftFloatingCardProps } from './types';
import { InlineCommentDraft } from '../context/types';

export const DraftFloatingCard = ({
  draft,
  isHidden,
  registerCardNode,
}: DraftFloatingCardProps) => {
  const focusFloatingCard = useCommentStore((s) => s.focusFloatingCard);
  const draftState = useCommentStore((s) => s.inlineDrafts[draft.draftId]);
  const username = useCommentStore((s) => s.username);
  const isConnected = useCommentStore((s) => s.isConnected);
  const draftCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!draftState || !draft.isFocused || isHidden) {
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
  }, [draft.isFocused, draftState, isHidden]);

  if (!draftState) {
    return null;
  }

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
          <InputField draftState={draftState} draft={draft} />
        </>
      )}
    </FloatingCardShell>
  );
};

const InputField = ({
  draftState,
  draft,
}: {
  draftState: InlineCommentDraft;
  draft: DraftFloatingCardProps['draft'];
}) => {
  const submitInlineDraft = useCommentStore((s) => s.submitInlineDraft);
  const updateInlineDraftText = useCommentStore((s) => s.updateInlineDraftText);

  const cancelInlineDraft = useCommentStore((s) => s.cancelInlineDraft);
  const draftTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!draftTextareaRef.current) {
      return;
    }

    resizeInlineCommentTextarea(draftTextareaRef.current);
  }, [draftState?.text]);
  return (
    <div className="flex flex-col gap-3 p-3 pt-0">
      <div className="border flex px-[12px] py-[8px] gap-[8px] rounded-[4px]">
        <TextAreaFieldV2
          ref={draftTextareaRef}
          value={draftState.text}
          onChange={(event) => {
            // Floating comments and the drawer both edit the same draft record.
            updateInlineDraftText(draft.draftId, event.target.value);
            resizeInlineCommentTextarea(event.currentTarget);
          }}
          onInput={(event) => resizeInlineCommentTextarea(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (!event.shiftKey || event.metaKey)) {
              event.preventDefault();
              submitInlineDraft(draft.draftId);
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
          onClick={() => cancelInlineDraft(draft.draftId)}
        >
          Cancel
        </Button>
        <Button
          className="w-20 min-w-20"
          disabled={!draftState.text.trim()}
          onClick={() => submitInlineDraft(draft.draftId)}
        >
          Send
        </Button>
      </div>
    </div>
  );
};
