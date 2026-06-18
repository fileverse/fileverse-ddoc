import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  LucideIcon,
  LucideIconProps,
} from '@fileverse/ui';
import cn from 'classnames';
import type { Editor } from '@tiptap/core';
import { IEditorToolElement } from '../editor-utils';

const ALIGNMENTS: { value: string; icon: LucideIconProps['name'] }[] = [
  { value: 'left', icon: 'AlignLeft' },
  { value: 'center', icon: 'AlignCenter' },
  { value: 'right', icon: 'AlignRight' },
  { value: 'justify', icon: 'AlignJustify' },
];

const AlignmentPicker = ({ editor }: { editor: Editor }) => {
  return (
    <div className="z-50 h-auto flex flex-wrap gap-1 max-h-[330px] overflow-y-auto scroll-smooth rounded color-bg-default px-1 py-2 shadow-elevation-3 transition-all">
      {ALIGNMENTS.map((alignment) => (
        <DropdownMenuItem
          key={alignment.value}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            editor?.chain().focus().setTextAlign(alignment.value).run();
          }}
          className={cn(
            'rounded w-8 h-8 p-1 flex justify-center items-center cursor-pointer transition',
            editor.isActive({ textAlign: alignment.value })
              ? 'color-bg-brand xl:hover:brightness-90 color-text-on-brand'
              : 'hover:color-bg-default-hover data-[highlighted]:color-bg-default-hover',
          )}
        >
          <LucideIcon name={alignment.icon} />
        </DropdownMenuItem>
      ))}
    </div>
  );
};

export const AlignmentDropdown = ({
  tool,
  editor,
}: {
  tool: IEditorToolElement;
  editor: Editor;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          icon={tool.icon}
          variant="ghost"
          size="sm"
          disabled={tool.disabled}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-0 b-0">
        <AlignmentPicker editor={editor} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
