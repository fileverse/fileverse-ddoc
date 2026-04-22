import { Button, IconButton } from '@fileverse/ui';
import { useCommentStore } from '../../../stores/comment-store';
import { FloatingCardShell } from './floating-card-shell';
import { FloatingAuthPrompt } from './floating-auth-prompt';
import type { SuggestionDraftFloatingCardProps } from './types';

/**
 * SuggestionDraftFloatingCard
 *
 * Shown while a viewer is composing a suggestion (in suggestion mode).
 * Uses the same one-line diff format as the submitted thread card
 * (Add: "X" / Delete: "X" / Replace: "X" with "Y") plus a Submit action
 * and a Discard (X) button.
 *
 * When the viewer hasn't joined yet (no username / wallet), the card
 * renders FloatingAuthPrompt inside — same pattern as the inline-comment
 * draft card. The first keystroke that triggered this card is preserved
 * as the draft's first character; once the viewer joins, the card
 * transitions to the normal diff/Submit UI without losing what they typed.
 */
export const SuggestionDraftFloatingCard = ({
  card,
  isHidden,
  registerCardNode,
}: SuggestionDraftFloatingCardProps) => {
  const focusFloatingCard = useCommentStore((s) => s.focusFloatingCard);
  const submitDraft = useCommentStore((s) => s.submitDraft);
  const discardDraft = useCommentStore((s) => s.discardDraft);
  const isConnected = useCommentStore((s) => s.isConnected);

  const hasOriginal = Boolean(card.selectedText);
  const hasInserted = Boolean(card.insertedText);
  const canSubmit = hasOriginal || hasInserted;

  const suggestionType: 'add' | 'delete' | 'replace' | null = hasOriginal
    ? hasInserted
      ? 'replace'
      : 'delete'
    : hasInserted
      ? 'add'
      : null;

  return (
    <FloatingCardShell
      ref={(node) => registerCardNode(card.floatingCardId, node)}
      floatingCardId={card.floatingCardId}
      isHidden={isHidden}
      isFocused={card.isFocused}
      onFocus={() => focusFloatingCard(card.floatingCardId)}
    >
      {!isConnected ? (
        <FloatingAuthPrompt />
      ) : (
        <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            {suggestionType === 'add' && (
              <p className="text-body-sm">
                <span className="font-semibold">Add:</span>{' '}
                <span>&ldquo;{card.insertedText}&rdquo;</span>
              </p>
            )}
            {suggestionType === 'delete' && (
              <p className="text-body-sm">
                <span className="font-semibold">Delete:</span>{' '}
                <span className="line-through">
                  &ldquo;{card.selectedText}&rdquo;
                </span>
              </p>
            )}
            {suggestionType === 'replace' && (
              <p className="text-body-sm">
                <span className="font-semibold">Replace:</span>{' '}
                <span className="line-through">
                  &ldquo;{card.selectedText}&rdquo;
                </span>{' '}
                <span className="font-semibold">with</span>{' '}
                <span>&ldquo;{card.insertedText}&rdquo;</span>
              </p>
            )}
            {!suggestionType && (
              <p className="text-body-sm color-text-secondary italic">
                Start typing to suggest a change
              </p>
            )}
          </div>
          <IconButton
            icon="X"
            variant="ghost"
            size="sm"
            onClick={() => discardDraft(card.suggestionId)}
            title="Discard suggestion"
          />
        </div>

        <div className="flex items-center justify-end">
          <Button
            size="sm"
            disabled={!canSubmit}
            onClick={() => submitDraft(card.suggestionId)}
            className="!min-w-[80px]"
          >
            Submit
          </Button>
        </div>
        </div>
      )}
    </FloatingCardShell>
  );
};
