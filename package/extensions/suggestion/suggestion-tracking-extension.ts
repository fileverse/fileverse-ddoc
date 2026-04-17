/**
 * SuggestionTrackingExtension
 *
 * Intercepts viewer keystrokes in suggestion mode and routes them to the
 * Zustand store as pending-draft actions. The ProseMirror document is never
 * modified by this extension — typed text is captured as a proposed change,
 * rendered as a decoration overlay via the draft anchor layer.
 *
 * Design: props-based plugin (handleKeyDown, handleTextInput, handlePaste,
 * handleDrop). Each handler returns true to block the default behavior when
 * suggestion mode is active; the extension never dispatches a doc-modifying
 * transaction. The only path that modifies the doc in the entire suggestion
 * system is applyAcceptedSuggestion on owner Accept.
 *
 * See docs/architecture/suggestion-mode-architecture.md for the full model.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ReplaceStep } from '@tiptap/pm/transform';
import * as Y from 'yjs';
import { SuggestionType } from '../../types';
import type { CommentAnchor } from '../comment/comment-decoration-plugin';

// ---------------------------------------------------------------------------
// Public types — kept for downstream import compatibility. SuggestionReadyData
// is unused by the new model (submit goes through the store, not a TipTap
// command) but exported so consumers that reference the type still compile.
// ---------------------------------------------------------------------------

export interface SuggestionReadyData {
  suggestionId: string;
  anchorFrom: Y.RelativePosition;
  anchorTo: Y.RelativePosition;
  suggestionType: SuggestionType;
  originalContent: string;
  suggestedContent: string;
}

export interface SuggestionTrackingOptions {
  /** Returns true when the editor is in suggestion mode. */
  getIsSuggestionMode: () => boolean;

  /** Viewer types text with a collapsed cursor (Add gesture). */
  onTextInput: (text: string) => void;

  /** Viewer types text over a non-empty selection (Replace gesture). */
  onReplaceTyping: (from: number, to: number, text: string) => void;

  /** Viewer presses Backspace/Delete with a non-empty selection. */
  onDeleteSelection: (from: number, to: number) => void;

  /** Viewer presses Cmd+Z (or Ctrl+Z). Shrinks the active draft by one keystroke. */
  onUndo: () => void;

  // Legacy — unused by the new model, retained as optional for backwards
  // compatibility with any consumer that still passes them.
  onLiveSuggestion?: ((anchor: CommentAnchor) => void) | null;
  onSuggestionReady?: ((data: SuggestionReadyData) => void) | null;
}

// ---------------------------------------------------------------------------
// Plugin key — exposed so provider / debug tooling can set transaction metas
// that this plugin should ignore (e.g. cursor-only adjustments). Currently
// the plugin doesn't read meta; the key is reserved for future use.
// ---------------------------------------------------------------------------

export const suggestionTrackingPluginKey = new PluginKey<null>(
  'suggestionTracking',
);

// ---------------------------------------------------------------------------
// Keystroke classification helpers
// ---------------------------------------------------------------------------

function isFormattingShortcut(event: KeyboardEvent): boolean {
  // Cmd/Ctrl + B / I / U — bold, italic, underline. Shift+... for strike in
  // some bindings; block that conservatively too.
  const isMod = event.metaKey || event.ctrlKey;
  if (!isMod) return false;
  const key = event.key.toLowerCase();
  return key === 'b' || key === 'i' || key === 'u';
}

function isUndoShortcut(event: KeyboardEvent): boolean {
  const isMod = event.metaKey || event.ctrlKey;
  return isMod && !event.shiftKey && event.key.toLowerCase() === 'z';
}

function isRedoShortcut(event: KeyboardEvent): boolean {
  // Cmd+Shift+Z (mac) and Cmd+Y (win). Also Ctrl+Y.
  const isMod = event.metaKey || event.ctrlKey;
  if (!isMod) return false;
  const key = event.key.toLowerCase();
  return (event.shiftKey && key === 'z') || key === 'y';
}

function isCutShortcut(event: KeyboardEvent): boolean {
  const isMod = event.metaKey || event.ctrlKey;
  return isMod && event.key.toLowerCase() === 'x';
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export const SuggestionTrackingExtension =
  Extension.create<SuggestionTrackingOptions>({
    name: 'suggestionTracking',

    addOptions() {
      return {
        getIsSuggestionMode: () => false,
        onTextInput: () => {},
        onReplaceTyping: () => {},
        onDeleteSelection: () => {},
        onUndo: () => {},
        onLiveSuggestion: null,
        onSuggestionReady: null,
      };
    },

    addProseMirrorPlugins() {
      const getOptions = () => this.options;

      return [
        new Plugin({
          key: suggestionTrackingPluginKey,

          // Safety net: some deletion paths (double-click word select +
          // Backspace, IME delete, beforeinput-driven deletions) bypass
          // handleKeyDown and handleDOMEvents entirely. filterTransaction
          // catches EVERY transaction before dispatch — if one is about to
          // modify the doc while in suggest mode, we cancel it and schedule
          // the matching draft action.
          filterTransaction(tr, state) {
            const opts = getOptions();
            if (!opts.getIsSuggestionMode()) return true;
            if (!tr.docChanged) return true;
            if (tr.getMeta(suggestionTrackingPluginKey)) return true;
            if (tr.getMeta('y-sync$')) return true;

            // Pre-transaction selection tells us whether the user had a
            // range selected. Without a selection, a deletion is "bare
            // backspace in active draft" — we shrink the draft instead of
            // creating a Delete suggestion.
            const hadSelection = state.selection.from < state.selection.to;

            // Classify the transaction by inspecting its steps:
            //   - deletedRange: a pure text-range deletion
            //   - insertedText: pure text content being inserted
            //   - hasStructuralChange: boundaries / node splits / non-ReplaceSteps
            // Enter, Tab, paste-with-structure, drag, etc. produce structural
            // changes — we block those silently (no draft action).
            let deletedRange: { from: number; to: number } | null = null;
            let insertedText = '';
            let hasStructuralChange = false;

            for (const step of tr.steps) {
              if (!(step instanceof ReplaceStep)) {
                hasStructuralChange = true;
                continue;
              }
              if (step.slice.openStart > 0 || step.slice.openEnd > 0) {
                hasStructuralChange = true;
              }
              if (step.from < step.to) {
                deletedRange = { from: step.from, to: step.to };
              }
              if (step.slice.size > 0) {
                insertedText += step.slice.content.textBetween(
                  0,
                  step.slice.content.size,
                  '',
                );
              }
            }

            // Structural changes (Enter, Tab, paste-with-blocks, node splits)
            // are blocked silently per spec ("blocked gestures simply do nothing").
            if (hasStructuralChange) {
              return false;
            }

            // Pure text change: translate to a draft action.
            if (deletedRange || insertedText) {
              setTimeout(() => {
                if (deletedRange && insertedText) {
                  opts.onReplaceTyping(
                    deletedRange.from,
                    deletedRange.to,
                    insertedText,
                  );
                } else if (deletedRange && hadSelection) {
                  // User selected text and pressed Backspace/Delete
                  opts.onDeleteSelection(deletedRange.from, deletedRange.to);
                } else if (deletedRange) {
                  // Bare backspace (no user selection) inside an active draft
                  // → shrink the active draft instead of creating a 1-char
                  // Delete suggestion. Silent no-op if no active draft.
                  opts.onUndo();
                } else if (insertedText) {
                  opts.onTextInput(insertedText);
                }
              }, 0);
            }

            // Always block any doc-changing transaction in suggest mode — the
            // document is only modified on owner Accept.
            return false;
          },

          props: {
            // ----- Text input ------------------------------------------------
            // Fires for ordinary typing (including post-composition IME commit).
            // If a selection is active, treat as Replace gesture; otherwise Add.
            handleTextInput(_view, from, to, text) {
              const opts = getOptions();
              if (!opts.getIsSuggestionMode()) return false;

              if (from < to) {
                opts.onReplaceTyping(from, to, text);
              } else {
                opts.onTextInput(text);
              }
              return true;
            },

            // ----- Key down --------------------------------------------------
            // Handle non-text keys: Backspace/Delete, Enter, Tab, Cmd+Z, blocked
            // shortcuts. Return true for anything we want to block or intercept.
            handleKeyDown(view, event) {
              const opts = getOptions();
              if (!opts.getIsSuggestionMode()) return false;

              const { from, to } = view.state.selection;

              // Backspace / Delete:
              //   - with selection → Delete draft
              //   - without selection → treat as undo of the active draft's
              //     last keystroke (feels like Google Docs while typing).
              //     When no draft is at the cursor, this is a silent no-op
              //     per spec.
              if (event.key === 'Backspace' || event.key === 'Delete') {
                if (from < to) {
                  opts.onDeleteSelection(from, to);
                } else {
                  opts.onUndo();
                }
                return true;
              }

              // Enter / Tab — blocked per v1 spec
              if (event.key === 'Enter' || event.key === 'Tab') {
                return true;
              }

              // Escape — no-op but block to be explicit
              if (event.key === 'Escape') {
                return true;
              }

              // Cmd+Z — shrink active draft; block default editor undo
              if (isUndoShortcut(event)) {
                opts.onUndo();
                return true;
              }

              // Cmd+Shift+Z / Cmd+Y — redo blocked in v1
              if (isRedoShortcut(event)) {
                return true;
              }

              // Formatting shortcuts — blocked (v1 tracks content only)
              if (isFormattingShortcut(event)) {
                return true;
              }

              // Cut — blocked (would remove text from the doc)
              if (isCutShortcut(event)) {
                return true;
              }

              // Everything else (navigation, Cmd+A, Cmd+C, etc.) — let PM handle
              return false;
            },

            // ----- Paste / Drop — blocked in v1 -----------------------------
            handlePaste(_view, _event) {
              return getOptions().getIsSuggestionMode();
            },
            handleDrop(_view, _event) {
              return getOptions().getIsSuggestionMode();
            },

            // ----- DOM beforeinput — catches deletion paths that bypass
            // handleKeyDown (browser-native selection + Backspace on some
            // browsers fires only beforeinput, not keydown).
            handleDOMEvents: {
              beforeinput: (view, event) => {
                const opts = getOptions();
                if (!opts.getIsSuggestionMode()) return false;

                const inputType = event.inputType;

                // Selection deletion: capture selection before browser mutates
                if (
                  inputType === 'deleteContentBackward' ||
                  inputType === 'deleteContentForward' ||
                  inputType === 'deleteWordBackward' ||
                  inputType === 'deleteWordForward' ||
                  inputType === 'deleteByCut' ||
                  inputType === 'deleteByDrag'
                ) {
                  event.preventDefault();
                  const { from, to } = view.state.selection;
                  if (from < to) {
                    opts.onDeleteSelection(from, to);
                  }
                  return true;
                }

                // Paste / drop routes through beforeinput too on some browsers
                if (
                  inputType === 'insertFromPaste' ||
                  inputType === 'insertFromPasteAsQuotation' ||
                  inputType === 'insertFromDrop' ||
                  inputType === 'insertReplacementText'
                ) {
                  event.preventDefault();
                  return true;
                }

                // insertText / insertCompositionText — let handleTextInput
                // deal with it. Return false so PM continues processing.
                return false;
              },
            },
          },
        }),
      ];
    },
  });
