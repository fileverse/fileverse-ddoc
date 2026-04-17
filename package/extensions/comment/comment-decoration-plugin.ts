/**
 * Comment Decoration Plugin
 *
 * Paints comment highlights as ProseMirror decorations (visual layer)
 * instead of marks (document content). Anchor positions stored as
 * Yjs RelativePositions.
 */

import {
  Extension,
  getChangedRanges,
  type ChangedRange,
  type Editor,
} from '@tiptap/core';
import { type EditorState, Plugin, PluginKey } from '@tiptap/pm/state';
import { type Transform } from '@tiptap/pm/transform';
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

type CommentAnchorRange = { from: number; to: number };
type CommentAnchorRelativeRange = {
  anchorFrom: Y.RelativePosition;
  anchorTo: Y.RelativePosition;
};

export type CommentAnchorTransactionChange =
  | { id: string; type: 'unchanged' }
  | { id: string; type: 'deleted' }
  | ({
      id: string;
      type: 'edited';
    } & CommentAnchorRange &
      CommentAnchorRelativeRange);

// ---------------------------------------------------------------------------
// Plugin Key
// ---------------------------------------------------------------------------

export const commentDecorationPluginKey =
  new PluginKey<CommentDecorationPluginState>('commentDecoration');

// ---------------------------------------------------------------------------
// Anchor helpers
// ---------------------------------------------------------------------------

function resolveCommentAnchorRangeInState(
  anchor: Pick<CommentAnchor, 'anchorFrom' | 'anchorTo'>,
  state: EditorState,
): CommentAnchorRange | null {
  // Primary anchor resolution from RelativePositions.
  // Used during decoration building and transaction pre-state analysis.
  const syncState = ySyncPluginKey.getState(state);
  if (!syncState?.binding) {
    return null;
  }

  const maxPos = state.doc.content.size;
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

    // Validate resolved range — reject invalid, empty, or out-of-bounds ranges.
    if (from === null || to === null || from >= to) {
      return null;
    }

    if (from < 0 || to > maxPos) {
      return null;
    }

    return { from, to };
  } catch {
    // Gracefully handle resolution errors (e.g., corrupted positions)
    return null;
  }
}

/**
 * Resolve anchorFrom to a single absolute position.
 * Used for 'add' suggestion anchors where anchorFrom === anchorTo (cursor,
 * no initial selection) — resolveCommentAnchorRangeInState rejects from >= to,
 * so we need a separate path that allows a point position.
 */
export function resolveCommentAnchorPointInState(
  anchor: Pick<CommentAnchor, 'anchorFrom'>,
  state: EditorState,
): number | null {
  const syncState = ySyncPluginKey.getState(state);
  if (!syncState?.binding) return null;
  const { doc, type, binding } = syncState;
  try {
    const pos = relativePositionToAbsolutePosition(
      doc,
      type,
      anchor.anchorFrom,
      binding.mapping,
    );
    if (pos === null || pos < 0 || pos > state.doc.content.size) return null;
    return pos;
  } catch {
    return null;
  }
}

function resolveCommentAnchorRangeFromRenderedDecorations(
  commentId: string,
  state: EditorState,
): CommentAnchorRange | null {
  const pluginState = commentDecorationPluginKey.getState(state);
  const matchingDecorations =
    pluginState?.decorations.find(undefined, undefined, (spec) => {
      return spec?.commentId === commentId;
    }) ?? [];

  if (matchingDecorations.length === 0) {
    return null;
  }

  const from = Math.min(
    ...matchingDecorations.map((decoration) => decoration.from),
  );
  const to = Math.max(
    ...matchingDecorations.map((decoration) => decoration.to),
  );

  if (from >= to) {
    return null;
  }

  return { from, to };
}

function resolveCommentAnchorRangeForAnalysis(
  anchor: Pick<CommentAnchor, 'id' | 'anchorFrom' | 'anchorTo'>,
  state: EditorState,
): CommentAnchorRange | null {
  return (
    // For pre-transaction analysis, trust the rendered highlight snapshot first.
    // The sync plugin's Yjs mapping objects are live and can drift relative to
    // an old EditorState, while the old decoration set still reflects what the
    // user actually saw highlighted before the edit.
    resolveCommentAnchorRangeFromRenderedDecorations(anchor.id, state) ??
    resolveCommentAnchorRangeInState(anchor, state)
  );
}

function createCommentAnchorFromRangeInState(
  state: EditorState,
  from: number,
  to: number,
): CommentAnchorRelativeRange | null {
  const syncState = ySyncPluginKey.getState(state);

  if (!syncState?.binding || from >= to) {
    return null;
  }

  const { type, binding } = syncState;

  return {
    anchorFrom: absolutePositionToRelativePosition(from, type, binding.mapping),
    anchorTo: absolutePositionToRelativePosition(to, type, binding.mapping),
  };
}

function doesChangedRangeCoverAnchor(
  changedRange: ChangedRange,
  anchorRange: CommentAnchorRange,
) {
  // Identify full-span replacement of the original anchor.
  // Used to classify anchors as 'deleted' during transaction analysis.
  return (
    changedRange.oldRange.from <= anchorRange.from &&
    changedRange.oldRange.to >= anchorRange.to
  );
}

function doesChangedRangeAffectAnchor(
  changedRange: ChangedRange,
  anchorRange: CommentAnchorRange,
) {
  return (
    changedRange.oldRange.from < anchorRange.to &&
    changedRange.oldRange.to > anchorRange.from
  );
}

function isBoundaryInsertionAtAnchor(
  changedRange: ChangedRange,
  anchorRange: CommentAnchorRange,
) {
  const isPureInsertion =
    changedRange.oldRange.from === changedRange.oldRange.to &&
    changedRange.newRange.from !== changedRange.newRange.to;

  if (!isPureInsertion) {
    return false;
  }

  return (
    changedRange.oldRange.from === anchorRange.from ||
    changedRange.oldRange.from === anchorRange.to
  );
}

function getImpactingChangedRanges(
  changedRanges: ChangedRange[],
  anchorRange: CommentAnchorRange,
) {
  return changedRanges.filter(
    (changedRange) =>
      doesChangedRangeAffectAnchor(changedRange, anchorRange) ||
      isBoundaryInsertionAtAnchor(changedRange, anchorRange),
  );
}

function doChangedRangesCoverWholeAnchor(
  changedRanges: ChangedRange[],
  anchorRange: CommentAnchorRange,
) {
  // Check if multiple changed ranges, when combined, fully cover
  // the original anchor span. This handles multi-step transactions where
  // the full anchor text is eventually replaced (e.g., paste-over-selection).
  // If true, classify the anchor as 'deleted'.
  const coveredSegments = changedRanges
    .map((changedRange) => ({
      from: Math.max(anchorRange.from, changedRange.oldRange.from),
      to: Math.min(anchorRange.to, changedRange.oldRange.to),
    }))
    .filter((segment) => segment.to > segment.from)
    .sort((left, right) => left.from - right.from);

  if (coveredSegments.length === 0) {
    return false;
  }

  let coveredUntil = coveredSegments[0].from;

  if (coveredUntil > anchorRange.from) {
    return false;
  }

  for (const segment of coveredSegments) {
    if (segment.from > coveredUntil) {
      return false;
    }

    coveredUntil = Math.max(coveredUntil, segment.to);

    if (coveredUntil >= anchorRange.to) {
      return true;
    }
  }

  return coveredUntil >= anchorRange.to;
}

function mapAnchorRangeThroughTransform(
  range: CommentAnchorRange,
  transform: Transform,
  mappedDoc: EditorState['doc'],
): CommentAnchorRange | null {
  // Map boundaries directly with opposite association so deletes shrink the
  // anchor instead of letting decoration mapping absorb nearby text.
  const from = transform.mapping.map(range.from, 1);
  const to = transform.mapping.map(range.to, -1);

  if (from >= to) {
    return null;
  }

  if (from < 0 || to > mappedDoc.content.size) {
    return null;
  }

  return { from, to };
}

/**
 * Analyze transaction changes to classify each active anchor's mutation status.
 *
 * This is the core transaction analysis function that determines
 * whether each anchor remains unchanged, gets edited, or is deleted.
 *
 * Classification rules (in order):
 * 1. Skip deleted or resolved anchors → 'unchanged'
 * 2. If anchor has no old position → 'unchanged'
 * 3. If no changed ranges touch the anchor → 'unchanged'
 * 4. If any changed range fully covers the anchor → 'deleted' (full-span replacement)
 * 5. If combined changed ranges fully cover the anchor → 'deleted' (multi-step removal)
 * 6. If anchor maps through transform → check if position or content changed:
 *    a. If both unchanged → 'unchanged'
 *    b. Otherwise → 'edited' (return new position and relative anchor)
 * 7. If mapping fails → 'deleted'
 */
export function analyzeCommentAnchorTransactionChanges(
  anchors: CommentAnchor[],
  oldState: EditorState,
  newState: EditorState,
  transform: Transform,
): CommentAnchorTransactionChange[] {
  const changedRanges = getChangedRanges(transform);

  if (changedRanges.length === 0) {
    return anchors.map((anchor) => ({ id: anchor.id, type: 'unchanged' }));
  }

  return anchors.map((anchor) => {
    // Skip anchors marked as deleted or resolved.
    if (anchor.deleted || anchor.resolved) {
      return { id: anchor.id, type: 'unchanged' };
    }

    // Resolve the anchor's old absolute range from pre-transaction state.
    const oldRange = resolveCommentAnchorRangeForAnalysis(anchor, oldState);

    if (!oldRange) {
      return { id: anchor.id, type: 'unchanged' };
    }

    // Find all changed ranges that overlap with this anchor.
    const impactingRanges = getImpactingChangedRanges(changedRanges, oldRange);
    const oldSelectedContent = oldState.doc.textBetween(
      oldRange.from,
      oldRange.to,
      ' ',
    );

    // If no changes touch the anchor, it remains unchanged.
    if (impactingRanges.length === 0) {
      return { id: anchor.id, type: 'unchanged' };
    }

    // If any changed range (or combined ranges) fully covers the old anchor,
    // classify as deleted.
    if (
      impactingRanges.some((changedRange) =>
        doesChangedRangeCoverAnchor(changedRange, oldRange),
      ) ||
      doChangedRangesCoverWholeAnchor(impactingRanges, oldRange)
    ) {
      return { id: anchor.id, type: 'deleted' };
    }

    // Map the old anchor range through the transform to find new position.
    const mappedRange = mapAnchorRangeThroughTransform(
      oldRange,
      transform,
      newState.doc,
    );

    if (!mappedRange) {
      return { id: anchor.id, type: 'deleted' };
    }

    // Create new RelativePositions for the mapped range.
    const nextAnchor = createCommentAnchorFromRangeInState(
      newState,
      mappedRange.from,
      mappedRange.to,
    );

    if (!nextAnchor) {
      return { id: anchor.id, type: 'unchanged' };
    }

    const newSelectedContent = newState.doc.textBetween(
      mappedRange.from,
      mappedRange.to,
      ' ',
    );
    const didMappedRangeChange =
      mappedRange.from !== oldRange.from || mappedRange.to !== oldRange.to;
    const didSelectedContentChange = newSelectedContent !== oldSelectedContent;

    // Only emit 'edited' if either anchor position or selected content changed.
    if (!didMappedRangeChange && !didSelectedContentChange) {
      return { id: anchor.id, type: 'unchanged' };
    }

    return {
      id: anchor.id,
      type: 'edited',
      from: mappedRange.from,
      to: mappedRange.to,
      ...nextAnchor,
    };
  });
}

// ---------------------------------------------------------------------------
// Build decorations from anchors
// ---------------------------------------------------------------------------

function createSuggestionWidget(text: string, commentId: string): HTMLElement {
  const span = document.createElement('span');
  span.className = 'suggestion-add';
  span.textContent = text;
  span.dataset.suggestionId = commentId;
  return span;
}

function buildDecorations(
  anchors: CommentAnchor[],
  state: EditorState,
): DecorationSet {
  // Build a new set of decorations from the current anchor list.
  // This is called:
  //   - On plugin init
  //   - On every doc change
  //   - When explicitly triggered via triggerDecorationRebuild()
  const syncState = ySyncPluginKey.getState(state);
  if (!syncState?.binding) {
    return DecorationSet.empty;
  }

  const decorations: Decoration[] = [];

  for (const anchor of anchors) {
    // Skip deleted anchors entirely.
    if (anchor.deleted) continue;
    // Skip resolved non-suggestion anchors; resolved suggestions stay visible until accepted/rejected.
    if (anchor.resolved && !anchor.isSuggestion) continue;

    const range = resolveCommentAnchorRangeInState(anchor, state);
    if (!range) continue;

    if (anchor.isSuggestion) {
      const { suggestionType, suggestedContent } = anchor;

      // Delete / Replace: strikethrough on the original text range
      if (
        (suggestionType === 'delete' || suggestionType === 'replace') &&
        range.from < range.to
      ) {
        decorations.push(
          Decoration.inline(range.from, range.to, {
            class: 'suggestion-delete',
            'data-suggestion-id': anchor.id,
          }),
        );
      }

      // Add / Replace: widget showing the proposed content
      if (
        (suggestionType === 'add' || suggestionType === 'replace') &&
        suggestedContent
      ) {
        const insertPos = suggestionType === 'add' ? range.from : range.to;
        decorations.push(
          Decoration.widget(
            insertPos,
            createSuggestionWidget(suggestedContent, anchor.id),
            {
              side: 1,
              key: `suggestion-insert-${anchor.id}`,
              destroy: (node) => (node as HTMLElement).remove(),
            },
          ),
        );
      }
    } else {
      // Regular comment — existing decoration unchanged
      if (range.from >= range.to) continue;
      decorations.push(
        Decoration.inline(
          range.from,
          range.to,
          {
            class: 'inline-comment inline-comment--unresolved',
            'data-comment-id': anchor.id,
          },
          { commentId: anchor.id },
        ),
      );
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
              // Build decorations on plugin init.
              return {
                decorations: buildDecorations(getAnchors(), editorState),
              };
            },
            apply(tr, pluginState, _oldState, newState) {
              // Rebuild decorations if:
              //   1. Document changed (tr.docChanged)
              //   2. Explicit rebuild triggered (tr.getMeta(commentDecorationPluginKey))
              // Otherwise, map existing decorations through the transaction's mapping
              // to preserve visual highlights during non-doc changes (e.g., selection moves).
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
// Public helpers
// ---------------------------------------------------------------------------
/**
 * Public helper functions for comment anchor creation and inspection.
 * These are consumed by the draft-creation flow and transaction-analysis layer.
 */

export function createCommentAnchorFromEditor(
  editor: Editor,
  from: number,
  to: number,
): CommentAnchorRelativeRange | null {
  // Create anchor from explicit absolute range.
  return createCommentAnchorFromRangeInState(editor.state, from, to);
}

export function createCommentAnchorFromSelection(
  editor: Editor,
): CommentAnchorRelativeRange | null {
  // Create anchor from current editor selection. Returns null if no selection.
  const { from, to } = editor.state.selection;

  if (from === to) {
    return null;
  }

  return createCommentAnchorFromRangeInState(editor.state, from, to);
}

export function triggerDecorationRebuild(editor: Editor) {
  // Force immediate decoration rebuild.
  // Called after:
  //   - initialCommentAnchors updated (consumer rehydration)
  //   - edited anchors batch-updated in commentAnchorsRef
  if (!editor?.view || editor.isDestroyed) {
    return;
  }

  const tr = editor.state.tr;
  tr.setMeta(commentDecorationPluginKey, { rebuild: true });
  editor.view.dispatch(tr);
}

export function getCommentAtPosition(
  editor: Editor,
  pos: number,
  getAnchors: () => CommentAnchor[],
): CommentAnchor | null {
  // Find the active (undeleted) anchor containing the cursor position.
  // Used in transaction listener to auto-activate floating threads on selection.
  const anchors = getAnchors();

  for (const anchor of anchors) {
    if (anchor.deleted) {
      continue;
    }

    const range = resolveCommentAnchorRangeInState(anchor, editor.state);

    if (!range) {
      continue;
    }

    if (pos >= range.from && pos <= range.to) {
      return anchor;
    }
  }

  return null;
}

export function getCommentAnchorRange(
  editor: Editor,
  commentId: string,
  getAnchors: () => CommentAnchor[],
): CommentAnchorRange | null {
  // Find the current absolute range for a specific comment anchor.
  const anchor = getAnchors().find(
    (entry) => entry.id === commentId && !entry.deleted,
  );

  if (!anchor) {
    return null;
  }

  return resolveCommentAnchorRangeInState(anchor, editor.state);
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
