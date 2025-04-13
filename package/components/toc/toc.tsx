import {
  cn,
  // IconButton
} from '@fileverse/ui';
import { TextSelection } from '@tiptap/pm/state';
import { useState } from 'react';
import { ToCProps, ToCItemProps, ToCItemType } from './types';
import { useMediaQuery } from 'usehooks-ts';
// import { useEditorContext } from '../../context/editor-context';

export const ToCItem = ({
  item,
  onItemClick,
  index,
  // onItemRemove,
}: ToCItemProps) => {
  return (
    <div
      data-index={index}
      style={{
        paddingLeft: `${(item.level - 1) * 8}px`,
      }}
      className={cn(
        'flex items-center transition-all text-body-sm-bold max-[1280px]:h-[32px] max-[1280px]:px-2 max-[1280px]:py-1 h-5 max-[1280px]:max-w-full xl:!max-w-[200px] min-[1440px]:!max-w-[280px] min-[1600px]:!max-w-[320px] xl:border-l-2',
        item.isActive
          ? 'color-border-active color-text-default max-[1280px]:border-none max-[1280px]:bg-[#F8F9FA] max-[1280px]:rounded max-[1280px]:text-[#363B3F]'
          : 'color-text-secondary border-transparent lg:hover:!brightness-90',
      )}
    >
      <a
        href={`#${item.id}`}
        onClick={(e) => onItemClick(e, item.id)}
        data-item-index={item.itemIndex}
        className="flex items-center justify-between pl-2 gap-1 h-[32px] transition-all no-underline  w-full group"
      >
        <span className="truncate">{item.textContent}</span>
        {/* <IconButton
          icon="X"
          size="sm"
          variant="ghost"
          className={cn(
            '!bg-transparent group-hover:opacity-100 opacity-0 transition-all color-text-secondary',
            item.isActive ? 'max-[1280px]:visible' : 'max-[1280px]:invisible',
          )}
          onClick={(e) => onItemRemove(e, item.id)}
        /> */}
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const isMobile = useMediaQuery('(max-width: 1280px)');

  // const { setCollapsedHeadings } = useEditorContext();

  if (items.length === 0) {
    return <ToCEmptyState />;
  }

  const onItemClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    // Update active item
    setActiveId(id);

    if (editor) {
      const element = editor.view.dom.querySelector(`[data-toc-id="${id}"]`);
      if (!element) return;

      // Find the clicked heading's level and expand itself and its ancestors
      // const expandHeadingAndItsAncestors = () => {
      //   // Find the clicked item
      //   const clickedItem = items.find((item) => item.id === id);
      //   if (!clickedItem) return;

      //   const clickedLevel = clickedItem.level;

      //   // Expand the clicked heading itself
      //   // setCollapsedHeadings((prev) => {
      //   //   const newSet = new Set(prev);
      //   //   newSet.delete(id);

      //   //   // If clicked item is H1, expand all its nested content
      //   //   if (clickedLevel === 1) {
      //   //     let isWithinCurrentH1 = false;
      //   //     items.forEach((item) => {
      //   //       // Start collecting items after current H1
      //   //       if (item.id === id) {
      //   //         isWithinCurrentH1 = true;
      //   //         return;
      //   //       }

      //   //       // Stop when we hit the next H1
      //   //       if (item.level === 1) {
      //   //         isWithinCurrentH1 = false;
      //   //         return;
      //   //       }

      //   //       // Expand all items between current H1 and next H1
      //   //       if (isWithinCurrentH1) {
      //   //         newSet.delete(item.id);
      //   //       }
      //   //     });
      //   //   } else {
      //   //     // For non-H1 headings, find and expand only direct ancestors
      //   //     let currentLevel = clickedLevel;
      //   //     for (
      //   //       let i = items.findIndex((item) => item.id === id) - 1;
      //   //       i >= 0;
      //   //       i--
      //   //     ) {
      //   //       const item = items[i];
      //   //       if (item.level < currentLevel) {
      //   //         newSet.delete(item.id);
      //   //         currentLevel = item.level;
      //   //         if (currentLevel === 1) break;
      //   //       }
      //   //     }
      //   //   }

      //   //   return newSet;
      //   // });
      // };

      // expandHeadingAndItsAncestors();

      // Add a small delay to allow DOM updates before scrolling
      const timeout = setTimeout(() => {
        const pos = editor.view.posAtDOM(element as Node, 0);

        // set focus
        const tr = editor.view.state.tr;
        tr.setSelection(new TextSelection(tr.doc.resolve(pos)));
        editor.view.dispatch(tr);

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
            const elementRect = (
              element as HTMLElement
            ).getBoundingClientRect();

            // Calculate the scroll position to start the element at the top of the container
            const scrollTop =
              elementRect.top -
              containerRect.top -
              containerRect.height / (isMobile ? 5 : 7) +
              elementRect.height / (isMobile ? 5 : 7);

            scrollContainer.scrollBy({
              top: scrollTop,
              behavior: 'smooth',
            });
          });
        }
      }, 0);

      return () => clearTimeout(timeout);
    }
  };

  const onItemRemove = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    setItems((prev: ToCItemType[]) => {
      // Find the index of the item being removed
      const removedIndex = prev.findIndex((item) => item.id === id);
      const filtered = prev.filter((item) => item.id !== id);

      // Only update active item if we're removing the currently active item
      if (id === activeId && filtered.length > 0) {
        // If we removed the last item, set the previous one active
        if (removedIndex === prev.length - 1) {
          onItemClick(e, filtered[filtered.length - 1].id);
        }
        // Otherwise set the next item active
        else {
          onItemClick(e, filtered[removedIndex]?.id);
        }
      } else if (filtered.length === 0) {
        setActiveId(null);
      }

      return filtered;
    });
  };

  return (
    <div className="flex flex-col max-[1280px]:gap-2 gap-4 overflow-auto no-scrollbar max-[1280px]:max-h-[168px] max-h-[calc(80vh-40px)] mb-3">
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
