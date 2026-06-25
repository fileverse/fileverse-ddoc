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
  const shouldRunCountdown =
    canAutoSubmit && activeSuggestionDraftIdAtCursor !== suggestionId;
  const { submitLabel } = useAutoSubmitCountdown({
    label: 'Submit',
    onSubmit,
    resetKey: suggestionId,
    shouldRun: shouldRunCountdown,
  });

  return {
    submitLabel,
  };
};
