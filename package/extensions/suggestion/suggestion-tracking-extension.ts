/**
 * SuggestionTrackingExtension
 *
 * Captures viewer edits in suggestion mode and shows suggestion decorations
 * in real-time as the user types — no blur required.
 *
 * Approach (V1):
 * - onSelectionUpdate: capture Yjs RelativePosition anchors + original content.
 * - appendTransaction: accumulate inserted text / track deletions, upsert a
 *   live CommentAnchor so the decoration rebuilds on every keystroke.
 * - onSelectionUpdate (manual cursor move) / onBlur: finalize the suggestion
 *   by calling onSuggestionReady for persistence.
 * - Does NOT modify the document (no marks, no re-insertions).
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ReplaceStep } from '@tiptap/pm/transform';
import {
  ySyncPluginKey,
  absolutePositionToRelativePosition,
} from '@tiptap/y-tiptap';
import * as Y from 'yjs';
import uuid from 'react-uuid';
import { SuggestionType } from '../../types';
import {
  CommentAnchor,
  triggerDecorationRebuild,
} from '../comment/comment-decoration-plugin';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SuggestionReadyData {
  suggestionId: string;
  anchorFrom: Y.RelativePosition;
  anchorTo: Y.RelativePosition;
  suggestionType: SuggestionType;
  originalContent: string;
  suggestedContent: string;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

interface PendingSuggestionContext {
  suggestionId: string;
  anchorFrom: Y.RelativePosition;
  anchorTo: Y.RelativePosition;
  selectionFrom: number;
  selectionTo: number;
  originalContent: string;
  /** Accumulated text from all insert slices since context was captured. */
  insertedText: string;
  /** True if at least one ReplaceStep had a non-empty deletion range. */
  hadDeletion: boolean;
  /** True once at least one tracked docChanged transaction has arrived. */
  hasEdits: boolean;
  /** True once submitted via onSuggestionReady (prevents double-submit). */
  finalized: boolean;
}

// PluginKey for internal use
export const suggestionTrackingPluginKey = new PluginKey<null>(
  'suggestionTracking',
);

// ---------------------------------------------------------------------------
// Extension options
// ---------------------------------------------------------------------------

export interface SuggestionTrackingOptions {
  /** Returns true when the editor is in suggestion mode. */
  getIsSuggestionMode: () => boolean;
  /**
   * Called on every keystroke to upsert the live anchor into commentAnchorsRef
   * so the decoration rebuilds immediately.
   */
  onLiveSuggestion: ((anchor: CommentAnchor) => void) | null;
  /**
   * Called once when the suggestion is finalized (cursor moves away or blur).
   * Used for persistence — anchor is already in commentAnchorsRef at this point.
   */
  onSuggestionReady: ((data: SuggestionReadyData) => void) | null;
}

// ---------------------------------------------------------------------------
// Extension storage (shared across ALL lifecycle hooks and plugin closures)
// ---------------------------------------------------------------------------

interface SuggestionTrackingStorage {
  pendingContext: PendingSuggestionContext | null;
  /**
   * Set true by appendTransaction on doc-changing transactions.
   * Read + reset by onSelectionUpdate to distinguish typing vs. manual click.
   */
  lastTransactionWasDocChange: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveSuggestionType(
  context: PendingSuggestionContext,
): SuggestionType {
  if (context.hadDeletion) {
    return context.insertedText.length > 0 ? 'replace' : 'delete';
  }
  return 'add';
}

function buildLiveAnchor(context: PendingSuggestionContext): CommentAnchor {
  return {
    id: context.suggestionId,
    anchorFrom: context.anchorFrom,
    anchorTo: context.anchorTo,
    resolved: false,
    deleted: false,
    isSuggestion: true,
    suggestionType: deriveSuggestionType(context),
    originalContent: context.originalContent,
    suggestedContent: context.insertedText,
  };
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export const SuggestionTrackingExtension = Extension.create<
  SuggestionTrackingOptions,
  SuggestionTrackingStorage
>({
  name: 'suggestionTracking',

  addOptions() {
    return {
      getIsSuggestionMode: () => false,
      onLiveSuggestion: null,
      onSuggestionReady: null,
    };
  },

  addStorage() {
    return {
      pendingContext: null,
      lastTransactionWasDocChange: false,
    };
  },

  // -------------------------------------------------------------------------
  // onSelectionUpdate
  //
  // 1. If the selection changed due to a manual click (not typing) and there
  //    is an unfinalized pending suggestion → finalize it.
  // 2. Capture fresh Yjs anchors for the new cursor/selection position.
  // -------------------------------------------------------------------------

  onSelectionUpdate() {
    const { getIsSuggestionMode, onSuggestionReady } = this.options;
    if (!getIsSuggestionMode()) return;

    const wasTyping = this.storage.lastTransactionWasDocChange;
    this.storage.lastTransactionWasDocChange = false;

    // Typing moves the cursor — keep the existing context so insertedText
    // keeps accumulating across keystrokes.
    if (wasTyping) return;

    // Manual cursor movement — finalize any unsubmitted suggestion first.
    const prev = this.storage.pendingContext;
    if (prev?.hasEdits && !prev.finalized && onSuggestionReady) {
      prev.finalized = true;
      onSuggestionReady({
        suggestionId: prev.suggestionId,
        anchorFrom: prev.anchorFrom,
        anchorTo: prev.anchorTo,
        suggestionType: deriveSuggestionType(prev),
        originalContent: prev.originalContent,
        suggestedContent: prev.insertedText,
      });
    }

    const { editor } = this;
    const { from, to } = editor.state.selection;
    const syncState = ySyncPluginKey.getState(editor.state);
    if (!syncState?.binding) return;

    const { type, binding } = syncState;

    try {
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

      this.storage.pendingContext = {
        suggestionId: `comment-${uuid()}`,
        anchorFrom,
        anchorTo,
        selectionFrom: from,
        selectionTo: to,
        originalContent: editor.state.doc.textBetween(from, to, '\n'),
        insertedText: '',
        hadDeletion: false,
        hasEdits: false,
        finalized: false,
      };
    } catch {
      // Yjs binding not ready — skip
    }
  },

  // -------------------------------------------------------------------------
  // onBlur — finalize if not yet done (e.g. user tabs out of editor)
  // -------------------------------------------------------------------------

  onBlur() {
    const { getIsSuggestionMode, onSuggestionReady } = this.options;
    if (!getIsSuggestionMode()) return;

    const context = this.storage.pendingContext;
    if (!context?.hasEdits || context.finalized || !onSuggestionReady) return;

    context.finalized = true;
    onSuggestionReady({
      suggestionId: context.suggestionId,
      anchorFrom: context.anchorFrom,
      anchorTo: context.anchorTo,
      suggestionType: deriveSuggestionType(context),
      originalContent: context.originalContent,
      suggestedContent: context.insertedText,
    });
  },

  // -------------------------------------------------------------------------
  // ProseMirror plugin — accumulate edits + trigger live decoration
  // -------------------------------------------------------------------------

  addProseMirrorPlugins() {
    const storage = this.storage;
    const getOptions = () => this.options;
    // Capture a getter so appendTransaction can reach the TipTap editor.
    const getEditor = () => this.editor;

    return [
      new Plugin({
        key: suggestionTrackingPluginKey,

        appendTransaction(transactions) {
          const { getIsSuggestionMode, onLiveSuggestion } = getOptions();
          if (!getIsSuggestionMode()) return null;

          for (const tr of transactions) {
            if (tr.getMeta('y-sync$')) return null;
            if (tr.getMeta(suggestionTrackingPluginKey)) return null;
          }

          if (!transactions.some((tr) => tr.docChanged)) return null;

          const context = storage.pendingContext;
          if (!context) return null;

          storage.lastTransactionWasDocChange = true;

          for (const tr of transactions) {
            if (!tr.docChanged) continue;
            for (const step of tr.steps) {
              if (!(step instanceof ReplaceStep)) continue;

              if (step.from < step.to) {
                context.hadDeletion = true;
              }

              if (step.slice.size > 0) {
                context.insertedText += step.slice.content.textBetween(
                  0,
                  step.slice.content.size,
                  '',
                );
              }

              context.hasEdits = true;
            }
          }

          if (!context.hasEdits) return null;

          // Update commentAnchorsRef with the live anchor, then schedule a
          // decoration rebuild outside this transaction (setTimeout avoids
          // dispatching during an ongoing dispatch).
          onLiveSuggestion?.(buildLiveAnchor(context));
          setTimeout(() => {
            const editor = getEditor();
            if (editor && !editor.isDestroyed) {
              triggerDecorationRebuild(editor);
            }
          }, 0);

          return null;
        },
      }),
    ];
  },
});
