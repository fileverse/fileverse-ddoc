import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  LucideIcon,
} from '@fileverse/ui';
import cn from 'classnames';
import type { Editor } from '@tiptap/core';
import { IEditorToolElement } from '../editor-utils';
import { colors } from '../../utils/colors';
import { getContrastColor } from '../../utils/color-utils';

const HighlightPicker = ({ editor }: { editor: Editor }) => {
  return (
    <div className="z-50 h-auto gap-0.5 flex flex-wrap max-h-[400px] w-[14.7rem] overflow-y-auto scroll-smooth rounded color-bg-default px-2 py-2 shadow-elevation-3 transition-all">
      {colors.map((color) => {
        const contrastColor = getContrastColor(color.color);
        const tickColorClassName =
          contrastColor === '#000000' ? 'text-black' : 'text-white';
        return (
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor
                .chain()
                .focus()
                .toggleHighlight({ color: color.color })
                .run();
            }}
            key={color.color}
            className={cn(
              'w-5 p-0 rounded-full flex items-center justify-center cursor-pointer ease-in duration-200 data-[highlighted]:scale-[1.05] h-5',
            )}
            style={{ backgroundColor: color.color }}
          >
            <LucideIcon
              name="Check"
              className={cn(
                'w-[14px] aspect-square',
                editor.isActive('highlight', {
                  color: color.color,
                })
                  ? 'visible'
                  : 'invisible',
                tickColorClassName,
              )}
            />
          </DropdownMenuItem>
        );
      })}

      <DropdownMenuItem
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          editor.chain().focus().unsetHighlight().run();
        }}
        className="w-full justify-start mt-2 gap-1 p-1 h-fit hover:color-bg-default-hover"
      >
        <LucideIcon name="Ban" className="w-[18px] aspect-square" />
        <span>None</span>
      </DropdownMenuItem>
    </div>
  );
};

export const HighlightDropdown = ({
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
        <HighlightPicker editor={editor} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
