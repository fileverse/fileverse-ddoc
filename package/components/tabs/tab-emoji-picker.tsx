import {
  Button,
  cn,
  LucideIcon,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
} from '@fileverse/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMediaQuery, useOnClickOutside } from 'usehooks-ts';
import {
  type EmojiPickerListCategoryHeaderProps,
  type EmojiPickerListEmojiProps,
  type EmojiPickerListRowProps,
  EmojiPicker as EmojiPickerPrimitive,
} from 'frimousse';
import { LoaderIcon, SearchIcon } from 'lucide-react';

export const TabEmojiPicker = ({
  emoji,
  setEmoji,
  isEditing,
  openPickerTrigger = 0,
  disableEmoji,
}: {
  emoji: string;
  setEmoji: (emoji: string) => void;
  isEditing: boolean;
  openPickerTrigger?: number;
  disableEmoji: boolean;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const toggleRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [showPopOver, setShowPopOver] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 40, left: 10 });
  const isMobile = useMediaQuery('(max-width: 1000px)', { defaultValue: true });

  // Close the emoji picker when interaction moves outside both trigger and panel.
  useOnClickOutside([toggleRef, triggerRef], (event) => {
    if (
      toggleRef.current &&
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      !toggleRef.current.contains(event.target)
    ) {
      setShowPicker(false);
    }
  });

  // Use viewport coordinates from the trigger and render the panel with `fixed`
  // so it does not get clipped by scroll/overflow containers (like TabSidebar).
  const openPicker = useCallback(() => {
    const triggerRect = triggerRef.current?.getBoundingClientRect();
    if (triggerRect) {
      const pickerHeight = isMobile ? 287 : 340;
      const viewportPadding = 8;
      const verticalOffset = 8;
      const hasSpaceBelow =
        triggerRect.bottom + verticalOffset + pickerHeight <=
        window.innerHeight - viewportPadding;

      setPickerPosition({
        top: hasSpaceBelow
          ? triggerRect.bottom + verticalOffset
          : Math.max(
              viewportPadding,
              triggerRect.top - verticalOffset - pickerHeight,
            ),
        left: triggerRect.left,
      });
    }
    setShowPicker(true);
  }, [isMobile]);

  useEffect(() => {
    if (openPickerTrigger <= 0) return;
    setShowPopOver(false);
    // Supports opening the picker from external actions (e.g. context menu).
    openPicker();
  }, [openPickerTrigger, openPicker]);

  return (
    <>
      {emoji ? (
        <Popover
          onOpenChange={(open) => {
            if (!open) {
              setShowPopOver(false);
            }
          }}
          open={showPopOver}
        >
          <PopoverTrigger
            data-testid="tab-emoji-trigger"
            data-emoji-picker
            onClick={(e) => e.stopPropagation()}
            disabled={disableEmoji}
          >
            <Button
              ref={(el) => {
                triggerRef.current = el;
              }}
              variant="ghost"
              className={cn(
                '!min-w-[16px] !min-h-[16px] !w-[16px] !h-[16px] !p-0 flex items-center justify-center !hover:bg-transparent',
              )}
              onClick={(e) => {
                e.preventDefault();
                showPicker && setShowPicker(false);
                setShowPopOver(!showPopOver);
              }}
            >
              <span className=" text-[16px] leading-[16px] w-[16px] flex items-center justify-center">
                {emoji}
              </span>
            </Button>
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
              data-testid="tab-emoji-choose"
              onClick={() => {
                openPicker();
                setShowPopOver(false);
              }}
              className="space-xsm gap-xsm hover:color-bg-default-hover cursor-pointer h-[30px] border-radius-sm flex items-center"
            >
              <LucideIcon name="Pencil" className="w-[16px] h-[16px]" />
              <p className="text-heading-xsm color-text-default">
                Choose emoji
              </p>
            </div>
            <div
              data-testid="tab-emoji-clear"
              onClick={() => {
                setEmoji('');
                setShowPopOver(false);
              }}
              className={cn(
                'space-xsm cursor-pointer min-w-[144px] gap-xsm hover:color-bg-default-hover border-radius-sm h-[30px] color-border-default flex items-center',
              )}
            >
              <LucideIcon name="X" className={cn('w-[16px] h-[16px]')} />
              <p className={cn('text-heading-xsm')}>Clear emoji</p>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <div
          className="flex items-center"
          data-emoji-picker
          ref={(el) => {
            triggerRef.current = el;
          }}
        >
          <Tooltip position={'top'} text="Choose emoji">
            <LucideIcon
              onClick={() => {
                if (disableEmoji) return;
                if (showPicker) {
                  setShowPicker(false);
                  return;
                }
                openPicker();
              }}
              name={isEditing ? 'SmilePlus' : 'FileText'}
              className="w-[16px] shrink-0"
            />
          </Tooltip>
        </div>
      )}
      {showPicker && (
        <div
          data-emoji-picker
          ref={(el) => {
            toggleRef.current = el;
          }}
          // `fixed` keeps the picker visible even if parent containers have overflow clipping.
          className={cn('fixed z-50')}
          style={{ top: pickerPosition.top, left: pickerPosition.left }}
        >
          <EmojiPicker
            className={cn(
              'color-bg-default rounded-lg border shadow-md',
              isMobile ? 'h-[287px]' : 'h-[340px]',
            )}
            onEmojiSelect={({ emoji }) => {
              setEmoji(emoji);
              setShowPicker(false);
            }}
          >
            <EmojiPickerSearch />
            <EmojiPickerContent />
            <EmojiPickerFooter />
          </EmojiPicker>
        </div>
      )}
    </>
  );
};
export function EmojiPicker({
  className,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Root>) {
  return (
    <EmojiPickerPrimitive.Root
      className={cn(
        'bg-popover text-popover-foreground isolate flex h-full w-fit flex-col overflow-hidden rounded-md',
        className,
      )}
      data-slot="emoji-picker"
      {...props}
    />
  );
}

export function EmojiPickerSearch({
  className,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Search>) {
  return (
    <div
      className={cn('flex h-9 items-center gap-2 border-b px-3', className)}
      data-slot="emoji-picker-search-wrapper"
    >
      <SearchIcon className="size-4 shrink-0 opacity-50" />
      <EmojiPickerPrimitive.Search
        className="outline-hidden placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-0"
        data-slot="emoji-picker-search"
        {...props}
      />
    </div>
  );
}

export function EmojiPickerRow({
  children,
  ...props
}: EmojiPickerListRowProps) {
  return (
    <div {...props} className="scroll-my-1 px-1" data-slot="emoji-picker-row">
      {children}
    </div>
  );
}

export function EmojiPickerEmoji({
  emoji,
  className,
  ...props
}: EmojiPickerListEmojiProps) {
  return (
    <button
      {...props}
      className={cn(
        'data-[active]:bg-accent flex size-7 items-center justify-center rounded-sm text-base',
        className,
      )}
      data-slot="emoji-picker-emoji"
    >
      {emoji.emoji}
    </button>
  );
}

export function EmojiPickerCategoryHeader({
  category,
  ...props
}: EmojiPickerListCategoryHeaderProps) {
  return (
    <div
      {...props}
      className="color-bg-default text-muted-foreground px-3 pb-2 pt-3.5 text-xs leading-none "
      data-slot="emoji-picker-category-header"
    >
      {category.label}
    </div>
  );
}

export function EmojiPickerContent({
  className,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Viewport>) {
  return (
    <EmojiPickerPrimitive.Viewport
      className={cn('outline-hidden relative flex-1', className)}
      data-slot="emoji-picker-viewport"
      {...props}
    >
      <EmojiPickerPrimitive.Loading
        className="absolute inset-0 flex items-center justify-center text-muted-foreground"
        data-slot="emoji-picker-loading"
      >
        <LoaderIcon className="size-4 animate-spin" />
      </EmojiPickerPrimitive.Loading>
      <EmojiPickerPrimitive.Empty
        className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm"
        data-slot="emoji-picker-empty"
      >
        No emoji found.
      </EmojiPickerPrimitive.Empty>
      <EmojiPickerPrimitive.List
        className="select-none pb-1"
        components={{
          Row: EmojiPickerRow,
          Emoji: EmojiPickerEmoji,
          CategoryHeader: EmojiPickerCategoryHeader,
        }}
        data-slot="emoji-picker-list"
      />
    </EmojiPickerPrimitive.Viewport>
  );
}

export function EmojiPickerFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'max-w-(--frimousse-viewport-width) flex w-full min-w-0 items-center gap-1 border-t p-2',
        className,
      )}
      data-slot="emoji-picker-footer"
      {...props}
    >
      <EmojiPickerPrimitive.ActiveEmoji>
        {({ emoji }) =>
          emoji ? (
            <>
              <div className="flex size-7 flex-none items-center justify-center text-lg">
                {emoji.emoji}
              </div>
              <span className="text-secondary-foreground truncate w-[200px] text-xs">
                {emoji.label}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground ml-1.5 flex h-7 items-center truncate text-xs">
              Select an emoji…
            </span>
          )
        }
      </EmojiPickerPrimitive.ActiveEmoji>
    </div>
  );
}
