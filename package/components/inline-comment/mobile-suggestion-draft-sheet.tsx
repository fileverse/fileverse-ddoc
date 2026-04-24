import { Avatar, Button, IconButton } from '@fileverse/ui';
import { DeleteConfirmOverlay } from './delete-confirm-overlay';
import { FloatingAuthPrompt } from './floating-comment/floating-auth-prompt';
import { useEnsStatus } from './use-ens-status';
import EnsLogo from '../../assets/ens.svg';
import verifiedMark from '../../assets/ens-check.svg';
import { dateFormatter, nameFormatter } from '../../utils/helpers';
import type { SuggestionFloatingDraftCard } from './context/types';

interface MobileSuggestionDraftProps {
  activeSuggestionDraftCard: SuggestionFloatingDraftCard;
  isConnected: boolean;
  isDiscardSuggestionOverlayVisible: boolean;
  username: string | null;
  onAttemptClose: () => void;
  onCancelDiscard: () => void;
  onConfirmDiscard: () => void;
  onFocusSuggestionText: () => void;
  onSubmit: () => void;
}

export const MobileSuggestionDraft = ({
  activeSuggestionDraftCard,
  isConnected,
  isDiscardSuggestionOverlayVisible,
  username,
  onAttemptClose,
  onCancelDiscard,
  onConfirmDiscard,
  onFocusSuggestionText,
  onSubmit,
}: MobileSuggestionDraftProps) => {
  const ensStatus = useEnsStatus(username);
  const hasSuggestionOriginal = Boolean(activeSuggestionDraftCard.selectedText);
  const hasSuggestionInserted = Boolean(activeSuggestionDraftCard.insertedText);
  const canSubmitSuggestion = hasSuggestionOriginal || hasSuggestionInserted;
  const suggestionType = hasSuggestionOriginal
    ? hasSuggestionInserted
      ? 'replace'
      : 'delete'
    : hasSuggestionInserted
      ? 'add'
      : null;

  return (
    <div
      data-mobile-comment-drawer-sheet
      className="p-4 rounded-t-[12px] shadow-[0_-12px_32px_rgba(0,0,0,0.18)] w-full color-bg-secondary"
      onClick={(event) => {
        if (isDiscardSuggestionOverlayVisible) {
          return;
        }

        const target = event.target as HTMLElement;

        if (target.closest('button')) {
          return;
        }

        onFocusSuggestionText();
      }}
    >
      <div className="flex justify-between mb-[16px] items-center">
        <h2 className="text-heading-sm">New Suggestion</h2>
        <div className="flex gap-sm">
          <IconButton
            onClick={onAttemptClose}
            icon={'X'}
            variant="ghost"
            size="md"
          />
        </div>
      </div>
      {!isConnected ? (
        <FloatingAuthPrompt />
      ) : (
        <div className="flex flex-col gap-[8px]">
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
            <span className="text-body-sm-bold inline-flex items-center gap-1 min-w-0">
              <span className="truncate">{nameFormatter(ensStatus.name)}</span>
              {ensStatus.isEns && (
                <img
                  src={verifiedMark}
                  alt="verified"
                  className="w-3.5 h-3.5"
                />
              )}
            </span>
            <span className="text-helper-text-sm color-text-secondary whitespace-nowrap">
              {dateFormatter(Date.now())}
            </span>
          </div>

          <div className="text-body-sm color-text-default ml-[32px] break-words">
            {suggestionType === 'add' && (
              <p>
                <span className="font-semibold">Add:</span>{' '}
                <span>
                  &ldquo;{activeSuggestionDraftCard.insertedText}&rdquo;
                </span>
              </p>
            )}
            {suggestionType === 'delete' && (
              <p>
                <span className="font-semibold">Delete:</span>{' '}
                <span className="line-through">
                  &ldquo;{activeSuggestionDraftCard.selectedText}&rdquo;
                </span>
              </p>
            )}
            {suggestionType === 'replace' && (
              <p>
                <span className="font-semibold">Replace:</span>{' '}
                <span className="line-through">
                  &ldquo;{activeSuggestionDraftCard.selectedText}&rdquo;
                </span>{' '}
                <span className="font-semibold">with</span>{' '}
                <span>
                  &ldquo;{activeSuggestionDraftCard.insertedText}&rdquo;
                </span>
              </p>
            )}
            {!suggestionType && (
              <p className="color-text-secondary italic">
                Start typing to suggest a change
              </p>
            )}
          </div>

          <div className="flex items-center justify-end">
            <Button
              size="sm"
              disabled={!canSubmitSuggestion}
              onClick={onSubmit}
              className="!min-w-[80px]"
            >
              Submit
            </Button>
          </div>
        </div>
      )}
      <DeleteConfirmOverlay
        isVisible={isDiscardSuggestionOverlayVisible}
        title="Discard suggestion"
        heading="Discard suggestion"
        description="This action will discard your suggestion."
        confirmLabel="Discard"
        onCancel={onCancelDiscard}
        onConfirm={onConfirmDiscard}
      />
    </div>
  );
};
