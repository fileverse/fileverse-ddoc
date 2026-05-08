import {
  Button,
  IconButton,
  Popover,
  PopoverAnchor,
  PopoverClose,
  PopoverContent,
  TextField,
  Tooltip,
} from '@fileverse/ui';

const SearchReplace = () => {
  return (
    <Popover open>
      <PopoverAnchor className="absolute right-0" />
      <PopoverContent
        sideOffset={12}
        alignOffset={12}
        align="start"
        side="left"
        arrowPadding={12}
        className="pt-2 border-none bg-transparent"
      >
        <div className="p-2 border color-border-default w-80 max-w-full rounded-lg space-y-2 color-bg-default">
          {/* Search */}
          <div className="flex items-center gap-2 pr-1 pl-2 border rounded-md">
            <TextField
              placeholder="Search text..."
              className="border-none p-0"
            />
            <span className="color-text-secondary text-sm">1/3</span>
            <div className="flex items-center">
              <div className="flex items-center">
                <Tooltip text="Previous">
                  <IconButton icon={'ArrowUp'} variant={'ghost'} size="sm" />
                </Tooltip>
                <Tooltip text="Next">
                  <IconButton icon={'ArrowDown'} variant={'ghost'} size="sm" />
                </Tooltip>
              </div>
              <Tooltip text="Replace">
                <IconButton icon={'Replace'} variant={'ghost'} size="sm" />
              </Tooltip>
            </div>
            <PopoverClose asChild>
              <IconButton icon={'X'} variant={'ghost'} size="sm" />
            </PopoverClose>
          </div>
          {/* Replace */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-2 border rounded-md">
              <TextField
                placeholder="Replace with..."
                className="border-none p-0"
              />
            </div>
            <div className="flex justify-end items-center gap-2">
              <Button variant={'default'} size={'sm'} className="min-w-0">
                Replace
              </Button>
              <Button variant={'secondary'} size={'sm'} className="min-w-0">
                Replace All
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SearchReplace;
