import { useState } from 'react';
import { DdocProps } from './types';
import { useTabEditor } from './hooks/use-tab-editor';
import { useTabManager } from './hooks/use-tab-manager';
import { useYjsSetup } from './hooks/use-yjs-setup';

export const useDdocEditor = ({
  isPreviewMode,
  initialContent,
  enableCollaboration,
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
  collabConfig,
  onIndexedDbError,
  disableInlineComment,
  ...rest
}: Partial<DdocProps>) => {
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [isCollabContentLoading, setIsCollabContentLoading] = useState(true);

  const yjsSetup = useYjsSetup({
    onChange,
    enableIndexeddbSync,
    ddocId,
    enableCollaboration,
    onIndexedDbError,
    onCollabError: rest.onCollabError,
    onCollaborationConnectCallback: rest.onCollaborationConnectCallback,
    onCollaborationCommit: rest.onCollaborationCommit,
    onFetchCommitContent: rest.onFetchCommitContent,
    onCollabSessionTermination: rest.onCollabSessionTermination,
    onUnMergedUpdates: rest.onUnMergedUpdates,
  });

  const tabManager = useTabManager({
    ydoc: yjsSetup.ydoc,
    initialContent,
    enableCollaboration,
  });

  const tabEditor = useTabEditor({
    ydoc: yjsSetup.ydoc,
    isPreviewMode,
    initialContent,
    enableCollaboration,
    collabConfig,
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
  });

  const aggregatedContentLoading =
    enableCollaboration && !collabConfig?.isOwner
      ? tabEditor.isContentLoading || isCollabContentLoading
      : tabEditor.isContentLoading;

  return {
    ...tabEditor,
    ydoc: yjsSetup.ydoc,
    refreshYjsIndexedDbProvider: yjsSetup.refreshYjsIndexedDbProvider,
    terminateSession: yjsSetup.terminateSession,
    isContentLoading: Boolean(aggregatedContentLoading),
    tabs: tabManager.tabs,
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
