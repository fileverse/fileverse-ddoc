import {
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@fileverse/ui';
import { useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { IEditorToolElement, LinkPopup } from '../editor-utils';

export const LinkPopover = ({
  tool,
  editor,
  onError,
}: {
  tool: IEditorToolElement;
  editor: Editor;
  onError?: (errorString: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <IconButton
          icon={tool.icon}
          variant="ghost"
          size="sm"
          disabled={tool.disabled}
        />
      </PopoverTrigger>
      <PopoverContent
        className="p-0 b-0 w-auto"
        sideOffset={8}
        onCloseAutoFocus={(e) => {
          // Closing the link form (Enter, Escape, Apply, or outside-click)
          // returns focus to the editor instead of the trigger button.
          e.preventDefault();
          editor.commands.focus();
        }}
      >
        <LinkPopup
          editor={editor}
          elementRef={contentRef}
          setToolVisibility={() => setOpen(false)}
          onError={onError}
        />
      </PopoverContent>
    </Popover>
  );
};
