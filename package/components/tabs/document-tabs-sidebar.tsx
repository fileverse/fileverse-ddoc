import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { DEFAULT_TAB_ID, getTabsYdocNodes, Tab } from './utils/tab-utils';
import { Editor } from '@tiptap/core';
import * as Y from 'yjs';
import { createPortal } from 'react-dom';
import { ConfirmDeleteModal } from './confirm-delete-modal';

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
  tabCommentCounts: Record<string, number>;
  tabSectionContainer?: HTMLElement;
  isVersionHistoryMode?: boolean;
  tabConfig?: DocumentOutlineProps['tabConfig'];
  deleteTab?: (tabId: string) => void;
}

export const DocumentTabsSidebar = ({
  tabSectionContainer,
  ...rest
}: DocumentTabsSidebarProps) => {
  if (!tabSectionContainer && rest.isVersionHistoryMode) return null;

  if (tabSectionContainer) {
    return createPortal(<TabSidebar {...rest} />, tabSectionContainer);
  }
  return <TabSidebar {...rest} />;
};

export const TabSidebar = ({
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
  tabCommentCounts,
  isVersionHistoryMode,
  tabConfig,
  deleteTab,
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
  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId),
    [tabs, activeTabId],
  );
  const activeDragTab = useMemo(
    () => tabs.find((tab) => tab.id === activeDragId),
    [tabs, activeDragId],
  );
  const [pendingDeleteTab, setPendingDeleteTab] = useState<Tab | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [tabOutlineOverrides, setTabOutlineOverrides] = useState<
    Record<string, boolean>
  >({});
  const getDefaultOutlineVisibility = useCallback(
    (tabId: string) => isPreviewMode || tabId === activeTabId,
    [activeTabId, isPreviewMode],
  );

  const getOutlineVisibility = useCallback(
    (tabId: string) =>
      tabOutlineOverrides[tabId] ?? getDefaultOutlineVisibility(tabId),
    [getDefaultOutlineVisibility, tabOutlineOverrides],
  );

  const handleTabOutlineChange = useCallback(
    (tabId: string, value: boolean, nextActiveTabId?: string) => {
      setTabOutlineOverrides((previous) => {
        const hasOverride = Object.prototype.hasOwnProperty.call(
          previous,
          tabId,
        );
        const defaultValue =
          isPreviewMode || tabId === (nextActiveTabId ?? activeTabId);
        const currentValue = hasOverride ? previous[tabId] : defaultValue;

        if (currentValue === value) {
          return previous;
        }

        if (value === defaultValue) {
          if (!hasOverride) {
            return previous;
          }
          const next = { ...previous };
          delete next[tabId];
          return next;
        }

        return {
          ...previous,
          [tabId]: value,
        };
      });
    },
    [activeTabId, isPreviewMode],
  );

  const shouldExpand = !showTOC && isHovered;

  return (
    <>
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
          disabled={isPreviewMode || isVersionHistoryMode}
          items={tabs.map((tab) => tab.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            data-testid="tab-sidebar"
            className={cn(
              'flex flex-col items-start max-w-[263px] w-full h-full justify-start  left-0 px-4 z-20',
              !hasToC && 'hidden',
              isVersionHistoryMode
                ? 'top-[16px] max-h-[calc(100vh-32px)]'
                : isPreviewMode
                  ? 'top-[70px] max-h-[calc(100vh-86px)]'
                  : 'top-[124px] max-h-[calc(100vh-140px)]',
              !isVersionHistoryMode && 'fixed',
            )}
          >
            <Tooltip
              text={showTOC ? 'Hide document outline' : 'Show document outline'}
              position="right"
            >
              <button
                data-testid="tab-sidebar-toggle"
                type="button"
                onMouseEnter={() => !showTOC && setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => setShowTOC?.((prev) => !prev)}
                className={cn(
                  'group flex items-center h-[30px]  !min-w-[30px]  min-h-[30px] p-[8px] rounded-full hover:color-bg-secondary-hover transition-[width,background-color] duration-200 ease-out overflow-hidden',
                  !showTOC && 'hover:min-w-[156px] gap-[8px]',
                  tabs.length > 0 && !showTOC && 'color-bg-secondary-hover',
                )}
              >
                <LucideIcon
                  name={showTOC ? 'ChevronLeft' : 'List'}
                  className="!w-[16px]"
                />

                <span
                  className={cn(
                    `whitespace-nowrap text-heading-xsm color-text-default max-w-[110px] truncate transition-opacity duration-150`,
                    tabs.length === 1 && !shouldExpand && !showTOC && 'hidden',
                  )}
                >
                  {!shouldExpand
                    ? showTOC
                      ? null
                      : tabs.length > 1
                        ? tabs.length
                        : null
                    : activeTab?.name}
                </span>
              </button>
            </Tooltip>

            {showTOC && (
              <div className="flex flex-col gap-[8px] mt-[16px] w-full min-h-0 flex-1">
                <div className="w-full">
                  <div className="flex items-center px-[12px] py-[8px] justify-between">
                    <span
                      data-testid="tab-sidebar-heading"
                      className="text-heading-sm truncate color-text-default"
                    >
                      Document tabs
                    </span>

                    {!isPreviewMode && (
                      <IconButton
                        data-testid="tab-create-button"
                        icon="Plus"
                        variant="ghost"
                        size="sm"
                        className="h-[24px] w-[24px] min-w-[24px]"
                        onClick={createTab}
                      />
                    )}
                  </div>
                </div>
                <div className="w-full min-h-0 flex-1 overflow-y-auto">
                  {tabs.map((tab, tabIndex) => (
                    <DdocTab
                      key={tab.id}
                      tab={tab}
                      tabIndex={tabIndex}
                      tabCount={tabs.length}
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
                      isPreviewMode={isPreviewMode}
                      ydoc={ydoc}
                      onDelete={(targetTab) => setPendingDeleteTab(targetTab)}
                      isVersionHistoryMode={isVersionHistoryMode}
                      commentCount={tabCommentCounts[tab.id] || 0}
                      moveTabUp={() => {
                        if (tabIndex <= 0) return;
                        orderTab(tabs[tabIndex - 1].id, tab.id);
                      }}
                      moveTabDown={() => {
                        if (tabIndex >= tabs.length - 1) {
                          return;
                        }
                        orderTab(tabs[tabIndex + 1].id, tab.id);
                      }}
                      tabConfig={tabConfig}
                      showOutline={getOutlineVisibility(tab.id)}
                      onShowOutlineChange={(value) => {
                        if (activeTabId !== tab.id) {
                          setActiveTabId(tab.id);
                        }
                        handleTabOutlineChange(tab.id, value, tab.id);
                      }}
                    />
                  ))}
                </div>
              </div>
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
      <ConfirmDeleteModal
        isOpen={Boolean(pendingDeleteTab)}
        onClose={() => setPendingDeleteTab(null)}
        onConfirm={() => {
          if (!pendingDeleteTab) return;
          try {
            deleteTab?.(pendingDeleteTab.id);
          } catch (error) {
            console.error(error);
          } finally {
            setPendingDeleteTab(null);
          }
        }}
        documentTitle={pendingDeleteTab?.name || ''}
        isLoading={false}
        primaryLabel="Delete tab"
      />
    </>
  );
};

export const DdocTab = ({
  tab,
  tabIndex,
  tabCount,
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
  commentCount,
  moveTabUp,
  moveTabDown,
  isPreviewMode,
  isVersionHistoryMode,
  tabConfig,
  onDelete,
  showOutline,
  onShowOutlineChange,
}: {
  tab: Tab;
  tabIndex: number;
  tabCount: number;
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
  commentCount: number;
  moveTabUp: () => void;
  moveTabDown: () => void;
  isPreviewMode: boolean;
  isVersionHistoryMode?: boolean;
  tabConfig?: DocumentOutlineProps['tabConfig'];
  onDelete?: (tab: Tab) => void;
  showOutline: boolean;
  onShowOutlineChange: (value: boolean) => void;
}) => {
  const isDefaultTab = tab.id === DEFAULT_TAB_ID;

  const [tabMetadata, setTabMetadata] = useState({
    title: tab.name,
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
        emoji={tabMetadata.emoji || ''}
        onNameChange={(nextName: string) => handleNameChange(tab.id, nextName)}
        onEmojiChange={(nextEmoji: string) =>
          handleEmojiChange(tab.id, nextEmoji)
        }
        onDelete={isDefaultTab ? undefined : () => onDelete?.(tab)}
        onDuplicate={() => duplicateTab(tab.id)}
        isActive={tab.id === activeTabId}
        onClick={onClick}
        commentCount={commentCount}
        showOutline={showOutline}
        canMoveUp={tabCount > 1 && tabIndex > 0}
        canMoveDown={tabCount > 1 && tabIndex < tabCount - 1}
        onMoveUp={moveTabUp}
        onMoveDown={moveTabDown}
        onCopyLink={() => tabConfig?.onCopyTabLink?.(tab.id)}
        handleShowOutline={onShowOutlineChange}
        isPreviewMode={isPreviewMode}
        isVersionHistoryMode={isVersionHistoryMode}
      />

      <div
        className={cn(
          'table-of-contents animate-in fade-in slide-in-from-left-5',
          !activeDragId && showOutline && !isVersionHistoryMode
            ? 'block'
            : 'hidden',
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
