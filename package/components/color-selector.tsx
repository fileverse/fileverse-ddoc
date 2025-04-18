import { LucideIcon } from '@fileverse/ui';
import { Editor } from '@tiptap/core';
import cn from 'classnames';
import { Dispatch, FC, SetStateAction } from 'react';

export interface BubbleColorMenuItem {
  name: string;
  color: string;
}

interface ColorSelectorProps {
  editor: Editor;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

export const ColorSelector: FC<ColorSelectorProps> = ({
  editor,
  isOpen,
  setIsOpen,
}) => {
  const items: BubbleColorMenuItem[] = [
    {
      name: 'Default',
      color: '#000000',
    },
    {
      name: 'Purple',
      color: '#9333EA',
    },
    {
      name: 'Red',
      color: '#E00000',
    },
    {
      name: 'Blue',
      color: '#2563EB',
    },
    {
      name: 'Green',
      color: '#008A00',
    },
    {
      name: 'Orange',
      color: '#FFA500',
    },
    {
      name: 'Pink',
      color: '#BA4081',
    },
    {
      name: 'Gray',
      color: '#A8A29E',
    },
  ];

  const activeItem = items.find(({ color }) =>
    editor.isActive('textStyle', { color }),
  );

  return (
    <div className="">
      <button
        className="flex h-[100%] items-center gap-1 p-2 text-sm font-medium text-stone-600 rounded hover:bg-stone-100 active:bg-stone-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ color: activeItem?.color || '#000000' }}>A</span>

        <LucideIcon name="ChevronDown" size="sm" />
      </button>

      {isOpen && (
        <section className="fixed top-full z-[99999] mt-1 flex w-48 flex-col overflow-hidden rounded border border-stone-200 color-bg-default p-1 shadow-xl animate-in fade-in slide-in-from-top-1">
          {items.map(({ name, color }, index) => (
            <button
              key={index}
              onClick={() => {
                editor.chain().focus().setColor(color).run();
                setIsOpen(false);
              }}
              className={cn(
                'flex items-center justify-between rounded-sm px-2 py-1 text-sm text-stone-600 hover:bg-stone-100',
                {
                  'text-blue-600': editor.isActive('textStyle', { color }),
                },
              )}
            >
              <div className="flex items-center space-x-2">
                <div
                  className="rounded-sm border border-stone-200 px-1 py-px font-medium"
                  style={{ color }}
                >
                  A
                </div>
                <span>{name}</span>
              </div>
              {editor.isActive('textStyle', { color }) && (
                <LucideIcon name="Check" size="sm" />
              )}
            </button>
          ))}
        </section>
      )}
    </div>
  );
};
