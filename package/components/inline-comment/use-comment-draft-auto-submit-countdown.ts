import { useCallback, useEffect, useState } from 'react';
import { useAutoSubmitCountdown } from './use-auto-submit-countdown';

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

  const handleDraftFocus = useCallback(() => {
    setIsDraftFocused(true);
  }, []);

  const handleDraftBlur = useCallback(() => {
    setIsDraftFocused(false);
  }, []);

  useEffect(() => {
    setIsDraftFocused(true);
  }, [draftId]);

  const { submitLabel } = useAutoSubmitCountdown({
    label: 'Send',
    onSubmit,
    resetKey: draftId,
    shouldRun: canAutoSubmit && !isDraftFocused,
  });

  return {
    handleDraftBlur,
    handleDraftFocus,
    submitLabel,
  };
};
