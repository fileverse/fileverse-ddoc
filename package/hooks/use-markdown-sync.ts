import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { handleMarkdownContent } from '../extensions/mardown-paste-handler';
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
}

/**
 * Split View markdown sync — MVP (one-way: markdown → doc).
 *
 * On entering Split View we make the editor read-only and seed the markdown
 * text from the current doc. On every (debounced) markdown edit we reparse the
 * ENTIRE markdown and replace the ENTIRE doc — formatting loss is accepted.
 * The right-pane scroll position is saved/restored around the rebuild so the
 * preview doesn't jump.
 */
export const useMarkdownSync = ({
  editor,
  isSplitView,
  isPreviewMode,
  activeTabId,
  ipfsImageUploadFn,
  debounceMs = 200,
}: UseMarkdownSyncArgs) => {
  const [markdown, setMarkdown] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Scroll container of the read-only right pane (attached in ddoc-editor).
  const rightScrollRef = useRef<HTMLDivElement | null>(null);

  // Seed markdown from the doc on entry; toggle editability around the session.
  useEffect(() => {
    if (!editor || !isSplitView) return;

    let cancelled = false;
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
          setMarkdown(md);
        }
      } catch {
        // If export fails, start from an empty buffer rather than blocking entry.
        if (!cancelled) setMarkdown('');
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // No collaboration in v1, so restoring to !preview is correct.
      if (!editor.isDestroyed) editor.setEditable(!isPreviewMode);
    };
  }, [editor, isSplitView, isPreviewMode, activeTabId]);

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
        // the right, instead of CommonMark's "newline = space".
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

  const onMarkdownChange = useCallback(
    (value: string) => {
      setMarkdown(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => applyMarkdown(value), debounceMs);
    },
    [applyMarkdown, debounceMs],
  );

  return {
    markdown,
    onMarkdownChange,
    rightScrollRef,
  };
};
