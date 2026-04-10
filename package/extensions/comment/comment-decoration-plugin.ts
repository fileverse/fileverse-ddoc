/**
 * Comment Decoration Plugin
 *
 * Paints comment highlights as ProseMirror decorations (visual layer)
 * instead of marks (document content). Anchor positions stored as
 * Yjs RelativePositions — they survive text edits automatically.
 */

import { Extension, type Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  ySyncPluginKey,
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
} from '@tiptap/y-tiptap';
import * as Y from 'yjs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommentAnchor {
  id: string;
  anchorFrom: Y.RelativePosition;
  anchorTo: Y.RelativePosition;
  resolved: boolean;
  deleted: boolean;
}

interface CommentDecorationPluginState {
  decorations: DecorationSet;
}

// ---------------------------------------------------------------------------
// Plugin Key
// ---------------------------------------------------------------------------

export const commentDecorationPluginKey =
  new PluginKey<CommentDecorationPluginState>('commentDecoration');

// ---------------------------------------------------------------------------
// Build decorations from anchors
// ---------------------------------------------------------------------------

function buildDecorations(anchors: CommentAnchor[], state: any): DecorationSet {
  const syncState = ySyncPluginKey.getState(state);
  if (!syncState?.binding) return DecorationSet.empty;

  const { doc, type, binding } = syncState;
  const decorations: Decoration[] = [];

  const maxPos = state.doc.content.size;

  for (const anchor of anchors) {
    if (anchor.deleted || anchor.resolved) continue;

    try {
      const from = relativePositionToAbsolutePosition(
        doc,
        type,
        anchor.anchorFrom,
        binding.mapping,
      );
      const to = relativePositionToAbsolutePosition(
        doc,
        type,
        anchor.anchorTo,
        binding.mapping,
      );

      if (from === null || to === null) continue;
      if (from >= to) continue;
      if (from < 0 || to > maxPos) continue;

      decorations.push(
        Decoration.inline(from, to, {
          class: 'inline-comment inline-comment--unresolved',
          'data-comment-id': anchor.id,
        }),
      );
    } catch {
      // Anchor position can't be resolved — skip silently
      continue;
    }
  }

  return DecorationSet.create(state.doc, decorations);
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export interface CommentDecorationOptions {
  getAnchors: () => CommentAnchor[];
}

export const CommentDecorationExtension =
  Extension.create<CommentDecorationOptions>({
    name: 'commentDecoration',

    addOptions() {
      return {
        getAnchors: () => [],
      };
    },

    addProseMirrorPlugins() {
      const { getAnchors } = this.options;

      return [
        new Plugin({
          key: commentDecorationPluginKey,

          state: {
            init(_, editorState) {
              return {
                decorations: buildDecorations(getAnchors(), editorState),
              };
            },
            apply(tr, pluginState, _oldState, newState) {
              if (tr.docChanged || tr.getMeta(commentDecorationPluginKey)) {
                return {
                  decorations: buildDecorations(getAnchors(), newState),
                };
              }
              return {
                decorations: pluginState.decorations.map(tr.mapping, tr.doc),
              };
            },
          },

          props: {
            decorations(state) {
              return (
                commentDecorationPluginKey.getState(state)?.decorations ??
                DecorationSet.empty
              );
            },
          },
        }),
      ];
    },
  });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function createCommentAnchorFromEditor(
  editor: any,
  from: number,
  to: number,
): { anchorFrom: Y.RelativePosition; anchorTo: Y.RelativePosition } | null {
  const state = editor.state;
  const syncState = ySyncPluginKey.getState(state);

  if (!syncState?.binding) return null;
  if (from >= to) return null;

  const { type, binding } = syncState;

  const anchorFrom = absolutePositionToRelativePosition(
    from,
    type,
    binding.mapping,
  );
  const anchorTo = absolutePositionToRelativePosition(
    to,
    type,
    binding.mapping,
  );

  return { anchorFrom, anchorTo };
}

export function createCommentAnchorFromSelection(
  editor: any,
): { anchorFrom: Y.RelativePosition; anchorTo: Y.RelativePosition } | null {
  const state = editor.state;
  const syncState = ySyncPluginKey.getState(state);

  if (!syncState?.binding) return null;

  const { from, to } = state.selection;
  if (from === to) return null;

  const { type, binding } = syncState;

  const anchorFrom = absolutePositionToRelativePosition(
    from,
    type,
    binding.mapping,
  );
  const anchorTo = absolutePositionToRelativePosition(
    to,
    type,
    binding.mapping,
  );

  return { anchorFrom, anchorTo };
}

export function triggerDecorationRebuild(editor: any) {
  if (!editor?.view || editor.isDestroyed) return;
  const tr = editor.state.tr;
  tr.setMeta(commentDecorationPluginKey, { rebuild: true });
  editor.view.dispatch(tr);
}

export function getCommentAtPosition(
  editor: any,
  pos: number,
  getAnchors: () => CommentAnchor[],
): CommentAnchor | null {
  const state = editor.state;
  const syncState = ySyncPluginKey.getState(state);
  if (!syncState?.binding) return null;

  const { doc, type, binding } = syncState;
  const anchors = getAnchors();

  for (const anchor of anchors) {
    if (anchor.deleted) continue;
    try {
      const from = relativePositionToAbsolutePosition(
        doc,
        type,
        anchor.anchorFrom,
        binding.mapping,
      );
      const to = relativePositionToAbsolutePosition(
        doc,
        type,
        anchor.anchorTo,
        binding.mapping,
      );
      if (from === null || to === null) continue;
      if (from < 0 || to > state.doc.content.size) continue;
      if (pos >= from && pos <= to) {
        return anchor;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function getCommentAnchorRange(
  editor: Editor,
  commentId: string,
  getAnchors: () => CommentAnchor[],
): { from: number; to: number } | null {
  const state = editor.state;
  const syncState = ySyncPluginKey.getState(state);
  if (!syncState?.binding) return null;

  const { doc, type, binding } = syncState;
  const anchor = getAnchors().find(
    (entry) => entry.id === commentId && !entry.deleted,
  );

  if (!anchor) {
    return null;
  }

  try {
    const from = relativePositionToAbsolutePosition(
      doc,
      type,
      anchor.anchorFrom,
      binding.mapping,
    );
    const to = relativePositionToAbsolutePosition(
      doc,
      type,
      anchor.anchorTo,
      binding.mapping,
    );

    if (from === null || to === null || from >= to) {
      return null;
    }

    if (from < 0 || to > state.doc.content.size) {
      return null;
    }

    return { from, to };
  } catch {
    return null;
  }
}
