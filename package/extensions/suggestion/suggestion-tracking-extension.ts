/**
 * SuggestionTrackingExtension — Phase 0 stub.
 *
 * Under the new architecture (see docs/architecture/suggestion-mode-architecture.md),
 * this extension intercepts keystrokes via ProseMirror plugin `props.handle*`
 * callbacks and routes pending changes to the Zustand store. The document is
 * never modified by typing in suggestion mode — only the owner's Accept path
 * modifies it.
 *
 * This file is an inert stub during Phase 0–2:
 *   - The extension exists and is wired into the editor so consumers do not
 *     need to branch on its presence.
 *   - It has no plugins, no lifecycle hooks, and no commands.
 *   - Toggling suggestion mode in the UI currently does nothing.
 *
 * Phase 3 replaces this stub with the real keystroke-interception plugin.
 */

import { Extension } from '@tiptap/core';
import * as Y from 'yjs';
import { SuggestionType } from '../../types';
import type { CommentAnchor } from '../comment/comment-decoration-plugin';

// ---------------------------------------------------------------------------
// Public types — kept stable so use-tab-editor.tsx and consumer integrations
// do not need to change between phases.
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
  /**
   * Phase-3-and-later: called on every keystroke with the live anchor.
   * No-op during the Phase 0 stub.
   */
  onLiveSuggestion: ((anchor: CommentAnchor) => void) | null;
  /**
   * Phase-3-and-later: called when the viewer clicks Submit.
   * No-op during the Phase 0 stub.
   */
  onSuggestionReady: ((data: SuggestionReadyData) => void) | null;
}

// ---------------------------------------------------------------------------
// Stub extension — no behavior. Replaced in Phase 3.
// ---------------------------------------------------------------------------

export const SuggestionTrackingExtension =
  Extension.create<SuggestionTrackingOptions>({
    name: 'suggestionTracking',

    addOptions() {
      return {
        getIsSuggestionMode: () => false,
        onLiveSuggestion: null,
        onSuggestionReady: null,
      };
    },
  });
