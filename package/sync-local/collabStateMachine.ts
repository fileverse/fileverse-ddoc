// ─── Collab State Machine ───
// Pure function module — no side effects, no dependencies.

import {
  CollabStatus,
  CollabEvent,
  CollabContext,
  CollabState,
  CollabErrorCode,
} from './types';

export const INITIAL_CONTEXT: CollabContext = {
  hasUnmergedPeerUpdates: false,
  reconnectAttempt: 0,
  maxReconnectAttempts: 5,
  error: null,
  terminationReason: undefined,
};

type TransitionResult = {
  status: CollabStatus;
  context: Partial<CollabContext>;
} | null;

/**
 * Transition map: (currentStatus, eventType) → nextStatus + context mutations.
 * Returns null if the transition is invalid.
 */
export function transition(
  currentStatus: CollabStatus,
  event: CollabEvent,
  context: CollabContext,
): TransitionResult {
  const type = event.type;

  console.log('transition', currentStatus, event, context);
  switch (currentStatus) {
    case 'idle':
      if (type === 'CONNECT') return { status: 'connecting', context: {} };
      return null;

    case 'connecting':
      if (type === 'AUTH_SUCCESS')
        return {
          status: 'syncing',
          context: { hasUnmergedPeerUpdates: false },
        };
      if (type === 'ERROR')
        return {
          status: 'error',
          context: { error: event.error },
        };
      if (type === 'SESSION_TERMINATED')
        return {
          status: 'terminated',
          context: { terminationReason: event.reason },
        };
      if (type === 'RESET')
        return { status: 'idle', context: { ...INITIAL_CONTEXT } };
      return null;

    case 'syncing':
      if (type === 'SYNC_COMPLETE') return { status: 'ready', context: {} };
      if (type === 'SET_UNMERGED_UPDATES')
        return {
          status: 'syncing',
          context: { hasUnmergedPeerUpdates: event.hasUpdates },
        };
      if (type === 'ERROR')
        return {
          status: 'error',
          context: { error: event.error, hasUnmergedPeerUpdates: false },
        };
      if (type === 'RESET')
        return { status: 'idle', context: { ...INITIAL_CONTEXT } };
      return null;

    case 'ready':
      if (type === 'SOCKET_DROPPED')
        return {
          status: 'reconnecting',
          context: { reconnectAttempt: 1 },
        };
      if (type === 'SESSION_TERMINATED')
        return {
          status: 'terminated',
          context: { terminationReason: event.reason },
        };
      if (type === 'ERROR')
        return {
          status: 'error',
          context: { error: event.error },
        };
      if (type === 'RESET')
        return { status: 'idle', context: { ...INITIAL_CONTEXT } };
      return null;

    case 'reconnecting':
      if (type === 'RECONNECTED')
        return {
          status: 'syncing',
          context: { hasUnmergedPeerUpdates: false },
        };
      if (type === 'RETRY_EXHAUSTED')
        return {
          status: 'error',
          context: {
            error: {
              code: 'CONNECTION_FAILED',
              message: `Reconnection failed after ${context.maxReconnectAttempts} attempts`,
              recoverable: false,
            },
          },
        };
      if (type === 'SOCKET_DROPPED')
        return {
          status: 'reconnecting',
          context: {
            reconnectAttempt: context.reconnectAttempt + 1,
          },
        };
      if (type === 'RESET')
        return { status: 'idle', context: { ...INITIAL_CONTEXT } };
      return null;

    case 'error':
      if (type === 'RESET')
        return { status: 'idle', context: { ...INITIAL_CONTEXT } };
      return null;

    case 'terminated':
      if (type === 'RESET')
        return { status: 'idle', context: { ...INITIAL_CONTEXT } };
      return null;

    default:
      return null;
  }
}

/**
 * Derives the consumer-facing CollabState from internal status + context.
 */
export function deriveCollabState(
  status: CollabStatus,
  context: CollabContext,
): CollabState {
  switch (status) {
    case 'idle':
      return { status: 'idle' };
    case 'connecting':
      return { status: 'connecting' };
    case 'syncing':
      return {
        status: 'syncing',
        hasUnmergedPeerUpdates: context.hasUnmergedPeerUpdates,
      };
    case 'ready':
      return { status: 'ready' };
    case 'reconnecting':
      return {
        status: 'reconnecting',
        attempt: context.reconnectAttempt,
        maxAttempts: context.maxReconnectAttempts,
      };
    case 'error':
      return {
        status: 'error',
        error: context.error ?? {
          code: 'UNKNOWN',
          message: 'Unknown error',
          recoverable: false,
        },
      };
    case 'terminated':
      return { status: 'terminated', reason: context.terminationReason };
    default:
      return { status: 'idle' };
  }
}

/** Helper to create a CollabError */
export function createCollabError(
  code: CollabErrorCode,
  message: string,
  recoverable = false,
): { code: CollabErrorCode; message: string; recoverable: boolean } {
  return { code, message, recoverable };
}
