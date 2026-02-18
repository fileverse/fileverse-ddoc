import { useMediaQuery } from 'usehooks-ts';
import { DocumentTabsSidebar } from '../tabs/document-tabs-sidebar';
import { DocumentMobileTabPanel } from '../tabs/document-mobile-tab-panel';
import { DocumentOutlineProps } from './types';

export const DocumentOutline = ({
  editor,
  hasToC,
  items,
  setItems,
  showTOC,
  setShowTOC,
  isPreviewMode,
  orientation,
  tabs,
  setTabs,
  activeTabId,
  setActiveTabId,
  createTab,
  renameTab,
  duplicateTab,
  orderTab,
  ydoc,
  tabCommentCounts,
}: DocumentOutlineProps) => {
  const isMediaMax1280px = useMediaQuery('(max-width:1280px)');

  return !isMediaMax1280px ? (
    <DocumentTabsSidebar
      tabs={tabs}
      setTabs={setTabs}
      activeTabId={activeTabId}
      setActiveTabId={setActiveTabId}
      showTOC={showTOC}
      setShowTOC={setShowTOC}
      hasToC={hasToC}
      isPreviewMode={isPreviewMode}
      editor={editor}
      items={items}
      setItems={setItems}
      orientation={orientation}
      createTab={createTab}
      renameTab={renameTab}
      duplicateTab={duplicateTab}
      orderTab={orderTab}
      ydoc={ydoc}
      tabCommentCounts={tabCommentCounts}
    />
  ) : (
    <DocumentMobileTabPanel
      tabs={tabs}
      setTabs={setTabs}
      activeTabId={activeTabId}
      setActiveTabId={setActiveTabId}
      editor={editor}
      items={items}
      setItems={setItems}
      orientation={orientation}
      renameTab={renameTab}
      duplicateTab={duplicateTab}
      tabCommentCounts={tabCommentCounts}
    />
  );
};
