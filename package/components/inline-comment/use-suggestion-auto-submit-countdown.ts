import { useCommentStore } from '../../stores/comment-store';
import { useAutoSubmitCountdown } from './use-auto-submit-countdown';

interface UseSuggestionAutoSubmitCountdownProps {
  suggestionId: string;
  canAutoSubmit: boolean;
  onSubmit: () => void;
}

export const useSuggestionAutoSubmitCountdown = ({
  suggestionId,
  canAutoSubmit,
  onSubmit,
}: UseSuggestionAutoSubmitCountdownProps) => {
  const activeSuggestionDraftIdAtCursor = useCommentStore(
    (state) => state.activeSuggestionDraftIdAtCursor,
  );
  const { submitLabel } = useAutoSubmitCountdown({
    label: 'Submit',
    onSubmit,
    resetKey: suggestionId,
    shouldRun: canAutoSubmit && activeSuggestionDraftIdAtCursor !== suggestionId,
  });

  return {
    submitLabel,
  };
};
