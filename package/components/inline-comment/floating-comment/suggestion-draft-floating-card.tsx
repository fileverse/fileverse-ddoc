import { Button } from '@fileverse/ui';
import { useCommentStore } from '../../../stores/comment-store';
import { FloatingCardShell } from './floating-card-shell';
import type { SuggestionDraftFloatingCardProps } from './types';

/**
 * SuggestionDraftFloatingCard
 *
 * Shown while a viewer is composing a suggestion (in suggestion mode).
 * Displays the original text (strikethrough) and the inserted text (green),
 * matching the inline decorations already visible in the editor.
 * Submit finalizes the suggestion; Discard undoes the edits.
 */
export const SuggestionDraftFloatingCard = ({
  card,
  isHidden,
  registerCardNode,
}: SuggestionDraftFloatingCardProps) => {
  const focusFloatingCard = useCommentStore((s) => s.focusFloatingCard);
  const submitDraft = useCommentStore((s) => s.submitDraft);
  const discardDraft = useCommentStore((s) => s.discardDraft);

  const hasOriginal = Boolean(card.selectedText);
  const hasInserted = Boolean(card.insertedText);
  const canSubmit = hasOriginal || hasInserted;

  return (
    <FloatingCardShell
      ref={(node) => registerCardNode(card.floatingCardId, node)}
      floatingCardId={card.floatingCardId}
      isHidden={isHidden}
      isFocused={card.isFocused}
      onFocus={() => focusFloatingCard(card.floatingCardId)}
    >
      <div className="flex flex-col gap-2 p-3">
        <p className="text-body-xs-bold color-text-secondary uppercase tracking-wide">
          Suggestion
        </p>

        {/* Content preview — mirrors what the inline decorations show */}
        <div className="rounded-[4px] border color-border-default px-3 py-2 text-body-sm space-y-1">
          {hasOriginal && (
            <span className="line-through color-text-secondary">
              {card.selectedText}
            </span>
          )}
          {hasOriginal && hasInserted && <span> → </span>}
          {hasInserted && (
            <span className="text-[#22c55e]">{card.insertedText}</span>
          )}
          {!hasOriginal && !hasInserted && (
            <span className="color-text-secondary italic">No changes yet</span>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            className="!w-[80px] !min-w-[80px]"
            onClick={() => discardDraft(card.suggestionId)}
          >
            Discard
          </Button>
          <Button
            className="w-20 min-w-20"
            disabled={!canSubmit}
            onClick={() => submitDraft(card.suggestionId)}
          >
            Submit
          </Button>
        </div>
      </div>
    </FloatingCardShell>
  );
};
