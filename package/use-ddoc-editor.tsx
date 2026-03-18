import { useRef, useState } from 'react';
import { DdocProps } from './types';
import { useTabEditor } from './hooks/use-tab-editor';
import { useTabManager } from './hooks/use-tab-manager';
import { useYjsSetup } from './hooks/use-yjs-setup';
import { Editor } from '@tiptap/react';

export const useDdocEditor = ({
  isPreviewMode,
  initialContent,
  versionHistoryState,
  collaboration,
  onChange,
  onCollaboratorChange,
  onCommentInteraction,
  onError,
  setCharacterCount,
  setWordCount,
  ipfsImageUploadFn,
  ddocId,
  enableIndexeddbSync,
  unFocused,
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
  ...rest
}: Partial<DdocProps>) => {
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

  const tabManager = useTabManager({
    ydoc: yjsSetup.ydoc,
    initialContent: ddocContent,
    enableCollaboration: collabEnabled,
    isDDocOwner: rest.isDDocOwner || false,
    createDefaultTabIfMissing: Boolean(
      !isVersionMode && !isPreviewMode && rest.isDDocOwner,
    ),
    defaultTabId: rest.tabConfig?.defaultTabId,
    shouldSyncActiveTab: Boolean(
      !isVersionMode && !isPreviewMode && !collabEnabled && rest.isDDocOwner,
    ),
    onVersionHistoryActiveTabChange: versionHistoryState?.onActiveTabChange,
    getEditor: () => editorRef.current,
    flushPendingUpdate: yjsSetup.flushPendingUpdate,
  });

  const tabEditor = useTabEditor({
    ydoc: yjsSetup.ydoc,
    isPreviewMode,
    initialContent: ddocContent,
    collaboration,
    versionId: versionHistoryState?.versionId,
    isReady: yjsSetup.isReady,
    awareness: yjsSetup.awareness,
    disableInlineComment,
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
