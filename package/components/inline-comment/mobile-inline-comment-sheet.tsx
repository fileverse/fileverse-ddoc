import { useRef } from 'react';
import { Avatar, IconButton, TextAreaFieldV2 } from '@fileverse/ui';
import { DeleteConfirmOverlay } from './delete-confirm-overlay';
import { resizeInlineCommentTextarea } from './resize-inline-comment-textarea';
import type { InlineCommentDraft } from './context/types';

interface MobileInlineCommentProps {
  activeDraft: InlineCommentDraft | null;
  activeDraftId: string | null;
  isDiscardCommentOverlayVisible: boolean;
  mobileDraftRef: React.RefObject<HTMLDivElement>;
  onAttemptClose: () => void;
  onCancelDiscard: () => void;
  onConfirmDiscard: () => void;
  onSubmit: () => void;
  onUpdateDraftText: (draftId: string, text: string) => void;
}

export const MobileInlineComment = ({
  activeDraft,
  activeDraftId,
  isDiscardCommentOverlayVisible,
  mobileDraftRef,
  onAttemptClose,
  onCancelDiscard,
  onConfirmDiscard,
  onSubmit,
  onUpdateDraftText,
}: MobileInlineCommentProps) => {
  const mobileDraftTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <div
      ref={mobileDraftRef}
      data-mobile-comment-drawer-sheet
      className="p-4 rounded-t-[12px] shadow-[0_-12px_32px_rgba(0,0,0,0.18)] w-full color-bg-secondary"
    >
      <div className="flex justify-between mb-[16px] items-center">
        <h2 className="text-heading-sm">New Comment</h2>
        <div className="flex gap-sm">
          <IconButton
            onClick={onAttemptClose}
            icon={'X'}
            variant="ghost"
            size="md"
          />
        </div>
      </div>
      <div className="border flex px-[12px] items-center justify-between py-[8px] gap-[8px] rounded-[4px]">
        <Avatar
          src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(
            '',
          )}`}
          className="w-[16px] h-[16px]"
        />
        <TextAreaFieldV2
          ref={mobileDraftTextareaRef}
          value={activeDraft?.text || ''}
          autoFocus
          onChange={(event) => {
            if (activeDraftId) {
              onUpdateDraftText(activeDraftId, event.target.value);
            }

            resizeInlineCommentTextarea(event.currentTarget);
          }}
          onInput={(event) => resizeInlineCommentTextarea(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (!event.shiftKey || event.metaKey)) {
              event.preventDefault();
              onSubmit();
            }
          }}
          className="color-bg-default w-full text-body-sm color-text-default !p-0 !border-none h-[20px] max-h-[296px] overflow-y-auto no-scrollbar whitespace-pre-wrap"
          placeholder="Add a comment"
        />
        <IconButton
          onClick={onSubmit}
          icon={'SendHorizontal'}
          variant="ghost"
          disabled={!activeDraft?.text.trim()}
          className="!min-w-[24px] !w-[24px] !min-h-[24px] !h-[24px]"
        />
      </div>
      <DeleteConfirmOverlay
        isVisible={isDiscardCommentOverlayVisible}
        title="Discard comment"
        heading="Discard comment"
        description="This action will discard your comment."
        confirmLabel="Discard"
        onCancel={onCancelDiscard}
        onConfirm={onConfirmDiscard}
      />
    </div>
  );
};
