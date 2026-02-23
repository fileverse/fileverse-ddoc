import cn from 'classnames';
import { useState, type Dispatch, type SetStateAction } from 'react';
import {
  IconButton,
  LucideIcon,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@fileverse/ui';
import { DocumentOutlineProps } from '../toc/types';
import { MemorizedToC } from '../toc/memorized-toc';
import { TabItem } from './tab-item';
import { Tab } from './utils/tab-utils';

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
  duplicateTab: (tabId: string) => void;
  tabCommentCounts: Record<string, number>;
  isPreviewMode: boolean;
  tabConfig?: DocumentOutlineProps['tabConfig'];
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
  duplicateTab,
  tabCommentCounts,
  isPreviewMode,
  tabConfig,
}: DocumentMobileTabPanelProps) => {
  const [showContent, setShowContent] = useState(true);
  const handleNameChange = (tabId: string, nextName: string) => {
    renameTab(tabId, { newName: nextName });
  };

  const handleEmojiChange = (tabId: string, nextEmoji: string) => {
    renameTab(tabId, { emoji: nextEmoji });
  };

  return (
    <div
      className={cn(
        'fixed color-bg-default z-[9] w-full flex flex-col',
        'transition-[bottom] duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]',
        !showContent ? 'bottom-[24px]' : 'bottom-0',
      )}
    >
      <div
        className={cn(
          'rounded-t-[12px] color-bg-default flex flex-col w-full gap-[8px] overflow-hidden',
          'transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]',
          showContent
            ? 'h-[300px] space-md shadow-[0_-12px_32px_rgba(0,0,0,0.18)]'
            : 'h-[54px] px-[8px] py-[4px] border color-bg-secondary shadow-none',
        )}
      >
        {showContent ? (
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
        ) : (
          <div
            className={cn(
              'flex justify-between items-center w-full',
              'transition-all duration-300 animate-in fade-in slide-in-from-bottom-1',
            )}
          >
            <div
              onClick={() => setShowContent(true)}
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

            <Popover>
              <PopoverTrigger onClick={(e) => e.stopPropagation()}>
                <IconButton
                  icon="EllipsisVertical"
                  variant="ghost"
                  size="sm"
                  className="h-[30px] w-[30px] min-w-[30px] transition-transform duration-200 hover:scale-105 active:scale-95"
                />
              </PopoverTrigger>

              <PopoverContent
                align="end"
                alignOffset={0}
                elevation={2}
                side="bottom"
                sideOffset={4}
                className="w-[160px] space-xsm"
              >
                <div
                  className={cn(
                    'space-xsm gap-xsm hover:color-bg-default-hover cursor-pointer h-[30px] border-radius-sm flex items-center',
                  )}
                >
                  <LucideIcon
                    name="SquarePen"
                    className={cn('w-[16px] h-[16px]')}
                  />
                  <p className={cn('text-heading-xsm color-text-default')}>
                    Rename
                  </p>
                </div>
                <div
                  className={cn(
                    'space-xsm gap-xsm hover:color-bg-default-hover cursor-pointer h-[30px] border-radius-sm flex items-center',
                  )}
                >
                  <LucideIcon name="Copy" className={cn('w-[16px] h-[16px]')} />
                  <p className={cn('text-heading-xsm color-text-default')}>
                    Duplicate
                  </p>
                </div>
                <div
                  className={cn(
                    'space-xsm gap-xsm hover:color-bg-default-hover cursor-pointer h-[30px] border-radius-sm flex items-center',
                  )}
                >
                  <LucideIcon
                    name="SmilePlus"
                    className={cn('w-[16px] h-[16px]')}
                  />
                  <p className={cn('text-heading-xsm color-text-default')}>
                    Choose emoji
                  </p>
                </div>
                <hr className="border-t space-x-xsm color-border-default my-[4px] w-full" />
                <div
                  className={cn(
                    'space-xsm gap-xsm hover:color-bg-default-hover cursor-pointer h-[30px] border-radius-sm flex items-center',
                  )}
                >
                  <LucideIcon
                    name="Share2"
                    className={cn('w-[16px] h-[16px]')}
                  />
                  <p className={cn('text-heading-xsm color-text-default')}>
                    Copy link
                  </p>
                </div>
                <div
                  className={cn(
                    'space-xsm gap-xsm hover:color-bg-default-hover cursor-pointer h-[30px] border-radius-sm flex items-center',
                  )}
                >
                  <LucideIcon name="List" className={cn('w-[16px] h-[16px]')} />
                  <p className={cn('text-heading-xsm color-text-default')}>
                    Hide outline
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </div>
  );
};
