import { Editor } from '@tiptap/react';
import { handleContentPrint } from '../../../../package/utils/handle-print';
import { generateDocId } from '../../utils';
import type { ActionRegistry } from './action-registry';
import type { DocumentStyling } from '../../../../package/types';

/** Demo analog of the consumer's app-action registry (buckets 2–4). */
export type DemoAppActionDeps = {
  liveEditor: Editor | null;
  exportModal: (format?: string) => void; // editorRef.exportCurrentTabOrOpenExportModal
  exportMarkdown: () => void; // editorRef.exportContentAsMarkDown(title)
  onError: (msg: string) => void;
  isFocusMode: boolean;
  setIsFocusMode: (v: boolean) => void;
  showTOC: boolean;
  setShowTOC: (v: boolean) => void;
  toggleCommentDrawer: () => void;
  toggleStyling: () => void;
  zoomLevel: string;
  setZoomLevel: (v: string) => void;
  documentStyling: DocumentStyling | undefined;
  setDocumentStyling: (s: DocumentStyling) => void;
  startPresentation: () => void;
};

/** Plain factory (not a hook) — safe to call inside renderNavbar's closure. */
export const createDemoAppActions = (d: DemoAppActionDeps): ActionRegistry => ({
  'file.new.blank': {
    run: () => {
      const id = generateDocId();
      window.location.href = `${window.location.pathname}?doc=${id}`;
    },
  },
  'file.import.md': {
    run: () => d.liveEditor?.commands.uploadMarkdownFile(undefined, d.onError),
  },
  'file.import.docx': {
    run: () =>
      d.liveEditor?.commands.uploadDocxFile(undefined, d.onError, () => {}),
  },
  'file.export.pdf': { run: () => d.exportModal('pdf') },
  'file.export.html': { run: () => d.exportModal('html') },
  'file.export.txt': { run: () => d.exportModal('txt') },
  'file.export.md': { run: () => d.exportMarkdown() },
  'file.export.viewerModal': { run: () => d.exportModal() },
  'file.print': {
    run: () => d.liveEditor && handleContentPrint(d.liveEditor.getHTML()),
  },
  'view.comments.hideAll': { run: () => d.toggleCommentDrawer() },
  'view.focusMode': {
    run: () => d.setIsFocusMode(!d.isFocusMode),
    isActive: d.isFocusMode,
  },
  'view.outlines.toggle': {
    run: () => d.setShowTOC(!d.showTOC),
    isActive: d.showTOC,
  },
  'view.styles': { run: () => d.toggleStyling() },
  'view.zoom': {
    run: (v) => {
      if (!v) return;
      d.setZoomLevel(v === 'fit' ? '1.4' : String(Number(v) / 100));
    },
    current:
      d.zoomLevel === '1.4' ? 'fit' : String(Math.round(Number(d.zoomLevel) * 100)),
  },
  'format.pageOrientation': {
    run: (v) =>
      d.setDocumentStyling({
        ...(d.documentStyling ?? {}),
        orientation: v as 'portrait' | 'landscape',
      }),
    current: d.documentStyling?.orientation ?? 'portrait',
  },
  'tools.slides': { run: () => d.startPresentation() },
});
