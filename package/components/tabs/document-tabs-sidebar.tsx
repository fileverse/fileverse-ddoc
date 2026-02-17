import React, { useEffect, useState } from 'react';
import cn from 'classnames';
import { IconButton, LucideIcon, Tooltip } from '@fileverse/ui';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DocumentOutlineProps } from '../toc/types';
import { MemorizedToC } from '../toc/memorized-toc';
import { TabDragPreview, SortableTabItem } from './tab-item';
import { getTabsYdocNodes, Tab } from './utils/tab-utils';
import { Editor } from '@tiptap/core';
import * as Y from 'yjs';

export interface DocumentTabsSidebarProps {
  tabs: Tab[];
  setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  showTOC: DocumentOutlineProps['showTOC'];
  setShowTOC: DocumentOutlineProps['setShowTOC'];
  hasToC: DocumentOutlineProps['hasToC'];
  isPreviewMode: DocumentOutlineProps['isPreviewMode'];
  editor: DocumentOutlineProps['editor'];
  items: DocumentOutlineProps['items'];
  setItems: DocumentOutlineProps['setItems'];
  orientation?: DocumentOutlineProps['orientation'];
  createTab: () => void;
  renameTab: (
    tabId: string,
    payload: { newName?: string; emoji?: string },
  ) => void;
  duplicateTab: (tabId: string) => void;
  orderTab: (destinationTabId: string, activeTabId: string) => void;
  ydoc: Y.Doc;
}

export const DocumentTabsSidebar = ({
  tabs,
  activeTabId,
  setActiveTabId,
  showTOC,
  setShowTOC,
  hasToC,
  isPreviewMode,
  editor,
  items,
  setItems,
  orientation,
  createTab,
  renameTab,
  duplicateTab,
  orderTab,
  ydoc,
}: DocumentTabsSidebarProps) => {
  const handleNameChange = (tabId: string, nextName: string) => {
    renameTab(tabId, { newName: nextName });
  };

  const handleEmojiChange = (tabId: string, nextEmoji: string) => {
    renameTab(tabId, { emoji: nextEmoji });
  };
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const activeDragTab = tabs.find((tab) => tab.id === activeDragId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveDragId(e.active.id as string)}
      onDragEnd={(e) => {
        const { active, over } = e;
        setActiveDragId(null);
        if (over && active.id !== over.id) {
          const activeId = active.id as string;
          const overId = over.id as string;
          orderTab(overId, activeId);
        }
      }}
    >
      <SortableContext
        items={tabs.map((tab) => tab.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className={cn(
            'flex flex-col items-start w-[263px] justify-start absolute left-0 px-4',
            !hasToC && 'hidden',
            isPreviewMode ? 'top-[4rem]' : 'top-[16px]',
          )}
        >
          <Tooltip
            text={showTOC ? 'Hide document outline' : 'Show document outline'}
            position="right"
          >
            <button
              type="button"
              onClick={() => setShowTOC?.((prev) => !prev)}
              className={cn(
                'group flex items-center h-[30px] gap-[8px] !min-w-[30px]  min-h-[30px] p-[8px] rounded-full hover:color-bg-secondary-hover transition-[width,background-color] duration-200 ease-out overflow-hidden',
                !showTOC && 'hover:min-w-[156px]',
              )}
            >
              <LucideIcon
                name={showTOC ? 'ChevronLeft' : 'List'}
                className="!w-[16px]"
              />

              <span
                className={`whitespace-nowrap text-heading-xsm color-text-default max-w-[110px] truncate opacity-0 ${!showTOC ? 'group-hover:opacity-100 ' : 'hidden'} transition-opacity duration-150`}
              >
                {activeTab?.name}
              </span>
            </button>
          </Tooltip>

          {showTOC && (
            <>
              <div className="flex flex-col gap-[8px] mt-[8px] w-full">
                <div className="flex items-center px-[12px] py-[8px] justify-between">
                  <span className="text-heading-sm color-text-default">
                    Document tabs
                  </span>

                  <IconButton
                    icon="Plus"
                    variant="ghost"
                    size="sm"
                    className="h-[24px] w-[24px] min-w-[24px]"
                    onClick={createTab}
                  />
                </div>
              </div>

              {tabs.map((tab) => (
                <DdocTab
                  key={tab.id}
                  tab={tab}
                  handleEmojiChange={handleEmojiChange}
                  handleNameChange={handleNameChange}
                  onClick={() => setActiveTabId(tab.id)}
                  editor={editor}
                  tocItem={items}
                  setTocItems={setItems}
                  orientation={orientation}
                  activeTabId={activeTabId}
                  duplicateTab={duplicateTab}
                  activeDragId={activeDragId}
                  ydoc={ydoc}
                />
              ))}
            </>
          )}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeDragId ? (
          <TabDragPreview
            emoji={activeDragTab?.emoji ?? ''}
            name={activeDragTab?.name ?? ''}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export const DdocTab = ({
  tab,
  handleEmojiChange,
  handleNameChange,
  onClick,
  editor,
  tocItem,
  setTocItems,
  orientation,
  activeTabId,
  duplicateTab,
  activeDragId,
  ydoc,
}: {
  tab: Tab;
  handleNameChange: (tabId: string, nextName: string) => void;
  handleEmojiChange: (tabId: string, nextEmoji: string) => void;
  onClick: () => void;
  editor: Editor;
  tocItem: DocumentOutlineProps['items'];
  setTocItems: DocumentOutlineProps['setItems'];
  orientation: DocumentOutlineProps['orientation'];
  activeTabId: string;
  duplicateTab: (tabId: string) => void;
  activeDragId: string | null;
  ydoc: Y.Doc;
}) => {
  const [tabMetadata, setTabMetadata] = useState({
    title: tab.name,
    showToc: tab.showOutline,
    emoji: tab.emoji,
  });
  useEffect(() => {
    const { tabs } = getTabsYdocNodes(ydoc);
    const metadataMap = tabs.get(tab.id);

    if (!(metadataMap instanceof Y.Map)) return;

    const observer = () => {
      setTabMetadata({
        title: metadataMap.get('name') as string,
        emoji: metadataMap.get('emoji') as string,
        showToc: metadataMap.get('showOutline') as boolean,
      });
    };

    metadataMap.observe(observer);

    return () => metadataMap.unobserve(observer);
  }, [tab.id, ydoc]);
  return (
    <div className="w-full flex mt-[8px] flex-col gap-[8px]">
      <SortableTabItem
        key={tab.id}
        id={tab.id}
        tabId={tab.id}
        name={tabMetadata.title}
        emoji={tabMetadata.emoji}
        onNameChange={(nextName: string) => handleNameChange(tab.id, nextName)}
        onEmojiChange={(nextEmoji: string) =>
          handleEmojiChange(tab.id, nextEmoji)
        }
        onDuplicate={() => duplicateTab(tab.id)}
        isActive={tab.id === activeTabId}
        onClick={onClick}
      />
      <div
        className={cn(
          'table-of-contents animate-in fade-in slide-in-from-left-5',
          tab.id === activeTabId && !activeDragId ? 'block' : 'hidden',
        )}
      >
        <MemorizedToC
          editor={editor}
          items={tocItem}
          setItems={setTocItems}
          orientation={orientation}
        />
      </div>
    </div>
  );
};
