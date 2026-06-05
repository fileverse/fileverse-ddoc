import { Suspense, lazy, useCallback, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import { IpfsImageUploadResponse } from '../../types';
import './split-view.css';

// Lazy chunks: CodeMirror only loads/instantiates when Split View opens.
const MarkdownSourcePane = lazy(() => import('./markdown-source-pane'));
const SplitViewToolbar = lazy(() => import('./split-view-toolbar'));

interface SplitViewMarkdownPaneProps {
  markdown: string;
  onMarkdownChange: (value: string) => void;
  /** Exit Split View (back to the normal editor). */
  onExitSplitView?: () => void;
  /** Same uploader the editor uses — for the markdown toolbar's Image button. */
  ipfsImageUploadFn?: (file: File) => Promise<IpfsImageUploadResponse>;
  onError?: (error: string) => void;
  /** Sizing for the resizable split (flex-grow set by the draggable splitter). */
  style?: React.CSSProperties;
}

/**
 * Split View LEFT pane: the dedicated markdown toolbar + the
 * CodeMirror markdown source editor (both lazy-loaded). The right pane is the
 * real ddoc editor itself — see ddoc-editor.tsx, which keeps that editor mounted
 * in place (never a second <EditorContent>) so its React node views survive.
 */
export const SplitViewMarkdownPane = ({
  markdown,
  onMarkdownChange,
  onExitSplitView,
  ipfsImageUploadFn,
  onError,
  style,
}: SplitViewMarkdownPaneProps) => {
  // Capture the CodeMirror view to drive the dedicated markdown toolbar.
  const [mdView, setMdView] = useState<EditorView | null>(null);
  const handleViewReady = useCallback((view: EditorView | null) => {
    setMdView(view);
  }, []);

  return (
    <div
      style={style}
      className="flex-1 min-w-0 h-full flex flex-col color-bg-default rounded border color-border-default overflow-hidden"
    >
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
  );
};
