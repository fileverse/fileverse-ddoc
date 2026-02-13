import { useState } from 'react';
import { useMediaQuery } from 'usehooks-ts';
import { DocumentTabsSidebar } from '../tabs/document-tabs-sidebar';
import { DocumentMobileTabPanel } from '../tabs/document-mobile-tab-panel';
import { Tab } from '../tabs/tab-item';
import { DocumentOutlineProps } from './types';

const INITIAL_TABS: Tab[] = [
  { id: 'tab-1', name: 'Tab 1', emoji: '' },
  { id: 'tab-2', name: 'Tab 2', emoji: '' },
  { id: 'tab-3', name: 'Tab 3', emoji: '' },
  { id: 'tab-4', name: 'Tab 4', emoji: '' },
  { id: 'tab-5', name: 'Tab 5', emoji: '' },
];

export const DocumentOutline = ({
  editor,
  hasToC,
  items,
  setItems,
  showTOC,
  setShowTOC,
  isPreviewMode,
  orientation,
}: DocumentOutlineProps) => {
  const isMediaMax1280px = useMediaQuery('(max-width:1280px)');
  const [tabs, setTabs] = useState<Tab[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState(INITIAL_TABS[0].id);

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
    />
  );
};
