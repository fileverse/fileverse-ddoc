import { useCallback, useEffect, useRef, useState } from 'react';

const AUTO_SUBMIT_COUNTDOWN_SECONDS = 5;

interface UseCommentDraftAutoSubmitCountdownProps {
  draftId: string | null;
  canAutoSubmit: boolean;
  onSubmit: () => void;
}

export const useCommentDraftAutoSubmitCountdown = ({
  draftId,
  canAutoSubmit,
  onSubmit,
}: UseCommentDraftAutoSubmitCountdownProps) => {
  const [isDraftFocused, setIsDraftFocused] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState(
    AUTO_SUBMIT_COUNTDOWN_SECONDS,
  );
  const hasSubmittedRef = useRef(false);

  const shouldRunCountdown = canAutoSubmit && !isDraftFocused;

  const handleDraftFocus = useCallback(() => {
    setIsDraftFocused(true);
  }, []);

  const handleDraftBlur = useCallback(() => {
    setIsDraftFocused(false);
  }, []);

  useEffect(() => {
    hasSubmittedRef.current = false;
    setIsDraftFocused(true);
    setRemainingSeconds(AUTO_SUBMIT_COUNTDOWN_SECONDS);
  }, [draftId]);

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
    handleDraftBlur,
    handleDraftFocus,
    submitLabel: `Send ( ${remainingSeconds} )`,
  };
};
