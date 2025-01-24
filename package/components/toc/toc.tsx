/* eslint-disable @typescript-eslint/no-explicit-any */
import { cn, IconButton } from '@fileverse/ui';
import { TextSelection } from '@tiptap/pm/state';
import { useState } from 'react';
import { ToCProps, ToCItemProps, ToCItemType } from './types';
import { useMediaQuery } from 'usehooks-ts';

export const ToCItem = ({
  item,
  onItemClick,
  index,
  onItemRemove,
}: ToCItemProps) => {
  return (
    <div
      data-index={index}
      style={{
        paddingLeft: `${(item.level - 1) * 8}px`,
      }}
      className={cn(
        'flex items-center transition-all text-body-sm-bold max-[1280px]:h-[32px] max-[1280px]:px-2 max-[1280px]:py-1 h-4 max-[1280px]:max-w-full xl:!max-w-[200px] min-[1440px]:!max-w-[280px] min-[1600px]:!max-w-[320px]',
        item.isActive
          ? 'border-l-2 border-[#363B3F] color-text-default max-[1280px]:border-none max-[1280px]:bg-[#F8F9FA] max-[1280px]:rounded'
          : 'color-text-secondary',
      )}
    >
      <a
        href={`#${item.id}`}
        onClick={(e) => onItemClick(e, item.id)}
        data-item-index={item.itemIndex}
        className="flex items-center justify-between pl-2 gap-1 h-[32px] transition-all no-underline hover:text-[#363B3F] w-full group"
      >
        <span className="truncate">{item.textContent}</span>
        <IconButton
          icon="X"
          size="sm"
          variant="ghost"
          className="!bg-transparent group-hover:opacity-100 opacity-0 transition-all color-text-secondary"
          onClick={(e) => onItemRemove(e, item.id)}
        />
      </a>
    </div>
  );
};

export const ToCEmptyState = () => {
  return (
    <div className="p-4 text-center text-body-sm color-text-secondary select-none">
      <p>Start editing your document to see the outline.</p>
    </div>
  );
};

export const ToC = ({ items = [], editor, setItems }: ToCProps) => {
  // Add state to track active item
  const [activeId, setActiveId] = useState<string | null>(null);
  const isMobile = useMediaQuery('(max-width: 1280px)');

  if (items.length === 0) {
    return <ToCEmptyState />;
  }

  const onItemClick = (e: any, id: any) => {
    e.preventDefault();
    // Update active item
    setActiveId(id);

    if (editor) {
      const element = editor.view.dom.querySelector(`[data-toc-id="${id}"]`);
      if (!element) return;

      const pos = editor.view.posAtDOM(element as Node, 0);

      // set focus
      const tr = editor.view.state.tr;
      tr.setSelection(new TextSelection(tr.doc.resolve(pos)));
      editor.view.dispatch(tr);
      editor.view.focus();

      // Find all possible scroll containers
      const possibleContainers = [
        document.querySelector('.ProseMirror'),
        document.getElementById('editor-canvas'),
        element.closest('.ProseMirror'),
        element.closest('[class*="editor"]'),
        editor.view.dom.parentElement,
      ].filter(Boolean);

      // Find the first scrollable container
      const scrollContainer = possibleContainers.find(
        (container) =>
          container &&
          (container.scrollHeight > container.clientHeight ||
            window.getComputedStyle(container).overflow === 'auto' ||
            window.getComputedStyle(container).overflowY === 'auto'),
      );

      if (scrollContainer) {
        // Use requestAnimationFrame to ensure DOM updates are complete
        requestAnimationFrame(() => {
          const containerRect = scrollContainer.getBoundingClientRect();
          const elementRect = (element as HTMLElement).getBoundingClientRect();

          // Calculate the scroll position to start the element at the top of the container
          const scrollTop =
            elementRect.top -
            containerRect.top -
            containerRect.height / (isMobile ? 4 : 7) +
            elementRect.height / (isMobile ? 4 : 7);

          scrollContainer.scrollBy({
            top: scrollTop,
            behavior: 'smooth',
          });
        });
      }
    }
  };

  const onItemRemove = (e: any, id: any) => {
    e.preventDefault();
    setItems((prev: ToCItemType[]) =>
      prev.filter((item: ToCItemType) => item.id !== id),
    );
    // TODO: find the way to persist the changes
  };

  return (
    <div className="flex flex-col max-[1280px]:gap-2 gap-4 overflow-auto no-scrollbar max-[1280px]:max-h-[168px] max-h-[calc(80vh-40px)]">
      {items.map((item, i) => (
        <ToCItem
          onItemClick={onItemClick}
          onItemRemove={onItemRemove}
          key={item.id}
          item={{
            ...item,
            isActive: item.id === activeId,
          }}
          index={i + 1}
        />
      ))}
    </div>
  );
};
