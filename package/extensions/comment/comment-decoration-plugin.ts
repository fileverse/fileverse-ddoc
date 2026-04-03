/**
 * Comment Decoration Plugin
 *
 * Paints comment highlights as ProseMirror decorations (visual layer)
 * instead of marks (document content). Anchor positions stored as
 * Yjs RelativePositions — they survive text edits automatically.
 */

import { Extension } from '@tiptap/core';
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

function buildDecorations(
  anchors: CommentAnchor[],
  state: any,
): DecorationSet {
  const syncState = ySyncPluginKey.getState(state);
  if (!syncState?.binding) return DecorationSet.empty;

  const { doc, type, binding } = syncState;
  const decorations: Decoration[] = [];

  for (const anchor of anchors) {
    if (anchor.deleted) continue;

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

    const className = anchor.resolved
      ? 'inline-comment inline-comment--resolved'
      : 'inline-comment inline-comment--unresolved';

    decorations.push(
      Decoration.inline(from, to, {
        class: className,
        'data-comment-id': anchor.id,
      }),
    );
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
    if (from !== null && to !== null && pos >= from && pos <= to) {
      return anchor;
    }
  }
  return null;
}
