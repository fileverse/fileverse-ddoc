export { default as DdocEditor } from './package/ddoc-editor';
export { PreviewDdocEditor } from './package/preview-ddoc-editor';
export { handleContentPrint } from './package/utils/handle-print';
export { DdocExportModal } from './package/components/export-modal';
export { useHeadlessEditor } from './package/hooks/use-headless-editor';
export { useExportHeadlessEditorContent } from './package/hooks/use-export-headless-editor-content';
export { mergeTabAwareYjsUpdates } from './package/components/tabs/utils/tab-utils';
export { buildVersionDiffSnapshot } from './package/components/tabs/utils/version-diff-snapshot';
export type {
  DdocExportModalProps,
  ExportFormatOption,
  ExportTabOption,
} from './package/components/export-modal';
export type { VersionTabSnapshot } from './package/components/tabs/utils/version-diff-snapshot';
export { Editor } from '@tiptap/react';
export type {
  CollaborationProps,
  CollabConnectionConfig,
  CollabSessionMeta,
  CollabServices,
  CollabCallbacks,
  CollabState,
  CollabError,
  CollabErrorCode,
  CollabStatus,
} from './package/sync-local/types';
