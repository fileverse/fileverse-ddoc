import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  LucideIcon,
} from '@fileverse/ui';
import { buildPickerEntries, EditorFontFamily } from '../editor-utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import type { FontDescriptor } from '../../types';
import { getCurrentFontFamily } from '../../utils/get-current-font-family';

export const FontFamilyDropdown = ({
  consumerFonts,
  editor,
}: {
  consumerFonts?: FontDescriptor[];
  editor: Editor;
}) => {
  const [open, setOpen] = useState(false);
  const [currentFont, setCurrentFont] = useState('Default');
  const contentRef = useRef<HTMLDivElement>(null);

  const pickerEntries = useMemo(
    () => buildPickerEntries(consumerFonts ?? []),
    [consumerFonts],
  );
  const activeFont = useMemo(
    () => pickerEntries.find((f) => f.value === currentFont),
    [pickerEntries, currentFont],
  );

  useEffect(() => {
    if (!editor) return;

    const update = () => setCurrentFont(getCurrentFontFamily(editor));
    const handleTransaction = ({
      transaction,
    }: {
      transaction: {
        selectionSet?: boolean;
        storedMarksSet?: boolean;
        docChanged?: boolean;
      };
    }) => {
      // Only refresh when selection or stored marks/doc changed
      if (
        transaction.selectionSet ||
        transaction.storedMarksSet ||
        transaction.docChanged
      ) {
        update();
      }
    };

    editor.on('selectionUpdate', update);
    editor.on('transaction', handleTransaction);

    update();

    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', handleTransaction);
    };
  }, [editor]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="bg-transparent hover:!color-bg-default-hover rounded p-2 h-[30px] flex items-center justify-center gap-2 w-[85px]">
          <span
            className="text-body-sm-bold line-clamp-1 break-all"
            style={{
              fontFamily: activeFont?.value,
            }}
          >
            {activeFont?.title || 'Default'}
          </span>
          <LucideIcon name="ChevronDown" size="sm" className="min-w-fit" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-0 b-0">
        <EditorFontFamily
          editor={editor}
          elementRef={contentRef}
          setToolVisibility={() => setOpen(false)}
          fonts={consumerFonts}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
