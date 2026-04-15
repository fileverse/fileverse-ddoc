import { useEffect, useState } from 'react';
import { useCommentStore } from '../../stores/comment-store';
import type { EnsStatus } from './types';

export const useEnsStatus = (walletAddressOrName?: string | null) => {
  const getEnsStatus = useCommentStore((s) => s.getEnsStatus);
  const cachedEntry = useCommentStore((s) =>
    walletAddressOrName ? s.ensCache[walletAddressOrName] : undefined,
  );

  const [ensStatus, setEnsStatus] = useState<EnsStatus>(() => ({
    name: walletAddressOrName || 'Anonymous',
    isEns: Boolean(walletAddressOrName?.endsWith('.eth')),
  }));

  useEffect(() => {
    if (!walletAddressOrName) {
      setEnsStatus({ name: 'Anonymous', isEns: false });
      return;
    }

    if (cachedEntry) {
      setEnsStatus({ ...cachedEntry });
      return;
    }

    if (walletAddressOrName.endsWith('.eth')) {
      setEnsStatus({ name: walletAddressOrName, isEns: true });
      return;
    }

    getEnsStatus(walletAddressOrName, setEnsStatus);
  }, [walletAddressOrName, cachedEntry, getEnsStatus]);

  return ensStatus;
};
