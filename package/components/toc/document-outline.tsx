import React, { useState } from 'react';
import cn from 'classnames';
import { useMediaQuery } from 'usehooks-ts';
import { BottomDrawer } from '@fileverse/ui';
import { DocumentTabsSidebar } from '../tabs/document-tabs-sidebar';
import { Tab } from '../tabs/tab-row';
import { DocumentOutlineProps } from './types';
import { MemorizedToC } from './memorized-toc';

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

  const MobileTOC = () => {
    return (
      <BottomDrawer
        key="mobile-toc"
        open={showTOC!}
        onOpenChange={setShowTOC!}
        className="w-full shadow-elevation-4"
        contentClassName="w-full h-full !border-none !shadow-elevation-4 !gap-2"
        footerClassName="hidden"
        noOverlay
        hasCloseIcon
        content={
          <React.Fragment>
            <div className="flex justify-between items-center p-4">
              <h2 className="text-heading-sm-bold">Document outline</h2>
            </div>
            <div className={cn('table-of-contents px-4')}>
              <MemorizedToC
                editor={editor}
                items={items}
                setItems={setItems}
                orientation={orientation}
              />
            </div>
          </React.Fragment>
        }
      />
    );
  };

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
    MobileTOC()
  );
};
