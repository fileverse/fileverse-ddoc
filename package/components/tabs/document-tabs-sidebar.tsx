import React, { useState } from 'react';
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
  arrayMove,
} from '@dnd-kit/sortable';
import { DocumentOutlineProps } from '../toc/types';
import { MemorizedToC } from '../toc/memorized-toc';
import { TabDragPreview, SortableTabRow, Tab } from './tab-row';

export interface DocumentTabsSidebarProps {
  tabs: Tab[];
  setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
  activeTabId: string;
  setActiveTabId: React.Dispatch<React.SetStateAction<string>>;
  showTOC: DocumentOutlineProps['showTOC'];
  setShowTOC: DocumentOutlineProps['setShowTOC'];
  hasToC: DocumentOutlineProps['hasToC'];
  isPreviewMode: DocumentOutlineProps['isPreviewMode'];
  editor: DocumentOutlineProps['editor'];
  items: DocumentOutlineProps['items'];
  setItems: DocumentOutlineProps['setItems'];
  orientation?: DocumentOutlineProps['orientation'];
}

export const DocumentTabsSidebar = ({
  tabs,
  setTabs,
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
}: DocumentTabsSidebarProps) => {
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
          setTabs((prev) => {
            const oldIndex = prev.findIndex((tab) => tab.id === active.id);
            const newIndex = prev.findIndex((tab) => tab.id === over.id);
            return arrayMove(prev, oldIndex, newIndex);
          });
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
            isPreviewMode ? 'top-[4rem]' : 'top-[7.3rem]',
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
                  />
                </div>
              </div>

              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className="w-full flex mt-[8px] flex-col gap-[8px]"
                >
                  <SortableTabRow
                    key={tab.id}
                    id={tab.id}
                    name={tab.name}
                    emoji={tab.emoji}
                    onNameChange={(nextName: string) =>
                      setTabs((prev) =>
                        prev.map((_tab) =>
                          _tab.id === tab.id
                            ? { ..._tab, name: nextName }
                            : _tab,
                        ),
                      )
                    }
                    onEmojiChange={(nextEmoji: string) =>
                      setTabs((prev) =>
                        prev.map((_tab) =>
                          _tab.id === tab.id
                            ? { ..._tab, emoji: nextEmoji }
                            : _tab,
                        ),
                      )
                    }
                    isActive={tab.id === activeTabId}
                    onClick={() => setActiveTabId(tab.id)}
                  />
                  <div
                    className={cn(
                      'table-of-contents animate-in fade-in slide-in-from-left-5',
                      tab.id === activeTabId && !activeDragId
                        ? 'block'
                        : 'hidden',
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
