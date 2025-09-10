/* eslint-disable @typescript-eslint/no-explicit-any */
import { createMachine } from 'xstate';
import { SyncMachineContext } from './types';
import { initialContext } from './constants';
import { syncMachineActions } from './actions/syncMachineActions';
import { syncMachineServices } from './services/syncMachineServices';
import { syncMachineGuards } from './guards/syncMachineGuards';

const syncMachine = createMachine(
  {
    id: 'fileverse-sync-machine',
    schema: {
      context: {} as SyncMachineContext,
      events: {} as { type: string; data: any },
    },
    predictableActionArguments: true,
    initial: 'disconnected',
    context: initialContext,
    on: {
      SEND_UPDATE: [
        {
          target: 'processing',
          actions: 'addUpdateToQueue',
          cond: 'isUserConnected',
        },
        {
          actions: 'addUpdateToQueue',
        },
      ],
      ROOM_MEMBERSHIP_CHANGE: {
        actions: 'updateRoomMembers',
      },
      CONTENT_UPDATE: [
        {
          actions: 'applyRemoteYjsUpdate',
          target: '#fileverse-sync-machine.processing.committing',
          cond: 'isOwner',
        },
        {
          actions: 'applyRemoteYjsUpdate',
        },
      ],
      SYNC_LATEST_COMMIT: {
        target: 'syncing_latest_commit',
      },
      DISCONNECT: {
        actions: 'handleDisconnectionDueToError',
        target: 'disconnecting',
      },
      INIT_AWARENESS: {
        actions: 'initializeAwareness',
      },
      TERMINATE_SESSION: {
        actions: 'terminateSession',
        target: 'disconnected',
      },
      SESSION_TERMINATED: {
        actions: 'terminateSession',
        target: 'disconnected',
      },
    },
    states: {
      processing: {
        initial: 'updating',
        states: {
          updating: {
            invoke: {
              id: 'processNextUpdate',
              src: 'processNextUpdate',
              onDone: [
                {
                  actions: [
                    'clearErrorCount',
                    'registerUpdate',
                    'removeLastProcessedUpdate',
                  ],
                  target: 'committing',
                  cond: 'isOwner',
                },
                {
                  actions: ['clearErrorCount', 'removeLastProcessedUpdate'],
                  target: 'updating',
                  cond: 'hasMoreUpdates',
                },
                {
                  actions: ['clearErrorCount'],
                  target: '#fileverse-sync-machine.connected',
                  cond: 'isUserConnected',
                },
                {
                  target: '#fileverse-sync-machine.disconnecting',
                },
              ],
              onError: [
                {
                  actions: ['updateErrorCount', 'setUpdateErrorMessage'],
                  target: 'updating',
                  cond: 'errorIsLessThanRetryCount',
                },
                {
                  target: '#fileverse-sync-machine.disconnecting',
                },
              ],
            },
          },
          committing: {
            invoke: {
              id: 'processCommit',
              src: 'processCommit',
              onDone: [
                {
                  target: 'updating',
                  cond: 'hasMoreUpdates',
                },
                {
                  actions: ['clearErrorCount'],
                  target: '#fileverse-sync-machine.connected',
                  cond: 'isUserConnected',
                },
                {
                  target: '#fileverse-sync-machine.disconnecting',
                },
              ],
              onError: [
                {
                  actions: ['updateErrorCount', 'setCommitMessageError'],
                  target: 'committing',
                  cond: 'errorIsLessThanRetryCount',
                },
                {
                  target: '#fileverse-sync-machine.disconnecting',
                },
              ],
            },
          },
        },
        on: {
          SEND_UPDATE: {
            actions: 'addUpdateToQueue',
          },
          CLEAR_UNCOMMITED_UPDATES: {
            actions: 'clearUncommitedUpdates',
          },
          CONTENT_UPDATE: [
            {
              actions: 'applyRemoteYjsUpdate',
            },
          ],
        },
      },
      disconnected: {
        entry: ['updateConnectionState'],
        on: {
          CONNECT: {
            target: 'connecting',
            actions: ['initializeSync'],
          },
        },
      },
      connecting: {
        invoke: {
          id: 'connectSocket',
          src: 'connectSocket',
          onError: [
            {
              actions: ['updateErrorCount', 'setConnectionErrorMessage'],
              target: 'connecting',
              cond: 'shouldRetryConnection',
            },
            {
              target: 'disconnecting',
            },
          ],
        },
      },
      syncing_latest_commit: {
        initial: 'fetching_from_ipfs',
        states: {
          fetching_from_ipfs: {
            entry: 'setConnectionActiveState',
            invoke: {
              id: 'syncLatestCommitFromIpfs',
              src: 'syncLatestCommitFromIpfs',
              onDone: [
                {
                  actions: ['commitUncommittedIds'],
                  target: 'committing_local_contents',
                  cond: 'isOwner',
                },
                {
                  target: 'syncing_local_contents',
                },
              ],
              onError: [
                {
                  actions: ['updateErrorCount', 'setIpfsQueryErrorMessage'],
                  target: '#fileverse-sync-machine.syncing_latest_commit',
                  cond: 'shouldRefetchCommit',
                },
                {
                  target: '#fileverse-sync-machine.disconnecting',
                },
              ],
            },
          },
          committing_local_contents: {
            invoke: {
              id: 'commitLocalContents',
              src: 'commitLocalContents',
              onDone: [
                {
                  actions: ['registerUpdate', 'setMachineReadyState'],
                  target: '#fileverse-sync-machine.connected',
                  cond: 'isUserConnected',
                },
                {
                  target: '#fileverse-sync-machine.disconnecting',
                },
              ],
              onError: [
                {
                  actions: ['updateErrorCount', 'setInitialCommitErrorMessage'],
                  target: '#fileverse-sync-machine.syncing_latest_commit',
                  cond: 'shouldRefetchCommit',
                },
                {
                  target: '#fileverse-sync-machine.disconnecting',
                },
              ],
            },
            on: {
              CLEAR_UNCOMMITED_UPDATES: {
                actions: 'clearUncommitedUpdates',
              },
            },
          },
          syncing_local_contents: {
            invoke: {
              id: 'broadcastLocalContents',
              src: 'broadcastLocalContents',
              onDone: [
                {
                  actions: 'setMachineReadyState',
                  target: '#fileverse-sync-machine.connected',
                  cond: 'isUserConnected',
                },
                {
                  target: '#fileverse-sync-machine.disconnecting',
                },
              ],
              onError: [
                {
                  actions: ['updateErrorCount', 'setInitialUpdateErrorMessage'],
                  target: '#fileverse-sync-machine.syncing_latest_commit',
                  cond: 'shouldRefetchCommit',
                },
                {
                  target: '#fileverse-sync-machine.disconnecting',
                },
              ],
            },
          },
        },
        on: {
          SEND_UPDATE: {
            actions: 'addUpdateToQueue',
          },
          CONTENT_UPDATE: [
            {
              actions: 'addRemoteContentToQueue',
            },
          ],
        },
      },
      connected: {
        entry: ['updateConnectionState'],
        invoke: {
          id: 'verifyConnectionState',
          src: 'verifyConnectionState',
          onDone: [
            {
              actions: ['clearErrorCount', 'applyContentsFromRemote'],
              target: 'processing',
              cond: 'hasMoreUpdates',
            },
            {
              actions: ['clearErrorCount', 'applyContentsFromRemote'],
            },
          ],
        },
        on: {
          DISCONNECT: {
            target: 'disconnecting',
          },
        },
      },
      disconnecting: {
        invoke: {
          id: 'disconnectSocket',
          src: 'disconnectSocket',
          onDone: {
            actions: 'handleDisconnectedState',
            target: 'disconnected',
          },
        },
      },
    },
  },
  {
    actions: syncMachineActions,
    services: syncMachineServices,
    guards: syncMachineGuards,
  },
);

export default syncMachine;
