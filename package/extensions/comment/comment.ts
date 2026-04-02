/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommandProps, Mark, mergeAttributes, Range } from '@tiptap/core';
import { Mark as PMMark } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      /**
       * Set a comment (add)
       */
      setComment: (commentId: string) => ReturnType;
      /**
       * Unset a comment (remove completely)
       */
      unsetComment: (commentId: string) => ReturnType;
      /**
       * Resolve a comment (keep ID but update styling)
       */
      resolveComment: (commentId: string) => ReturnType;
      /**
       * Unresolve a comment (switch back to unresolved state)
       */
      unresolveComment: (commentId: string) => ReturnType;
      /**
       * Set a comment active
       */
      setCommentActive: (commentId: string) => ReturnType;
      /**
       * Unset comment active
       */
      unsetCommentActive: () => ReturnType;
      /**
       * Add a local draft anchor that tracks through transactions.
       */
      setDraftComment: (draftId: string) => ReturnType;
      /**
       * Remove a local draft anchor.
       */
      unsetDraftComment: (draftId: string) => ReturnType;
      /**
       * Replace a draft anchor with a persisted comment mark.
       */
      promoteDraftComment: (draftId: string, commentId: string) => ReturnType;
    };
  }
}

export interface MarkWithRange {
  mark: PMMark;
  range: Range;
}

export interface CommentOptions {
  HTMLAttributes: Record<string, any>;
  onCommentActivated: (commentId: string) => void;
  onCommentResolved?: (commentId: string) => void;
  onCommentUnresolved?: (commentId: string) => void;
  onCommentDeleted?: (commentId: string) => void;
}

export interface CommentStorage {
  activeCommentId: string | null;
}

export interface DraftCommentRange {
  draftId: string;
  from: number;
  to: number;
}

interface DraftCommentPluginState {
  decorations: DecorationSet;
  drafts: Map<string, DraftCommentRange>;
}

interface DraftCommentMeta {
  type: 'add' | 'remove' | 'clear';
  draftId?: string;
  from?: number;
  to?: number;
}

export const draftCommentPluginKey = new PluginKey<DraftCommentPluginState>(
  'draftComment',
);

const createDraftDecorations = (
  doc: EditorState['doc'],
  drafts: Map<string, DraftCommentRange>,
) => {
  const decorations = Array.from(drafts.values())
    .filter((draft) => draft.from < draft.to)
    .map((draft) =>
      Decoration.inline(
        draft.from,
        draft.to,
        {
          class: 'inline-comment inline-comment--draft',
          'data-draft-comment-id': draft.draftId,
          'data-active': 'false',
        },
        {
          draftId: draft.draftId,
          inclusiveStart: false,
          inclusiveEnd: false,
        },
      ),
    );

  return DecorationSet.create(doc, decorations);
};

const mapDraftRange = (
  range: DraftCommentRange,
  mapping: Parameters<DecorationSet['map']>[0],
) => {
  const from = mapping.map(range.from, 1);
  const to = mapping.map(range.to, -1);

  if (from >= to) {
    return null;
  }

  return {
    ...range,
    from,
    to,
  };
};

export const getDraftCommentState = (state: EditorState) =>
  draftCommentPluginKey.getState(state);

export const getDraftCommentRange = (state: EditorState, draftId: string) => {
  return getDraftCommentState(state)?.drafts.get(draftId) ?? null;
};

export interface IComment {
  id?: string;
  tabId?: string;
  username?: string;
  reactions?: {
    count: number;
    type: string;
  }[];
  selectedContent?: string;
  content?: string;
  replies?: IComment[];
  createdAt?: Date;
  resolved?: boolean;
  deleted?: boolean;
  commentIndex?: number;
  version?: string;
}

export const CommentExtension = Mark.create<CommentOptions, CommentStorage>({
  name: 'comment',
  inclusive: false,

  addOptions() {
    return {
      HTMLAttributes: {},
      onCommentActivated: () => {},
    };
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el) =>
          (el as HTMLSpanElement).getAttribute('data-comment-id'),
        renderHTML: (attrs) => ({ 'data-comment-id': attrs.commentId }),
      },
      resolved: {
        default: false,
        parseHTML: (el) =>
          (el as HTMLSpanElement).getAttribute('data-resolved'),
        renderHTML: (attrs) => ({
          'data-resolved': attrs.resolved,
          class: attrs.resolved
            ? 'inline-comment--resolved'
            : 'inline-comment--unresolved',
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
        getAttrs: (el) =>
          !!(el as HTMLSpanElement).getAttribute('data-comment-id')?.trim() &&
          null,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  onSelectionUpdate() {
    const { $from } = this.editor.state.selection;

    const marks = $from.marks();

    if (!marks.length) {
      this.storage.activeCommentId = null;
      this.options.onCommentActivated(this.storage.activeCommentId || '');
      return;
    }

    const commentMark = this.editor.schema.marks.comment;

    const activeCommentMark = marks.find((mark) => mark.type === commentMark);

    this.storage.activeCommentId = activeCommentMark?.attrs.commentId || null;

    this.options.onCommentActivated(this.storage.activeCommentId || '');
  },

  addStorage() {
    return {
      activeCommentId: null,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<DraftCommentPluginState>({
        key: draftCommentPluginKey,
        state: {
          init: () => ({
            decorations: DecorationSet.empty,
            drafts: new Map<string, DraftCommentRange>(),
          }),
          apply: (tr, pluginState) => {
            const meta = tr.getMeta(
              draftCommentPluginKey,
            ) as DraftCommentMeta | null;

            if (!tr.docChanged && !meta) {
              return pluginState;
            }

            const drafts = new Map<string, DraftCommentRange>();

            pluginState.drafts.forEach((draft, draftId) => {
              const mappedDraft = tr.docChanged
                ? mapDraftRange(draft, tr.mapping)
                : draft;

              if (mappedDraft) {
                drafts.set(draftId, mappedDraft);
              }
            });

            if (
              meta?.type === 'add' &&
              meta.draftId &&
              meta.from !== undefined &&
              meta.to !== undefined
            ) {
              if (meta.from < meta.to) {
                drafts.set(meta.draftId, {
                  draftId: meta.draftId,
                  from: meta.from,
                  to: meta.to,
                });
              }
            }

            if (meta?.type === 'remove' && meta.draftId) {
              drafts.delete(meta.draftId);
            }

            if (meta?.type === 'clear') {
              drafts.clear();
            }

            return {
              drafts,
              decorations: createDraftDecorations(tr.doc, drafts),
            };
          },
        },
        props: {
          decorations(state) {
            return draftCommentPluginKey.getState(state)?.decorations ?? null;
          },
        },
      }),
    ];
  },

  addCommands() {
    const getCommentNodesById = (editorDom: HTMLElement, commentId: string) => {
      const safeId =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(commentId)
          : commentId.replace(/"/g, '\\"');

      return editorDom.querySelectorAll<HTMLElement>(
        `[data-comment-id="${safeId}"]`,
      );
    };

    const setCommentNodeVisualState = (
      node: HTMLElement,
      isActive: boolean,
    ) => {
      const isResolved = node.dataset.resolved === 'true';

      node.setAttribute('data-active', isActive ? 'true' : 'false');

      node.classList.toggle('inline-comment--active', isActive);
      node.classList.toggle(
        'inline-comment--resolved',
        !isActive && isResolved,
      );
      node.classList.toggle(
        'inline-comment--unresolved',
        !isActive && !isResolved,
      );
    };

    // Update only the affected comment ids, not the whole document.
    const syncActiveCommentClassInDOM = (
      previousCommentId: string | null,
      nextCommentId: string | null,
    ) => {
      if (previousCommentId === nextCommentId) return;

      const editorDom = this.editor?.view?.dom as HTMLElement | undefined;
      if (!editorDom) return;

      if (previousCommentId) {
        getCommentNodesById(editorDom, previousCommentId).forEach((node) => {
          setCommentNodeVisualState(node, false);
        });
      }

      if (nextCommentId) {
        getCommentNodesById(editorDom, nextCommentId).forEach((node) => {
          setCommentNodeVisualState(node, true);
        });
      }
    };
    return {
      setComment:
        (commentId: string) =>
        ({ tr, dispatch, state }: CommandProps): boolean => {
          if (!commentId) return false;

          const { from, to } = state.selection;
          if (from === to) return false;

          const mark = this.editor.schema.marks.comment.create({
            commentId,
          });
          tr.addMark(from, to, mark);
          dispatch?.(tr);
          return true;
        },
      unsetComment:
        (commentId) =>
        ({ tr, dispatch }) => {
          if (!commentId) return false;

          const commentMarksWithRange: MarkWithRange[] = [];

          tr.doc.descendants((node, pos) => {
            const commentMark = node.marks.find(
              (mark) =>
                mark.type.name === 'comment' &&
                mark.attrs.commentId === commentId,
            );

            if (!commentMark) return;

            commentMarksWithRange.push({
              mark: commentMark,
              range: {
                from: pos,
                to: pos + node.nodeSize,
              },
            });
          });

          commentMarksWithRange.forEach(({ mark, range }) => {
            tr.removeMark(range.from, range.to, mark);
          });

          this.options.onCommentDeleted?.(commentId);
          dispatch?.(tr);
          return true;
        },
      resolveComment:
        (commentId: string) =>
        ({ tr, dispatch }) => {
          if (!commentId) return false;

          const commentMarksWithRange: MarkWithRange[] = [];

          tr.doc.descendants((node, pos) => {
            const commentMark = node.marks.find(
              (mark) =>
                mark.type.name === 'comment' &&
                mark.attrs.commentId === commentId,
            );

            if (!commentMark) return;

            commentMarksWithRange.push({
              mark: commentMark,
              range: {
                from: pos,
                to: pos + node.nodeSize,
              },
            });
          });

          commentMarksWithRange.forEach(({ range }) => {
            tr.addMark(
              range.from,
              range.to,
              this.editor.schema.marks.comment.create({
                commentId,
                resolved: true,
              }),
            );
          });

          this.options.onCommentResolved?.(commentId);
          dispatch?.(tr);
          return true;
        },
      unresolveComment:
        (commentId: string) =>
        ({ tr, dispatch }) => {
          if (!commentId) return false;

          const commentMarksWithRange: MarkWithRange[] = [];

          tr.doc.descendants((node, pos) => {
            const commentMark = node.marks.find(
              (mark) =>
                mark.type.name === 'comment' &&
                mark.attrs.commentId === commentId,
            );

            if (!commentMark) return;

            commentMarksWithRange.push({
              mark: commentMark,
              range: {
                from: pos,
                to: pos + node.nodeSize,
              },
            });
          });

          commentMarksWithRange.forEach(({ range }) => {
            tr.addMark(
              range.from,
              range.to,
              this.editor.schema.marks.comment.create({
                commentId,
                resolved: false,
              }),
            );
          });

          this.options.onCommentUnresolved?.(commentId);
          dispatch?.(tr);
          return true;
        },
      setCommentActive: (commentId: string) => () => {
        if (!commentId) return false;
        const previousActiveCommentId = this.storage.activeCommentId;
        if (previousActiveCommentId === commentId) return true;
        this.storage.activeCommentId = commentId;
        // Update UI classes in-place so "active comment" does not create doc updates.
        syncActiveCommentClassInDOM(previousActiveCommentId, commentId);
        return true;
      },
      unsetCommentActive: () => () => {
        const previousActiveCommentId = this.storage.activeCommentId;
        if (!previousActiveCommentId) return true;
        this.storage.activeCommentId = null;
        // Reset active styling without touching persisted mark attributes.
        syncActiveCommentClassInDOM(previousActiveCommentId, null);
        return true;
      },
      setDraftComment:
        (draftId: string) =>
        ({ state, tr, dispatch }) => {
          if (!draftId || state.selection.empty) return false;

          const { from, to } = state.selection;

          if (from >= to) return false;

          tr.setMeta(draftCommentPluginKey, {
            type: 'add',
            draftId,
            from,
            to,
          } satisfies DraftCommentMeta);

          dispatch?.(tr);
          return true;
        },
      unsetDraftComment:
        (draftId: string) =>
        ({ tr, dispatch }) => {
          if (!draftId) return false;

          tr.setMeta(draftCommentPluginKey, {
            type: 'remove',
            draftId,
          } satisfies DraftCommentMeta);

          dispatch?.(tr);
          return true;
        },
      promoteDraftComment:
        (draftId: string, commentId: string) =>
        ({ state, tr, dispatch }) => {
          if (!draftId || !commentId) return false;

          const draft = getDraftCommentRange(state, draftId);
          const commentMark = state.schema.marks.comment;

          if (!draft || !commentMark || draft.from >= draft.to) {
            return false;
          }

          tr.addMark(
            draft.from,
            draft.to,
            commentMark.create({
              commentId,
              resolved: false,
            }),
          );
          tr.setMeta(draftCommentPluginKey, {
            type: 'remove',
            draftId,
          } satisfies DraftCommentMeta);

          dispatch?.(tr);
          return true;
        },
    };
  },
});
