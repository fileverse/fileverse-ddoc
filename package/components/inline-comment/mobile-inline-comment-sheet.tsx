import { useRef } from 'react';
import {
  Avatar,
  Button,
  IconButton,
  LucideIcon,
  TextAreaFieldV2,
} from '@fileverse/ui';
import { DeleteConfirmOverlay } from './delete-confirm-overlay';
import { resizeInlineCommentTextarea } from './resize-inline-comment-textarea';
import type { InlineCommentDraft } from './context/types';
import { useCommentStore } from '../../stores/comment-store';
import { useEnsStatus } from './use-ens-status';
import EnsLogo from '../../assets/ens.svg';
import { useCommentDraftAutoSubmitCountdown } from './use-comment-draft-auto-submit-countdown';

interface MobileInlineCommentProps {
  activeDraft: InlineCommentDraft | null;
  activeDraftId: string | null;
  isConnected: boolean;
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
  isConnected,
  isDiscardCommentOverlayVisible,
  mobileDraftRef,
  onAttemptClose,
  onCancelDiscard,
  onConfirmDiscard,
  onSubmit,
  onUpdateDraftText,
}: MobileInlineCommentProps) => {
  const mobileDraftTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const username = useCommentStore((s) => s.username);
  const ensStatus = useEnsStatus(username);
  const { handleDraftBlur, handleDraftFocus, submitLabel } =
    useCommentDraftAutoSubmitCountdown({
      draftId: activeDraftId,
      canAutoSubmit:
        isConnected &&
        Boolean(activeDraftId) &&
        Boolean(activeDraft?.text.trim()) &&
        !isDiscardCommentOverlayVisible,
      onSubmit,
    });

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
          ref={mobileDraftTextareaRef}
          value={activeDraft?.text || ''}
          autoFocus
          onChange={(event) => {
            if (activeDraftId) {
              onUpdateDraftText(activeDraftId, event.target.value);
            }

            resizeInlineCommentTextarea(event.currentTarget);
          }}
          onFocus={handleDraftFocus}
          onBlur={handleDraftBlur}
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
        <Button
          size="sm"
          onClick={onSubmit}
          variant="ghost"
          disabled={!activeDraft?.text.trim()}
          title={submitLabel}
          className="!min-w-[96px] shrink-0 !px-2"
        >
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <LucideIcon name="SendHorizontal" size="sm" />
            {submitLabel}
          </span>
        </Button>
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
