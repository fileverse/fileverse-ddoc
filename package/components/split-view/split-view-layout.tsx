import {
  MutableRefObject,
  ReactNode,
  Suspense,
  lazy,
  useCallback,
  useState,
} from 'react';
import { EditorContent, Editor } from '@tiptap/react';
import type { EditorView } from '@codemirror/view';
import { IconButton } from '@fileverse/ui';
import { IpfsImageUploadResponse } from '../../types';
import './split-view.css';

// Lazy chunks: CodeMirror only loads/instantiates when Split View opens.
const MarkdownSourcePane = lazy(() => import('./markdown-source-pane'));
const SplitViewToolbar = lazy(() => import('./split-view-toolbar'));

interface SplitViewLayoutProps {
  editor: Editor;
  markdown: string;
  onMarkdownChange: (value: string) => void;
  /** Ref to the read-only right pane's scroll container (for scroll restore). */
  rightScrollRef: MutableRefObject<HTMLDivElement | null>;
  /** Whether the Document-tabs overlay panel is open. */
  showTabsPanel: boolean;
  /** Toggle the Document-tabs overlay panel (the header List button). */
  onToggleTabsPanel: () => void;
  /** The existing <DocumentOutline> element, rendered inside the overlay. */
  tabsPanel: ReactNode;
  /** Exit Split View (back to the normal editor). */
  onExitSplitView?: () => void;
  /** Same uploader the editor uses — for the markdown toolbar's Image button. */
  ipfsImageUploadFn?: (file: File) => Promise<IpfsImageUploadResponse>;
  onError?: (error: string) => void;
}

/**
 * Split View layout (matches Figma): editable markdown source (left) +
 * read-only ddoc preview with a header bar (right). The header's List button
 * opens the "Document tabs" overlay (the existing DocumentOutline). Desktop-only.
 * See docs/SPLIT_VIEW_MARKDOWN_SPEC.md.
 */
export const SplitViewLayout = ({
  editor,
  markdown,
  onMarkdownChange,
  rightScrollRef,
  showTabsPanel,
  onToggleTabsPanel,
  tabsPanel,
  onExitSplitView,
  ipfsImageUploadFn,
  onError,
}: SplitViewLayoutProps) => {
  // Capture the CodeMirror view to drive the dedicated markdown toolbar.
  const [mdView, setMdView] = useState<EditorView | null>(null);
  const handleViewReady = useCallback((view: EditorView | null) => {
    setMdView(view);
  }, []);

  const getDocTitle = () =>
    editor.state.doc.firstChild?.textContent?.trim().slice(0, 80) || 'Untitled';

  const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download markdown — the .md carries the inline-style "CSS" spans we preserve
  // for fidelity (color/font/size/highlight/underline).
  const handleDownloadMarkdown = async () => {
    const title = getDocTitle();
    const url = await editor.commands.exportMarkdownFile({
      title,
      includeStyles: true,
    });
    if (typeof url === 'string') triggerDownload(url, `${title}.md`);
  };

  const handleDownloadHtml = async () => {
    const title = getDocTitle();
    const url = await editor.commands.exportHtmlFile({ title });
    if (typeof url === 'string') triggerDownload(url, `${title}.html`);
  };

  return (
    <div className="flex w-full h-full gap-2 p-4 overflow-hidden color-bg-secondary">
      {/* LEFT — dedicated markdown toolbar + CodeMirror source (lazy-loaded) */}
      <div className="flex-1 min-w-0 h-full flex flex-col color-bg-default rounded border color-border-default overflow-hidden">
        <Suspense fallback={null}>
          <SplitViewToolbar
            view={mdView}
            onExit={onExitSplitView}
            ipfsImageUploadFn={ipfsImageUploadFn}
            onError={onError}
          />
        </Suspense>
        <div className="flex-1 min-h-0 overflow-hidden">
          <Suspense
            fallback={
              <div className="px-4 py-3 text-sm color-text-secondary">
                Loading editor…
              </div>
            }
          >
            <MarkdownSourcePane
              value={markdown}
              onChange={onMarkdownChange}
              onViewReady={handleViewReady}
            />
          </Suspense>
        </div>
      </div>

      {/* RIGHT — read-only ddoc preview with header */}
      <div className="flex-1 min-w-0 h-full flex flex-col color-bg-default rounded border color-border-default overflow-hidden relative">
        {/* Header bar: Document-tabs toggle (left) + actions (right). */}
        <div className="flex items-center justify-between px-4 py-2 border-b color-border-default shrink-0 z-30">
          <IconButton
            variant={showTabsPanel ? 'secondary' : 'ghost'}
            icon="List"
            size="sm"
            title="Document tabs"
            onClick={onToggleTabsPanel}
          />
          {/* Right-side actions. Claude AI is a placeholder (disabled);
              the other two download the markdown / HTML. */}
          <div className="flex items-center gap-1">
            <IconButton
              variant="ghost"
              icon="Sparkles"
              size="sm"
              title="Claude AI (coming soon)"
              disabled
            />
            <IconButton
              variant="ghost"
              icon="FileCode"
              size="sm"
              title="Download Markdown (with CSS)"
              onClick={handleDownloadMarkdown}
            />
            <IconButton
              variant="ghost"
              icon="FileCode2"
              size="sm"
              title="Download HTML"
              onClick={handleDownloadHtml}
            />
          </div>
        </div>

        {/* Content area (relative anchor for the tabs overlay). */}
        <div className="flex-1 relative overflow-hidden">
          {/* Rendered doc (read-only). split-view.css strips the DBlock gutter
              and applies the 48px side padding from the design. */}
          <div
            ref={rightScrollRef}
            data-split-view-preview="true"
            className="absolute inset-0 overflow-auto"
          >
            <EditorContent editor={editor} className="w-full h-auto" />
          </div>

          {/* Document-tabs overlay (existing DocumentOutline component). */}
          {showTabsPanel && (
            <div className="absolute top-0 left-0 h-full w-[263px] z-20 color-bg-default border-r color-border-default shadow-elevation-3 overflow-y-auto">
              {tabsPanel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
