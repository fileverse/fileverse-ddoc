import { SyncMachineContext } from "../types";

export const syncMachineGuards = {
  isUserConnected: (context: SyncMachineContext) => context.isConnected,
  hasMoreUpdates: (context: SyncMachineContext) =>
    context.updateQueue.length > 0,
  isOwner: (context: SyncMachineContext) => context.isOwner,
  errorIsLessThanRetryCount: (context: SyncMachineContext) =>
    context.errorCount <= context.errorMaxRetryCount,
  shouldRetryConnection: (context: SyncMachineContext) => {
    return !!(
      context.username &&
      context.socketClient &&
      context.errorCount <= context.errorMaxRetryCount
    );
  },
  shouldRefetchCommit: (context: SyncMachineContext) => {
    return !!(
      context.isConnected && context.errorCount <= context.errorMaxRetryCount
    );
  },
};
