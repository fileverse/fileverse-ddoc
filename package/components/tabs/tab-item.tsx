/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import cn from 'classnames';
import {
  IconButton,
  LucideIcon,
  Popover,
  PopoverContent,
  PopoverTrigger,
  TextField,
} from '@fileverse/ui';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TabEmojiPicker } from './tab-emoji-picker';
export const SortableTabItem = (props: any) => {
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
      <TabItem
        {...props}
        dragHandleProps={{
          ...attributes,
          ...listeners,
        }}
      />
    </div>
  );
};

export const TabItem = ({
  tabId,
  name,
  emoji,
  commentCount = 0,
  onNameChange,
  onEmojiChange,
  onClick,
  isActive,
  onDuplicate,
  dragHandleProps,
  hideContentMenu = false,
}: {
  tabId: string;
  name: string;
  emoji: string;
  commentCount?: number;
  onNameChange: (name: string) => void;
  onEmojiChange: (emoji: string) => void;
  onClick: () => void;
  isActive: boolean;
  onDuplicate?: (id: string) => void;
  dragHandleProps?: any;
  hideContentMenu?: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(name);
  const originalTitleRef = useRef(title);

  useEffect(() => {
    if (!isEditing) {
      setTitle(name);
    }
  }, [name, isEditing]);

  const startEditing = () => {
    originalTitleRef.current = title;
    setIsEditing(true);
  };

  const stopEditing = () => {
    const nextTitle = title.trim() || originalTitleRef.current;
    setTitle(nextTitle);
    onNameChange(nextTitle);
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setTitle(originalTitleRef.current);
    setIsEditing(false);
  };

  return (
    <div
      onDoubleClick={startEditing}
      onClick={onClick}
      {...dragHandleProps}
      className={cn(
        'flex items-center active:cursor-grabbing relative justify-between h-[40px] px-[12px] py-[8px] rounded-full hover:color-bg-secondary-hover',
        isActive && 'color-bg-default-hover',
      )}
    >
      <div className="flex items-center gap-[8px] flex-1">
        <TabEmojiPicker
          emoji={emoji}
          setEmoji={(_emoji) => {
            setIsEditing(false);
            onEmojiChange(_emoji);
          }}
          isEditing={isEditing}
        />

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
      <div className="flex gap-[8px] items-center">
        <span className="h-[18px] color-text-default text-[12px] rounded-full min-w-[18px] text-center color-bg-secondary-hover">
          {commentCount}
        </span>
        {!hideContentMenu && (
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
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing();
                }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate?.(tabId);
                }}
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
        )}
      </div>
    </div>
  );
};

export const TabDragPreview = ({
  name,
  emoji,
}: {
  name: string;
  emoji: string;
}) => {
  return (
    <div
      className="
        flex items-center gap-[8px] px-[12px] py-[8px] w-[231px] h-[40px] rounded-full color-bg-secondary shadow-elevation-3"
    >
      {emoji ? (
        <span className=" text-[16px] leading-[16px] w-[16px] flex items-center justify-center">
          {emoji}
        </span>
      ) : (
        <LucideIcon name="FileText" className="w-[16px]" />
      )}

      <span className="text-heading-xsm color-text-default truncate">
        {name}
      </span>
    </div>
  );
};
