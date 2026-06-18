import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  LucideIcon,
  useTheme,
} from '@fileverse/ui';
import cn from 'classnames';
import type { Editor } from '@tiptap/core';
import { IEditorToolElement } from '../editor-utils';
import { textColors } from '../../utils/colors';
import { getContrastColor } from '../../utils/color-utils';

const ColorPicker = ({ editor }: { editor: Editor }) => {
  const { theme } = useTheme();
  return (
    <div className="h-auto gap-0.5 rounded color-bg-default px-3 py-3 shadow-elevation-3 transition-all max-w-fit">
      <div className="grid grid-cols-[repeat(15,_minmax(0,_1fr))] gap-0.5">
        {textColors.map((color) => {
          const contrastColor = getContrastColor(
            (color as Record<string, string>)[theme] || color.light,
          );
          const tickColorClassName =
            contrastColor === '#000000' ? 'text-black' : 'text-white';
          const colorCSSVariable = `var(--color-editor-${color.name})`;
          return (
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().setColor(colorCSSVariable).run();
              }}
              key={color.name}
              className={cn(
                'w-5 p-0 rounded-full flex justify-center items-center cursor-pointer ease-in duration-200 data-[highlighted]:scale-[1.05] h-5',
              )}
              style={{ backgroundColor: colorCSSVariable }}
            >
              <LucideIcon
                name="Check"
                className={cn(
                  'w-[14px] aspect-square',
                  editor.isActive('textStyle', {
                    color: colorCSSVariable,
                  })
                    ? 'visible'
                    : 'invisible',
                  tickColorClassName,
                )}
              />
            </DropdownMenuItem>
          );
        })}
      </div>
      <DropdownMenuItem
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          editor.chain().focus().unsetColor().run();
        }}
        className="w-full justify-center mt-2 gap-1 p-1 h-fit min-w-fit hover:color-bg-default-hover"
      >
        <LucideIcon name="Ban" className="w-[18px] aspect-square" />
        <span>None</span>
      </DropdownMenuItem>
    </div>
  );
};

export const TextColorDropdown = ({
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
        <ColorPicker editor={editor} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
