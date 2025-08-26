/* eslint-disable @typescript-eslint/no-explicit-any */
import { createMachine } from 'xstate';
import { SyncMachineContext } from './types';
import { initialContext } from './constants';
import { syncMachineActions } from './actions/syncMachineActions';
import { syncMachineServices } from './services/syncMachineServices';
import { syncMachineGuards } from './guards/syncMachineGuards';

const syncMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QDMCWAbMA3MAnWYAtLAJ4B2AxoQLYCGFAFqmWAMQDKAogHIAiA+gFUACrwCCAFU4BtAAwBdRKAAOAe1ioALqlVklIAB6IA7MYA0IEogCMAFgCcAJgB0943ccA2WwGZZAVmN7ewBfEIs0TBx8IlJKGnomFg4eARFxKWlrRSQQNQ1tXX0jBGtPAA5ZZ1tZT0dyzzq3WVlHCysERwDna386-1l7Vp8fW1tHMIiMbDwCYnIqOkZmNgAlAHl1gFl+Lc4tgCFOVfYACQBJYX4AYVOxbgBxGQV9fK0dPVySsqDnRsqvI4-OV-PZbO0bLJys5AuVrI5-LZ-NYfo5rJMQJEZjF5vElkk2Nd1twpCShKJJM8cip1O8il8TOZLDZ-OV7DCHP5keU4cZbMYMVjonM4otEitWESSTwJOSMjJsq9aYVPqBvo1bDDEXzBuVjP4fAaIaUJuFMdNhbEFgllsl2ABNbjXfgAGUp7FlRK2W3OEjk1Lyyo+xUZxrRgz+jWMhr8xlkDh8gotsytePFyV453YUu4nGufpeuTeKpDCFMxp87mcQN8TihtWswyTURTuLFtrYYgA6mJVjxOOx2HLKf6lQVgwzSu4XD56mUfPZeqywRWgdDZHzEX1l45bM3sSLrfiJeduL7+N3e-3B6Oi0H6WqbMZHMZq54+g1fPDHPZPBW7NY1S-uMrQbvqniJmaQqtqKNoEs4yi4KoFBwBoZBQCkfDDpkhY0uOD6GDYC6vr4QLeLUXIIm0zIIOUCJ-IaSLlAuv5wv4+6Wm2cErAhSEobAaEYdcLqcL2QhOtsPpSGkFJSOwt54XSqqEaUoyao09QtNYbJdC+xrPuyATRrOYIgnYe5QcmOKwceLC8chqHMEJxKkrK6Qjrhgb4cp3w+Hq1aVLIjb1GRYzGhBLj8nWfJuKMAqWS21lHumYD2fxgnOAArsoEC0No6GsBAuipcwWCqAA1qliEOQJ3BgAYmiCDleVgApXlKaW9hcn8fRotYQSGgif40dYPiNs4rSeI29gmfyHEwclHZpY56FZc1+UYUVdmlRVVV8ahdUNU1uWaK1ip3t5pbctWBoNHR9RIv1xoovCzg+J49jlOMniDPqfTzUlaZLdV6VOWtJ1OYVxXODtlXLbV9WNetrWOAGxYTo+pSVIB7iDFCjgIlC2nPQMnjVO4IEE7IIy9ADh5A-BIMrVA4N5ZDW0lWQZVw0zCNHcj0g+Gj94+TYdE49N+OE3C5TPUFVTGB9IL+LufQBBZUyJfT7aM-tAlg9lEMFXgSG4Ah6B5cgqi4NQ8OwIdSMna1nnowRJQDJqXhq8EdRdD8xrBBLhrMYrRnPnTqY6zxvMZYbbPG7gpvm5b1u2zHDvHS1WTC5dk7aUFzi40M90DDLcusm+n1IjGH0qxHXG2XtNUZRQqjUNQWgbVD21c7tdvXG3HeaG1ruiwgXX+D1dQogNKt9M9gIwl4KJOGifmtPXNkpXbYOt+3nfs9DsNN+lA-78P52KSWefY4Xksl0Tssje9mrY42G7WHWoQJQekfcXZMdd6DwPgVDmMNe48z1rAM+Q9pCozHB1G+KI754wfmXEaXh2Rvy6AMPwP5IKa1-g3begDVp7yHl3E21tk6aCtjbfuwDh4uxFqWUaXQYR1DGBuGath4TghGgBCan8QStB9gMU0hDOJb2BlAoB59KGJ2ocoC2tDU4MPPtnBB19MbaWQUXKWpdibP36m9IKKIGwvScJvRa8EICoFgK3MgLAKCnQgJKYkuZ8wjxYTfMaKDi4E0MU-DoitXxfQgl1DcjQ7AEPNFrP+jdnCOOcQopOyiU70OSWAFx7BkKVSYTnRBmMXx+IRMRHkAQurDQ6O+V8Y0qKVkpoiaxDMeJZJcZDKhZt0mqMyboFJuSKD5M0RdIpKkgTPjesiWwep9S6msMaSoJEKiBRrgMdEP8pE2J4qKJy-AVFwE0PwchWhMIyXlN43OOivCai5PyB6tQwQrhGr+KozEGh2B+sZKELSo52V2ehfZLVYBHJOZodx0oyTuRwoU7RKk+FVACFLUwo19T8I6Npbwb54xsl6FNCCGs4lEOkfBAFUAgWnRBccxhzhkBgE0LaclyAkLUH4KgZQyBYDd05tzVKooXTAs0DArQAAxFl5wOWwEuWMkoQRAJ4vqIaIIYxqmIAma+amC4CY-jYWMX5-8+ULD2QcqlYLaX0sZfwZlbc2WSu5eA3lzh+WCuFZoMVbcJWcpGVfDGKk5U9F6sxQIYJbCqs6Ci1wQQylrz1BBfViSyUUsOdS8+5qGVJCZSy21nLWBdJoXQ22zrKVCsYe66gnqpXMKuX6xcAa6hBuVaGsM8IyaLk8NGH2913zxu3omk1oKaV0vTXs61rL2U5rzT0gtTqFgCuLa6stFbvXtThSUNEP1XBTWpqG2cSIEQVgbK4YCfhBi-kaD2pafbBUpqHkkxhG19nIVoOgalZBTpvq5WA4+d7z4uifegAeb6wAfulautV-Uqi-kbKMCKe7-BhlJtWAmwQvDRh5NGC9pKjWAv7TerQP6KHGv-a+99mhP1HwgalMFf6KDPsA6RqVl8V2+rXRBzd0Gd2q33TRQEZM9ROGRCrPw74JFEq2a0-52HyW4bNWCh96BiOOIY7mxR3SVHTuo-++jwGyOgZYzYf4PRvAATVtNMMhoqgLhmbBpwbh2KbIWhJw1lBjXXtk-eojtGX1KZ01yyd6m1Gaa89pkDTHR6lnXZBrdMHd1zzDO2zUlYnC8IgiiLksToKAz+c5igrni14c0ARkB0nFO6GU8JUSqxxJeikpwc57o9NuyIq0AK8IRFokVWGgmdFC5jAaDNJwbFCWZe1gamdLmcNuZpX20rQGP32u-QAIyQrQCAtGQU0bo2V3zjWx5okqOx7dsG4s8b1D4ao2l6lmLohlqyo2E1SaTaa6bj2FNeZI75hblHnDLdUKt9bmhNsAe26F2F+nOj50OzFrj8GeNnqPd4BwPJRgNEwzs17U3U0zfez5+b-mMm21+-92gG2tMg901WmVBmKhGd4bw0zgwwxxk1AEFEVMq6K1u-E4hl6Mf5bNdj59H28eqfzWoona2SeA7J3N3TYWfHFLY1Bo7sXuMdD8HYIC3gWKLkCJ4NHdl2muK+466IqBkAkEAykj47BNBZ0p2BhANR2Rex+j7Km-sRpxnZKRQ0sVeh8i58S7Zhv+nZON1+77ZuLdW-Dzbu3p1l3hcnC+AYrXhOfy5HUMNAfzuMV3NGPkH0kQG6o2HlxkBWCZmzB4vMBYwdNc6IHHoepQRDFGHPHPfJbmNhmWMJ5DR7OSMc9l5wdiHHl67pHx14+jeDOGQ78Hl2JaoMCY-Y0gmJo1kRJUKaA2whmjIKoCAcB9AjYSSlLR4OfzGkIPqGELQgqBBfI2BoQfxOj9IVAK-jekRk1d6er7EFO2gHPGNWKNKyH5KXNZqXjvKtHHBtD-mPAaIBIFPqMxF0H7j4AvH5FvlunYMuKMLAV-kVpoIgaMo7qNBus+MvI8t4ATDnl4GTO2luouDMnRKjg5llmNrPpPpAEgaWOWDRCrK2nKjLNrt4PFMPtwYkkbk5AISnkFLcuMGyD9PTnyEyCEj1qxMYHRKCPCNTOULAVevzowgoZjLOK+AqlFJ9ErMEmqtTD7j8DUAEF9J9MYXzsmmakOpaqOtmvABQeDpWJPNYUELYZ9PYRDt1Ijm-tuMEM0lwfdr2p4c9qmnJp5kLrjmRuYfClRLTo2KCANHUOZl9G9MhqZLWMxB4RNtJpjreoLt5uTgET6o3vCCrPkZUkUdRB0CUq+G4AJu9DNGUBstIUkUtEbvwYEY3giF1C3orKhkCD+DyM9B9IZAUbUATH5AZLAbwU4nHuhDkSULOC1qCH5LXDTFngvLMRrqIsGr0F4AfiEEAA */
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
      AWARENESS_UPDATE: {
        actions: 'updateAwarenessState',
      },
      INIT_AWARENESS: {
        actions: 'initializeAwareness',
      },
      TERMINATE_SESSION: {
        actions: 'terminateSession',
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
