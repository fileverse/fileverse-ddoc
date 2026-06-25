import { useEffect, useRef, useState } from 'react';

const AUTO_SUBMIT_COUNTDOWN_SECONDS = 5;

interface UseAutoSubmitCountdownProps {
  label: string;
  onSubmit: () => void;
  resetKey: string | null;
  shouldRun: boolean;
}

export const useAutoSubmitCountdown = ({
  label,
  onSubmit,
  resetKey,
  shouldRun,
}: UseAutoSubmitCountdownProps) => {
  const [remainingSeconds, setRemainingSeconds] = useState(
    AUTO_SUBMIT_COUNTDOWN_SECONDS,
  );
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    hasSubmittedRef.current = false;
    setRemainingSeconds(AUTO_SUBMIT_COUNTDOWN_SECONDS);
  }, [resetKey]);

  useEffect(() => {
    if (!shouldRun) {
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
  }, [onSubmit, remainingSeconds, shouldRun]);

  return {
    submitLabel: `${label} ( ${remainingSeconds} )`,
  };
};
