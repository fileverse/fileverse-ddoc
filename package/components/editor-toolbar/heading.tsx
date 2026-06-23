import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  LucideIcon,
} from '@fileverse/ui';
import { useEditorState } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import { TextHeading } from '../editor-utils';

export const HeadingDropdown = ({ editor }: { editor: Editor }) => {
  const activeHeading = useEditorState({
    editor,
    selector: ({ editor }: { editor: Editor | null }) => {
      if (editor?.isActive('heading', { level: 1 })) return 'Heading 1';
      if (editor?.isActive('heading', { level: 2 })) return 'Heading 2';
      if (editor?.isActive('heading', { level: 3 })) return 'Heading 3';
      return 'Text';
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="bg-transparent hover:!color-bg-default-hover rounded gap-2 p-2 h-[30px] flex items-center justify-between w-[108px]">
          <span className="text-body-sm-bold line-clamp-1">
            {activeHeading}
          </span>
          <LucideIcon name="ChevronDown" size="sm" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-0 b-0">
        <TextHeading editor={editor} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
