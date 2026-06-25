import { useEffect, useRef, useState } from 'react';
import { useCommentStore } from '../../stores/comment-store';

const AUTO_SUBMIT_COUNTDOWN_SECONDS = 5;

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
  const [remainingSeconds, setRemainingSeconds] = useState(
    AUTO_SUBMIT_COUNTDOWN_SECONDS,
  );
  const hasSubmittedRef = useRef(false);

  const shouldRunCountdown =
    canAutoSubmit && activeSuggestionDraftIdAtCursor !== suggestionId;

  useEffect(() => {
    hasSubmittedRef.current = false;
    setRemainingSeconds(AUTO_SUBMIT_COUNTDOWN_SECONDS);
  }, [suggestionId]);

  useEffect(() => {
    if (!shouldRunCountdown) {
      hasSubmittedRef.current = false;
      setRemainingSeconds((current) =>
        current === AUTO_SUBMIT_COUNTDOWN_SECONDS
          ? current
          : AUTO_SUBMIT_COUNTDOWN_SECONDS,
      );
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (remainingSeconds <= 1) {
        if (!hasSubmittedRef.current) {
          hasSubmittedRef.current = true;
          onSubmit();
        }
        return;
      }

      setRemainingSeconds(remainingSeconds - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [onSubmit, remainingSeconds, shouldRunCountdown]);

  return {
    submitLabel: `Submit ( ${remainingSeconds} )`,
  };
};
