import { useRef, useState } from 'react';
import { DdocProps } from './types';
import { useTabEditor } from './hooks/use-tab-editor';
import { useTabManager } from './hooks/use-tab-manager';
import { useYjsSetup } from './hooks/use-yjs-setup';
import { Editor } from '@tiptap/react';

export const useDdocEditor = ({
  isPreviewMode,
  viewerMode,
  initialContent,
  versionHistoryState,
  collaboration,
  onChange,
  onCollaboratorChange,
  onCommentInteraction,
  onError,
  setCharacterCount,
  setWordCount,
  setPageCount,
  ipfsImageUploadFn,
  ddocId,
  enableIndexeddbSync,
  unFocused,
  isFocusMode,
  theme,
  zoomLevel,
  onInvalidContentError,
  ignoreCorruptedData,
  isPresentationMode,
  metadataProxyUrl,
  extensions: externalExtensions,
  onCopyHeadingLink,
  ipfsImageFetchFn,
  fetchV1ImageFn,
  isConnected,
  activeModel,
  maxTokens,
  isAIAgentEnabled,
  onIndexedDbError,
  disableInlineComment,
  initialCommentAnchors,
  onNewComment,
  ...rest
}: Partial<DdocProps> & { isFocusMode?: boolean }) => {
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [isCollabContentLoading, setIsCollabContentLoading] = useState(true);
  const editorRef = useRef<Editor | null>(null);
  const isVersionMode = Boolean(versionHistoryState?.enabled);
  const ddocContent = versionHistoryState?.content ?? initialContent;

  const collabEnabled = collaboration?.enabled === true;

  const yjsSetup = useYjsSetup({
    onChange,
    enableIndexeddbSync,
    ddocId,
    collaboration,
    onIndexedDbError,
  });
  const shouldWaitForIndexeddbBeforeCreatingDefaultTab = Boolean(
    enableIndexeddbSync &&
      !collabEnabled &&
      rest.isDDocOwner &&
      !isVersionMode &&
      !isPreviewMode &&
      !ddocContent,
  );

  const tabManager = useTabManager({
    ydoc: yjsSetup.ydoc,
    initialContent: ddocContent,
    enableCollaboration: collabEnabled,
    isDDocOwner: rest.isDDocOwner || false,
    createDefaultTabIfMissing: Boolean(
      !isVersionMode &&
        !isPreviewMode &&
        rest.isDDocOwner &&
        !collabEnabled &&
        // Wait for y-indexedDB sync before deciding whether an unsaved local doc
        // still needs a default tab, otherwise refresh keeps bootstrapping one.
        (!shouldWaitForIndexeddbBeforeCreatingDefaultTab ||
          yjsSetup.isIndexeddbSynced),
    ),
    defaultTabId: rest.tabConfig?.defaultTabId,
    shouldSyncActiveTab: Boolean(
      !isVersionMode && !isPreviewMode && !collabEnabled && rest.isDDocOwner,
    ),
    // Viewers (non-owners) should land on the first tab, not whatever the
    // owner last selected, since active-tab is persisted in the shared Yjs doc.
    preferFirstTabOnInit: !rest.isDDocOwner,
    onVersionHistoryActiveTabChange: versionHistoryState?.onActiveTabChange,
    getEditor: () => editorRef.current,
    flushPendingUpdate: yjsSetup.flushPendingUpdate,
  });

  const tabEditor = useTabEditor({
    ydoc: yjsSetup.ydoc,
    isPreviewMode,
    viewerMode,
    initialContent: ddocContent,
    collaboration,
    versionId: versionHistoryState?.versionId,
    isReady: yjsSetup.isReady,
    isSyncing: yjsSetup.isSyncing,
    awareness: yjsSetup.awareness,
    disableInlineComment,
    isFocusMode,
    onCommentInteraction,
    onError,
    ipfsImageUploadFn,
    metadataProxyUrl,
    onCopyHeadingLink,
    ipfsImageFetchFn,
    fetchV1ImageFn,
    isConnected,
    activeModel,
    maxTokens,
    isAIAgentEnabled,
    setCharacterCount,
    setWordCount,
    setPageCount,
    setIsContentLoading,
    setIsCollabContentLoading,
    unFocused,
    zoomLevel,
    isPresentationMode,
    isContentLoading,
    onInvalidContentError,
    ignoreCorruptedData,
    onCollaboratorChange,
    onConnect: yjsSetup.onConnect,
    hasCollabContentInitialised: yjsSetup.hasCollabContentInitialised,
    initialiseYjsIndexedDbProvider: yjsSetup.initialiseYjsIndexedDbProvider,
    externalExtensions,
    activeTabId: tabManager.activeTabId,
    hasTabState: tabManager.hasTabState,
    isVersionMode,
    theme,
    editorRef,
    initialCommentAnchors,
    onNewComment,
  });

  const isOwner = collabEnabled ? collaboration.connection.isOwner : true;
  const aggregatedContentLoading =
    collabEnabled && !isOwner
      ? tabEditor.isContentLoading || isCollabContentLoading
      : tabEditor.isContentLoading;

  return {
    ...tabEditor,
    ...yjsSetup,
    ydoc: yjsSetup.ydoc,
    awareness: yjsSetup.awareness,
    refreshYjsIndexedDbProvider: yjsSetup.refreshYjsIndexedDbProvider,
    terminateSession: yjsSetup.terminateSession,
    isContentLoading: Boolean(aggregatedContentLoading),
    tabs: tabManager.tabs,
    hasTabState: tabManager.hasTabState,
    isVersionMode,
    activeTabId: tabManager.activeTabId,
    setTabs: tabManager.setTabs,
    setActiveTabId: tabManager.setActiveTabId,
    createTab: tabManager.createTab,
    deleteTab: tabManager.deleteTab,
    renameTab: tabManager.renameTab,
    duplicateTab: tabManager.duplicateTab,
    orderTab: tabManager.orderTab,
  };
};
