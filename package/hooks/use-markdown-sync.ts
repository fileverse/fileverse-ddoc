import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  handleMarkdownContent,
  stripFrontmatter,
} from '../extensions/mardown-paste-handler';
import { IpfsImageUploadResponse } from '../types';

interface UseMarkdownSyncArgs {
  editor: Editor | null;
  /** Whether Split View is currently active. */
  isSplitView: boolean;
  /** Editability to restore when leaving Split View (preview docs stay read-only). */
  isPreviewMode?: boolean;
  /** Active tab id — re-seeds the markdown when the user switches tabs. */
  activeTabId?: string;
  ipfsImageUploadFn?: (file: File) => Promise<IpfsImageUploadResponse>;
  /** Debounce (ms) before reparsing markdown into the doc. */
  debounceMs?: number;
  /**
   * Called when the doc→markdown seed fails on entry. Without a usable seed,
   * any edit would replace the doc with a near-empty parse, so the caller
   * should surface the error and exit Split View.
   */
  onSeedError?: () => void;
}

/**
 * Split View markdown sync — MVP (one-way: markdown → doc).
 *
 * On entering Split View we make the editor read-only and seed the markdown
 * text from the current doc. On every (debounced) markdown edit we reparse the
 * ENTIRE markdown and replace the ENTIRE doc — formatting loss is accepted.
 * The right-pane scroll position is saved/restored around the rebuild so the
 * preview doesn't jump.
 *
 * Safety rails:
 * - Edits are ignored until the seed has resolved (a failed/slow seed must
 *   never let a keystroke full-replace the doc with an empty parse).
 * - A pending debounced edit is FLUSHED, not dropped, when the session ends
 *   (exit / tab switch / unmount) — otherwise the last keystrokes before a
 *   quick exit would be silently lost.
 */
export const useMarkdownSync = ({
  editor,
  isSplitView,
  isPreviewMode,
  activeTabId,
  ipfsImageUploadFn,
  debounceMs = 200,
  onSeedError,
}: UseMarkdownSyncArgs) => {
  const [markdown, setMarkdown] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest not-yet-applied markdown; null when nothing is pending.
  const pendingRef = useRef<string | null>(null);
  // No applies until the doc→markdown seed has resolved for this session.
  const seededRef = useRef(false);
  // Scroll container of the read-only right pane (attached in ddoc-editor).
  const rightScrollRef = useRef<HTMLDivElement | null>(null);
  const onSeedErrorRef = useRef(onSeedError);
  onSeedErrorRef.current = onSeedError;

  const applyMarkdown = useCallback(
    async (value: string) => {
      if (!editor || editor.isDestroyed) return;

      const scrollEl = rightScrollRef.current;
      const scrollTop = scrollEl?.scrollTop ?? 0;

      try {
        // Select the whole doc so handleMarkdownContent's replaceSelection
        // becomes a full-document replace (reuses the existing MD pipeline).
        editor.commands.selectAll();
        // breaks: a single Enter in the markdown pane shows as a new line on
        // the right, instead of CommonMark's "newline = space". (Tweet URLs
        // re-embed automatically in handleMarkdownContent.)
        await handleMarkdownContent(editor.view, value, ipfsImageUploadFn, {
          breaks: true,
        });
      } catch (error) {
        console.error('Split View: failed to apply markdown', error);
      }

      // Restore scroll after the doc has re-rendered.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (rightScrollRef.current) {
            rightScrollRef.current.scrollTop = scrollTop;
          }
        });
      });
    },
    [editor, ipfsImageUploadFn],
  );
  const applyMarkdownRef = useRef(applyMarkdown);
  applyMarkdownRef.current = applyMarkdown;

  // Seed markdown from the doc on entry; toggle editability around the session.
  useEffect(() => {
    if (!editor || !isSplitView) return;

    let cancelled = false;
    seededRef.current = false;
    pendingRef.current = null;
    editor.setEditable(false);

    // Defer one frame so a tab switch (setExtensions rebind) settles before we
    // serialize — activeTabId is a dep so this re-seeds when the tab changes.
    const raf = requestAnimationFrame(async () => {
      try {
        const md = await editor.commands.exportMarkdownFile({
          returnMDFile: true,
          // Keep color/font/size/highlight/underline as inline HTML so they
          // round-trip — otherwise they'd be flattened on the first edit.
          includeStyles: true,
        });
        if (!cancelled && typeof md === 'string') {
          // The export prepends YAML frontmatter (title/date) for file
          // downloads; it's noise in the pane and import strips it anyway.
          setMarkdown(stripFrontmatter(md));
          seededRef.current = true;
        }
      } catch (error) {
        // Without a seed, the first keystroke would replace the whole doc
        // with a near-empty parse — bail out of Split View instead.
        console.error('Split View: failed to seed markdown', error);
        if (!cancelled) onSeedErrorRef.current?.();
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      // Session over (exit / tab switch / unmount): flush a pending edit
      // instead of dropping it, so the last keystrokes aren't lost. The
      // closure still holds THIS session's editor, so a tab-switch flush
      // lands in the (correct) old tab.
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (pendingRef.current !== null && seededRef.current) {
        const value = pendingRef.current;
        pendingRef.current = null;
        void applyMarkdownRef.current(value);
      }
      // No collaboration in v1, so restoring to !preview is correct.
      if (!editor.isDestroyed) editor.setEditable(!isPreviewMode);
    };
  }, [editor, isSplitView, isPreviewMode, activeTabId]);

  const onMarkdownChange = useCallback(
    (value: string) => {
      // Until the seed lands, the pane isn't a faithful view of the doc —
      // never let its content replace the document.
      if (!seededRef.current) return;
      setMarkdown(value);
      pendingRef.current = value;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        pendingRef.current = null;
        applyMarkdown(value);
      }, debounceMs);
    },
    [applyMarkdown, debounceMs],
  );

  return {
    markdown,
    onMarkdownChange,
    rightScrollRef,
  };
};
