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
import { SuggestionType } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommentAnchor {
  id: string;
  anchorFrom: Y.RelativePosition;
  anchorTo: Y.RelativePosition;
  resolved: boolean;
  deleted: boolean;
  isSuggestion?: boolean;
  suggestionType?: SuggestionType;
  originalContent?: string;
  suggestedContent?: string;
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

function createSuggestionWidget(text: string, commentId: string): HTMLElement {
  const span = document.createElement('span');
  span.className = 'suggestion-add';
  span.textContent = text;
  span.dataset.commentId = commentId;
  return span;
}

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
      if (from < 0 || to > maxPos) continue;

      if (anchor.isSuggestion) {
        const { suggestionType, suggestedContent } = anchor;

        if (suggestionType === 'add') {
          // ADD: from === to (cursor position) — widget only, no inline range
          if (suggestedContent) {
            decorations.push(
              Decoration.widget(from, createSuggestionWidget(suggestedContent, anchor.id), {
                side: 1,
                key: `suggestion-add-${anchor.id}`,
              }),
            );
          }
        } else if (suggestionType === 'delete') {
          // DELETE: strike through existing text, no widget
          if (from >= to) continue;
          decorations.push(
            Decoration.inline(from, to, {
              class: 'suggestion-delete',
              'data-comment-id': anchor.id,
            }),
          );
        } else if (suggestionType === 'replace') {
          // REPLACE: strike through original, then widget for proposed text
          if (from >= to) continue;
          decorations.push(
            Decoration.inline(from, to, {
              class: 'suggestion-delete',
              'data-comment-id': anchor.id,
            }),
          );
          if (suggestedContent) {
            decorations.push(
              Decoration.widget(to, createSuggestionWidget(suggestedContent, anchor.id), {
                side: 1,
                key: `suggestion-replace-${anchor.id}`,
              }),
            );
          }
        }
      } else {
        // Regular comment
        if (from >= to) continue;
        decorations.push(
          Decoration.inline(from, to, {
            class: 'inline-comment inline-comment--unresolved',
            'data-comment-id': anchor.id,
          }),
        );
      }
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

/**
 * Apply the accepted suggestion's change to the document.
 * Called by the store's acceptSuggestion action before resolving on-chain.
 * Returns false if the anchor can't be resolved or the suggestion type is unknown.
 */
export function applyAcceptedSuggestion(
  editor: Editor,
  anchor: CommentAnchor,
): boolean {
  if (!anchor.isSuggestion) return false;

  const state = editor.state;
  const syncState = ySyncPluginKey.getState(state);
  if (!syncState?.binding) return false;

  const { doc, type, binding } = syncState;

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

    if (from === null || to === null) return false;
    if (from < 0 || to > state.doc.content.size) return false;

    const { suggestionType, suggestedContent } = anchor;
    const { tr } = state;

    if (suggestionType === 'add') {
      if (!suggestedContent) return false;
      tr.insertText(suggestedContent, from);
    } else if (suggestionType === 'delete') {
      if (from >= to) return false;
      tr.delete(from, to);
    } else if (suggestionType === 'replace') {
      if (from >= to || !suggestedContent) return false;
      // insertText with a range replaces from..to with the new text
      tr.insertText(suggestedContent, from, to);
    } else {
      return false;
    }

    editor.view.dispatch(tr);
    return true;
  } catch {
    return false;
  }
}
