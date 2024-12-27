/* eslint-disable @typescript-eslint/no-explicit-any */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { IComment } from '../comment/comment';
import type { Command } from '@tiptap/core';

export interface ThreadOptions {
  HTMLAttributes: Record<string, any>;
  onCreateThread?: (data: ThreadData) => Promise<string>;
  onUpdateThread?: (data: ThreadUpdateData) => Promise<void>;
  onDeleteThread?: (threadId: string) => Promise<void>;
  onResolveThread?: (threadId: string) => Promise<void>;
  onSelectThread?: (threadId: string) => void;
  getThreads?: () => Promise<ThreadData[]>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    thread: {
      createThread: (attrs: Partial<ThreadData>) => ReturnType;
      updateThread: (data: ThreadUpdateData) => ReturnType;
      deleteThread: (threadId: string) => ReturnType;
      resolveThread: (threadId: string) => ReturnType;
    };
  }
}

export interface ThreadData {
  id: string;
  from: number;
  to: number;
  comments: IComment[];
  resolved?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadUpdateData {
  id: string;
  data: Partial<ThreadData>;
}

const threadKey = new PluginKey('thread');

export const ThreadExtension = Extension.create<ThreadOptions>({
  name: 'thread',

  addOptions() {
    return {
      HTMLAttributes: {},
      onCreateThread: async () => '',
      onUpdateThread: async () => {},
      onDeleteThread: async () => {},
      onResolveThread: async () => {},
      onSelectThread: () => {},
      getThreads: async () => [],
    };
  },

  addCommands() {
    return {
      createThread:
        (attrs: Partial<ThreadData>): Command =>
        ({ tr, dispatch }) => {
          if (!dispatch) return false;

          const { from, to } = tr.selection;

          void this.options
            .onCreateThread?.({
              ...attrs,
              from,
              to,
              id: '',
              comments: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .then((threadId) => {
              if (threadId) {
                tr.setMeta(threadKey, {
                  type: 'create',
                  threadId,
                  from,
                  to,
                });
              }
            });

          return true;
        },

      updateThread:
        (data: ThreadUpdateData): Command =>
        ({ tr }) => {
          tr.setMeta(threadKey, {
            type: 'update',
            data,
          });

          void this.options.onUpdateThread?.(data);
          return true;
        },

      deleteThread:
        (threadId: string): Command =>
        ({ tr }) => {
          tr.setMeta(threadKey, {
            type: 'delete',
            threadId,
          });

          void this.options.onDeleteThread?.(threadId);
          return true;
        },

      resolveThread:
        (threadId: string): Command =>
        ({ tr }) => {
          tr.setMeta(threadKey, {
            type: 'resolve',
            threadId,
          });

          void this.options.onResolveThread?.(threadId);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const { onSelectThread } = this.options;

    return [
      new Plugin({
        key: threadKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, old) {
            const meta = tr.getMeta(threadKey);
            if (!meta) return old;

            // Handle different thread actions
            switch (meta.type) {
              case 'create': {
                const decoration = Decoration.inline(meta.from, meta.to, {
                  class: 'thread-decoration',
                  'data-thread-id': meta.threadId,
                });
                return old.add(tr.doc, [decoration]);
              }
              case 'delete': {
                const decorations = old.find();
                const filtered = decorations.filter(
                  (deco) => deco.spec['data-thread-id'] !== meta.threadId,
                );
                return DecorationSet.create(tr.doc, filtered);
              }
              default:
                return old;
            }
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleClick(view, pos) {
            // Handle thread selection
            const decorations = this.getState(view.state)?.find();
            const thread = decorations?.find((deco) => {
              const from = deco.from;
              const to = deco.to;
              return pos >= from && pos <= to;
            });
            if (thread) {
              onSelectThread?.(thread.spec['data-thread-id']);
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});
