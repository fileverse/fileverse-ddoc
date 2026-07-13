import { useEffect, useMemo, useRef, useState } from 'react';
import { DdocProps } from './types';
import { useTabEditor } from './hooks/use-tab-editor';
import { useTabManager } from './hooks/use-tab-manager';
import { useYjsSetup } from './hooks/use-yjs-setup';
import { Editor } from '@tiptap/react';
import type { DBlockRuntimeState } from './extensions/d-block/dblock-runtime';
import { registerFonts } from './utils/font-loader';

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
  setSelectedWordCount,
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
  isPreviewEditor = false,
  fonts,
  ...rest
}: Partial<DdocProps> & {
  isFocusMode?: boolean;
  isPreviewEditor?: boolean;
}) => {
  useEffect(() => {
    registerFonts(fonts ?? []);
  }, [fonts]);

  const [isContentLoading, setIsContentLoading] = useState(true);
  const [isCollabContentLoading, setIsCollabContentLoading] = useState(true);
  const editorRef = useRef<Editor | null>(null);
  const isVersionMode = Boolean(versionHistoryState?.enabled);
  const ddocContent = versionHistoryState?.content ?? initialContent;

  const collabEnabled = collaboration?.enabled === true;
  const isCollaboratorsDoc = Boolean(
    collabEnabled && !collaboration?.connection.isOwner,
  );
  const dBlockRuntimeState = useMemo<DBlockRuntimeState>(
    () => ({
      isPreviewMode: Boolean(isPreviewMode),
      isPresentationMode: Boolean(isPresentationMode),
      isPreviewEditor: Boolean(isPreviewEditor),
      isCollaboratorsDoc,
      isFocusMode: Boolean(isFocusMode),
      // Real value is merged in by ddoc-editor (which knows Split View state).
      isSplitView: false,
    }),
    [
      isCollaboratorsDoc,
      isFocusMode,
      isPresentationMode,
      isPreviewEditor,
      isPreviewMode,
    ],
  );
  const dBlockRuntimeStateRef = useRef(dBlockRuntimeState);
  dBlockRuntimeStateRef.current = dBlockRuntimeState;

  const yjsSetup = useYjsSetup({
    onChange,
    enableIndexeddbSync,
    ddocId,
    collaboration,
    onCollaboratorChange,
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
  const tabIds = useMemo(
    () => tabManager.tabs.map((tab) => tab.id),
    [tabManager.tabs],
  );

  const tabEditor = useTabEditor({
    ydoc: yjsSetup.ydoc,
    isPreviewMode,
    viewerMode,
    initialContent: ddocContent,
    collaboration,
    versionId: versionHistoryState?.versionId,
    isReady: yjsSetup.isReady,
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
    setSelectedWordCount,
    setPageCount,
    setIsContentLoading,
    setIsCollabContentLoading,
    unFocused,
    zoomLevel,
    isPresentationMode,
    isContentLoading,
    onInvalidContentError,
    ignoreCorruptedData,
    onConnect: yjsSetup.onConnect,
    onDisconnect: yjsSetup.onDisconnect,
    isIndexeddbSynced: yjsSetup.isIndexeddbSynced,
    hasCollabContentInitialised: yjsSetup.hasCollabContentInitialised,
    initialiseYjsIndexedDbProvider: yjsSetup.initialiseYjsIndexedDbProvider,
    externalExtensions,
    activeTabId: tabManager.activeTabId,
    tabIds,
    hasTabState: tabManager.hasTabState,
    isVersionMode,
    theme,
    editorRef,
    initialCommentAnchors,
    dBlockRuntimeStateRef,
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
    dBlockRuntimeState,
    dBlockRuntimeStateRef,
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
