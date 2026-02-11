/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState } from 'react';
import cn from 'classnames';
import { useMediaQuery } from 'usehooks-ts';
import {
  BottomDrawer,
  IconButton,
  LucideIcon,
  Popover,
  PopoverContent,
  PopoverTrigger,
  TextField,
  Tooltip,
} from '@fileverse/ui';
import { ToC } from './toc';
import { DocumentOutlineProps } from './types';
import { TabEmojiPicker } from './ddoc-emoji-picker';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

const MemorizedToC = React.memo(ToC);

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
  const [tabs, setTabs] = useState([
    'Tab 1',
    'Tab 2',
    'Tab 3',
    'Tab 4',
    'Tab 5',
  ]);
  const [activeTabId, setActiveTabId] = useState('Tab 1');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const DesktopTOC = () => {
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
              const oldIndex = prev.indexOf(active.id as string);
              const newIndex = prev.indexOf(over.id as string);
              return arrayMove(prev, oldIndex, newIndex);
            });
          }
        }}
      >
        <SortableContext items={tabs} strategy={verticalListSortingStrategy}>
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
                  {activeTabId}
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

                {tabs.map((title) => (
                  <div
                    key={title}
                    className="w-full flex mt-[8px] flex-col gap-[8px]"
                  >
                    <SortableTabRow
                      key={title}
                      id={title}
                      name={title}
                      isActive={title === activeTabId}
                      onClick={() => setActiveTabId(title)}
                    />
                    <div
                      className={cn(
                        'table-of-contents animate-in fade-in slide-in-from-left-5',
                        title === activeTabId && !activeDragId
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
          {activeDragId ? <TabDragPreview name={activeDragId} /> : null}
        </DragOverlay>
      </DndContext>
    );
  };

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

  return !isMediaMax1280px ? DesktopTOC() : MobileTOC();
};

export const SortableTabRow = (props: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && 'opacity-0', 'w-full')}
    >
      <TabRow
        {...props}
        dragHandleProps={{
          ...attributes,
          ...listeners,
        }}
      />
    </div>
  );
};

export const TabRow = ({
  name,
  onClick,
  isActive,
  dragHandleProps,
}: {
  name: string;
  onClick: (title: string) => void;
  isActive: boolean;
  dragHandleProps?: any;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(name);
  const originalTitleRef = useRef(title);
  const [emoji, setEmoji] = useState('');

  const startEditing = () => {
    originalTitleRef.current = title;
    setIsEditing(true);
  };

  const stopEditing = () => {
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setTitle(originalTitleRef.current);
    setIsEditing(false);
  };

  return (
    <div
      onDoubleClick={startEditing}
      onClick={() => onClick(name)}
      {...dragHandleProps}
      className={cn(
        'flex items-center active:cursor-grabbing justify-between h-[40px] px-[12px] py-[8px] rounded-full hover:color-bg-secondary-hover',
        isActive && 'color-bg-default-hover',
      )}
    >
      <div className="flex items-center gap-[8px] flex-1">
        {isEditing || emoji ? (
          <TabEmojiPicker
            emoji={emoji}
            setEmoji={(_emoji) => {
              setIsEditing(false);
              setEmoji(_emoji);
            }}
          />
        ) : (
          <LucideIcon name="FileText" className="w-[16px] shrink-0" />
        )}

        {!isEditing ? (
          <span className="text-heading-xsm color-text-default max-w-[110px] truncate select-none">
            {title}
          </span>
        ) : (
          <TextField
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={(e) => {
              const nextFocused = e.relatedTarget as HTMLElement | null;
              if (nextFocused?.closest('[data-emoji-picker]')) {
                return;
              }
              stopEditing();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') stopEditing();
              if (e.key === 'Escape') cancelEditing();
            }}
            className="h-[24px] px-[6px]  py-0 rounded-[6px] text-heading-xsm  border-transparent focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-border-focused))]"
          />
        )}
      </div>
      <Popover>
        <PopoverTrigger onClick={(e) => e.stopPropagation()}>
          <IconButton
            icon="EllipsisVertical"
            variant="ghost"
            size="sm"
            className="h-[24px] w-[24px] min-w-[24px]"
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
            <LucideIcon name="SquarePen" className={cn('w-[16px] h-[16px]')} />
            <p className={cn('text-heading-xsm color-text-default')}>Rename</p>
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
            <LucideIcon name="SmilePlus" className={cn('w-[16px] h-[16px]')} />
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
            <LucideIcon name="Share2" className={cn('w-[16px] h-[16px]')} />
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
  );
};

export const TabDragPreview = ({ name }: { name: string }) => {
  return (
    <div
      className="
        flex items-center gap-[8px]
        px-[12px] py-[8px]
        w-[231px] h-[40px]
        rounded-full
        bg-[#F8F9FA]
        opacity-90
        shadow-elevation-3
      "
    >
      <LucideIcon name="FileText" className="w-[16px]" />
      <span className="text-heading-xsm color-text-default truncate">
        {name}
      </span>
    </div>
  );
};
