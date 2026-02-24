import cn from 'classnames';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { LucideIcon } from '@fileverse/ui';
import { DocumentOutlineProps } from '../toc/types';
import { MemorizedToC } from '../toc/memorized-toc';
import { TabContextMenu, TabItem } from './tab-item';
import { DEFAULT_TAB_ID, Tab } from './utils/tab-utils';

export interface DocumentMobileTabPanelProps {
  tabs: Tab[];
  setTabs: Dispatch<SetStateAction<Tab[]>>;
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  editor: DocumentOutlineProps['editor'];
  items: DocumentOutlineProps['items'];
  setItems: DocumentOutlineProps['setItems'];
  orientation?: DocumentOutlineProps['orientation'];
  renameTab: (
    tabId: string,
    payload: { newName?: string; emoji?: string },
  ) => void;
  createTab: () => void;
  duplicateTab: (tabId: string) => void;
  deleteTab?: (tabId: string) => void;
  tabCommentCounts: Record<string, number>;
  isPreviewMode: boolean;
  tabConfig?: DocumentOutlineProps['tabConfig'];
  isVersionHistoryMode: boolean;
}

export const DocumentMobileTabPanel = ({
  tabs,
  activeTabId,
  setActiveTabId,
  editor,
  items,
  setItems,
  orientation,
  renameTab,
  createTab,
  duplicateTab,
  deleteTab,
  tabCommentCounts,
  isPreviewMode,
  tabConfig,
  isVersionHistoryMode,
}: DocumentMobileTabPanelProps) => {
  const [showContent, setShowContent] = useState(false);
  const activeTabIndex = tabs.findIndex((tab) => tab.id === activeTabId);
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const defaultTabId = tabConfig?.defaultTabId || DEFAULT_TAB_ID;
  const isDefaultTab = activeTab?.id === defaultTabId;
  const canNavigatePrev = activeTabIndex > 0;
  const canNavigateNext =
    activeTabIndex >= 0 && activeTabIndex < tabs.length - 1;

  const handleNameChange = (tabId: string, nextName: string) => {
    renameTab(tabId, { newName: nextName });
  };

  const handleEmojiChange = (tabId: string, nextEmoji: string) => {
    renameTab(tabId, { emoji: nextEmoji });
  };

  const handleGoToPreviousTab = () => {
    if (!canNavigatePrev) return;
    const previousTab = tabs[activeTabIndex - 1];
    if (!previousTab) return;
    setActiveTabId(previousTab.id);
  };

  const handleGoToNextTab = () => {
    if (!canNavigateNext) return;
    const nextTab = tabs[activeTabIndex + 1];
    if (!nextTab) return;
    setActiveTabId(nextTab.id);
  };

  const menuSections = [
    [
      {
        id: 'new-tab',
        label: 'New tab',
        icon: 'Plus' as const,
        onSelect: createTab,
      },
    ],
    [
      {
        id: 'rename',
        label: 'Rename',
        icon: 'SquarePen' as const,
        onSelect: () => {
          if (!activeTab || typeof window === 'undefined') return;
          const nextName = window.prompt('Rename tab', activeTab.name);
          if (!nextName) return;
          const sanitizedName = nextName.trim();
          if (!sanitizedName) return;
          renameTab(activeTab.id, { newName: sanitizedName });
        },
        visible: Boolean(activeTab),
      },
      {
        id: 'duplicate',
        label: 'Duplicate',
        icon: 'Copy' as const,
        onSelect: () => {
          if (!activeTab) return;
          duplicateTab(activeTab.id);
        },
        visible: Boolean(activeTab),
      },
    ],
    [
      {
        id: 'copy-link',
        label: 'Copy link',
        icon: 'Share2' as const,
        onSelect: () => {
          if (!activeTab) return;
          tabConfig?.onCopyTabLink?.(activeTab.id);
        },
        visible: Boolean(activeTab && tabConfig?.onCopyTabLink),
      },
    ],
    [
      {
        id: 'delete',
        label: 'Delete',
        icon: 'Trash2' as const,
        textClassName: 'color-text-danger',
        iconStroke: '#FB3449',
        onSelect: () => {
          if (!activeTab || !deleteTab || isDefaultTab) return;
          deleteTab(activeTab.id);
        },
        visible: Boolean(activeTab && deleteTab && !isDefaultTab),
      },
    ],
  ];

  const shouldShowTabNav = isVersionHistoryMode || isPreviewMode;
  const showTabList = showContent && !isVersionHistoryMode;

  return (
    <div
      className="fixed z-[999] w-full flex flex-col transition-[bottom] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{
        bottom: showTabList
          ? '0px'
          : isVersionHistoryMode
            ? 'var(--version-sheet-bottom, 24px)'
            : '24px',
      }}
    >
      <div
        className={cn(
          'rounded-t-[12px] color-bg-default flex flex-col w-full gap-[8px] overflow-hidden',
          'transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]',
          showTabList
            ? 'h-[300px] space-md shadow-[0_-12px_32px_rgba(0,0,0,0.18)]'
            : ' px-[8px] py-[2px] border color-bg-secondary shadow-none',
        )}
        style={isVersionHistoryMode ? { borderBottom: 'none' } : undefined}
      >
        {showTabList ? (
          <>
            <div
              className={cn(
                'gap-xsm flex items-center justify-between w-full',
                'transition-all duration-300',
                'animate-in fade-in slide-in-from-bottom-2',
              )}
            >
              <h2 className="text-heading-sm color-text-default">
                Document tabs
              </h2>
              <LucideIcon
                onClick={() => setShowContent(false)}
                name="X"
                className="w-[16px] h-[16px] cursor-pointer transition-transform duration-200 hover:scale-110 active:scale-95"
              />
            </div>

            <div
              className={cn(
                'w-full no-scrollbar overflow-y-auto',
                'h-[calc(100dvh-437px)]',
                'transition-opacity duration-300',
              )}
            >
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className="w-full flex mt-[8px] flex-col gap-[8px]"
                >
                  <TabItem
                    tabId={tab.id}
                    hideContentMenu={true}
                    name={tab.name}
                    emoji={tab.emoji || ''}
                    onNameChange={(nextName: string) =>
                      handleNameChange(tab.id, nextName)
                    }
                    onEmojiChange={(nextEmoji: string) =>
                      handleEmojiChange(tab.id, nextEmoji)
                    }
                    onDuplicate={() => duplicateTab(tab.id)}
                    isActive={tab.id === activeTabId}
                    onClick={() => setActiveTabId(tab.id)}
                    commentCount={tabCommentCounts[tab.id] || 0}
                    isPreviewMode={isPreviewMode}
                    onCopyLink={() => tabConfig?.onCopyTabLink?.(tab.id)}
                  />
                  <div
                    className={cn(
                      'table-of-contents transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                      tab.id === activeTabId
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 -translate-x-2 h-0 overflow-hidden',
                    )}
                  >
                    <MemorizedToC
                      editor={editor}
                      items={items}
                      setItems={setItems}
                      orientation={orientation}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : shouldShowTabNav ? (
          <div
            id="tab-nav"
            className={cn(
              'flex justify-between items-center w-full',
              'transition-all duration-300 animate-in fade-in slide-in-from-bottom-1',
            )}
          >
            <button
              type="button"
              onClick={handleGoToPreviousTab}
              disabled={!canNavigatePrev}
              aria-label="Go to previous tab"
              className={cn(
                'h-[36px] w-[36px] flex items-center justify-center transition-opacity duration-200',
                canNavigatePrev
                  ? 'cursor-pointer'
                  : 'opacity-40 cursor-not-allowed',
              )}
            >
              <LucideIcon name={'ChevronLeft'} className="w-[20px] h-[20px]" />
            </button>
            <div
              onClick={() => !isVersionHistoryMode && setShowContent(true)}
              className="flex flex-col px-[12px] items-center cursor-pointer transition-opacity duration-200 hover:opacity-80"
            >
              <div className="flex items-center gap-[8px] justify-center py-[4px]">
                <LucideIcon
                  name="FileText"
                  className="w-[16px] h-[16px] transition-transform duration-200 group-hover:scale-105"
                />
                <p className="text-heading-xsm max-w-[150px] truncate">
                  {tabs.find((t) => t.id === activeTabId)?.name ?? 'Tab name'}
                </p>
              </div>
              {!isVersionHistoryMode && (
                <div className="h-[16px] flex items-center">
                  <span className="text-helper-text-sm color-text-secondary">
                    {tabs.length} tabs.
                  </span>
                  <span className="text-helper-text-sm color-text-secondary ml-[4px]">
                    Tap to see all
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleGoToNextTab}
              disabled={!canNavigateNext}
              aria-label="Go to next tab"
              className={cn(
                'h-[36px] w-[36px] flex items-center justify-center transition-opacity duration-200',
                canNavigateNext
                  ? 'cursor-pointer'
                  : 'opacity-40 cursor-not-allowed',
              )}
            >
              <LucideIcon name={'ChevronRight'} className="w-[20px] h-[20px]" />
            </button>
          </div>
        ) : (
          <div
            className={cn(
              'flex justify-between items-center w-full',
              'transition-all duration-300 animate-in fade-in slide-in-from-bottom-1',
            )}
          >
            <div
              onClick={() => !isVersionHistoryMode && setShowContent(true)}
              className="flex flex-grow flex-col px-[12px] cursor-pointer transition-opacity duration-200 hover:opacity-80"
            >
              <div className="flex items-center gap-[8px] py-[4px]">
                <LucideIcon
                  name="FileText"
                  className="w-[16px] h-[16px] transition-transform duration-200 group-hover:scale-105"
                />
                <p className="text-heading-xsm">
                  {tabs.find((t) => t.id === activeTabId)?.name ?? 'Tab name'}
                </p>
              </div>
              <div className="h-[16px] flex items-center">
                <span className="text-helper-text-sm color-text-secondary">
                  {tabs.length} tabs.
                </span>
                <span className="text-helper-text-sm color-text-secondary ml-[4px]">
                  Tap to see all
                </span>
              </div>
            </div>

            <TabContextMenu sections={menuSections} />
          </div>
        )}
      </div>
    </div>
  );
};
