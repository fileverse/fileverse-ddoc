/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommandProps, Mark, mergeAttributes, Range } from '@tiptap/core';
import { Mark as PMMark } from '@tiptap/pm/model';

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

export interface IComment {
  id?: string;
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
        parseHTML: el =>
          (el as HTMLSpanElement).getAttribute('data-comment-id'),
        renderHTML: attrs => ({ 'data-comment-id': attrs.commentId }),
      },
      resolved: {
        default: false,
        parseHTML: el => (el as HTMLSpanElement).getAttribute('data-resolved'),
        renderHTML: attrs => ({
          'data-resolved': attrs.resolved,
          class: attrs.active
            ? 'inline-comment--active'
            : attrs.resolved
              ? 'inline-comment--resolved'
              : 'inline-comment--unresolved',
        }),
      },
      active: {
        default: false,
        parseHTML: el =>
          (el as HTMLSpanElement).getAttribute('data-active') === 'true',
        renderHTML: attrs => ({ 'data-active': attrs.active }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
        getAttrs: el =>
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

    const activeCommentMark = marks.find(mark => mark.type === commentMark);

    this.storage.activeCommentId = activeCommentMark?.attrs.commentId || null;

    this.options.onCommentActivated(this.storage.activeCommentId || '');
  },

  addStorage() {
    return {
      activeCommentId: null,
    };
  },

  addCommands() {
    return {
      setComment:
        (commentId: string) =>
        ({ commands }: CommandProps): boolean => {
          if (!commentId) return false;

          commands.setMark('comment', { commentId });
          return true;
        },
      unsetComment:
        commentId =>
        ({ tr, dispatch }) => {
          if (!commentId) return false;

          const commentMarksWithRange: MarkWithRange[] = [];

          tr.doc.descendants((node, pos) => {
            const commentMark = node.marks.find(
              mark =>
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
          return dispatch?.(tr);
        },
      resolveComment:
        (commentId: string) =>
        ({ tr, dispatch }) => {
          if (!commentId) return false;

          const commentMarksWithRange: MarkWithRange[] = [];

          tr.doc.descendants((node, pos) => {
            const commentMark = node.marks.find(
              mark =>
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
          return dispatch?.(tr);
        },
      unresolveComment:
        (commentId: string) =>
        ({ tr, dispatch }) => {
          if (!commentId) return false;

          const commentMarksWithRange: MarkWithRange[] = [];

          tr.doc.descendants((node, pos) => {
            const commentMark = node.marks.find(
              mark =>
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
          return dispatch?.(tr);
        },
      setCommentActive:
        (commentId: string) =>
        ({ tr, dispatch }) => {
          if (!commentId) return false;

          // First, remove active state from all comments
          tr.doc.descendants((node, pos) => {
            const commentMark = node.marks.find(
              mark => mark.type.name === 'comment',
            );
            if (commentMark) {
              tr.addMark(
                pos,
                pos + node.nodeSize,
                this.editor.schema.marks.comment.create({
                  ...commentMark.attrs,
                  active: commentMark.attrs.commentId === commentId,
                }),
              );
            }
          });

          return dispatch?.(tr);
        },
      unsetCommentActive:
        () =>
        ({ tr, dispatch }) => {
          // Remove active state from all comments
          tr.doc.descendants((node, pos) => {
            const commentMark = node.marks.find(
              (mark) => mark.type.name === 'comment',
            );
            if (commentMark) {
              tr.addMark(
                pos,
                pos + node.nodeSize,
                this.editor.schema.marks.comment.create({
                  ...commentMark.attrs,
                  active: false,
                }),
              );
            }
          });

          return dispatch?.(tr);
        },
    };
  },
});
