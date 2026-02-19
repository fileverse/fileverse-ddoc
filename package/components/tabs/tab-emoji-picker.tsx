import {
  Button,
  cn,
  LucideIcon,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
} from '@fileverse/ui';
import { useEffect, useRef, useState } from 'react';
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
}: {
  emoji: string;
  setEmoji: (emoji: string) => void;
  isEditing: boolean;
  openPickerTrigger?: number;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const toggleRef = useRef(null);
  const toggleButtonRef = useRef(null);
  const [showPopOver, setShowPopOver] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1000px)', { defaultValue: true });
  useOnClickOutside([toggleRef, toggleButtonRef], (event) => {
    if (
      toggleRef.current &&
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      !toggleRef.current.contains(event.target)
    ) {
      setShowPicker(false);
    }
  });

  useEffect(() => {
    if (openPickerTrigger <= 0) return;
    setShowPopOver(false);
    setShowPicker(true);
  }, [openPickerTrigger]);

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
            data-emoji-picker
            onClick={(e) => e.stopPropagation()}
          >
            <Button
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
              onClick={() => {
                setShowPicker(true);
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
        <div className="flex items-center" data-emoji-picker>
          <Tooltip position={'top'} text="Choose emoji">
            <LucideIcon
              ref={toggleButtonRef}
              onClick={() => {
                setShowPicker(!showPicker);
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
          ref={toggleRef}
          className={cn(
            'absolute top-[35px] z-10 ',
            isMobile ? 'left-[42px]' : 'left-[9px]',
          )}
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
