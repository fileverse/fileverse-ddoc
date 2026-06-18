import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  LucideIcon,
} from '@fileverse/ui';
import cn from 'classnames';
import type { Editor } from '@tiptap/core';
import { getCurrentFontSize, getFontSizeOptions } from '../editor-utils';

const FontSizePicker = ({
  editor,
  currentSize,
  onSetFontSize,
}: {
  editor: Editor;
  currentSize?: string;
  onSetFontSize: (fontSize: string) => void;
}) => {
  const fontSizes = getFontSizeOptions(editor);

  return (
    <div className="z-50 flex flex-col justify-center items-center overflow-hidden rounded color-bg-default p-2 gap-1 shadow-elevation-1">
      {fontSizes.map((fontSize) => (
        <DropdownMenuItem
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSetFontSize(fontSize.value)}
          key={fontSize.title}
          className={cn(
            'flex w-full items-center justify-center rounded px-2 py-1 text-center text-sm color-text-default transition',
            {
              ['color-bg-brand xl:hover:brightness-90 color-text-on-brand']:
                currentSize === fontSize.value,
              ['hover:color-bg-default-hover']: currentSize !== fontSize.value,
            },
          )}
        >
          <p className="font-medium">{fontSize.title}</p>
        </DropdownMenuItem>
      ))}
    </div>
  );
};

export const FontSizeDropdown = ({
  editor,
  currentSize,
  onSetFontSize,
}: {
  editor: Editor;
  currentSize?: string;
  onSetFontSize: (fontSize: string) => void;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="bg-transparent hover:!color-bg-default-hover rounded gap-2 h-[30px] py-2 px-1 flex items-center justify-center w-[52px]">
          <span className="text-body-sm-bold line-clamp-1">
            {getCurrentFontSize(editor, currentSize as string)}
          </span>
          <LucideIcon name="ChevronDown" size="sm" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-0 b-0">
        <FontSizePicker
          editor={editor}
          currentSize={currentSize}
          onSetFontSize={onSetFontSize}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
