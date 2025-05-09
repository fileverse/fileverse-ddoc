import {
  cn,
  // IconButton
} from '@fileverse/ui';
import { TextSelection } from '@tiptap/pm/state';
import { useState, useMemo, useCallback, memo, useRef } from 'react';
import { ToCProps, ToCItemProps, ToCItemType } from './types';
import { useMediaQuery } from 'usehooks-ts';
import { useEditorContext } from '../../context/editor-context';

// Memoize the ToC item to prevent unnecessary re-renders
export const ToCItem = memo(
  ({
    item,
    onItemClick,
    index,
    // onItemRemove,
  }: ToCItemProps) => {
    // Memoize the click handler to prevent recreating it on every render
    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onItemClick(e, item.id);
      },
      [onItemClick, item.id],
    );

    // Memoize the className calculation
    const className = useMemo(() => {
      return cn(
        'flex items-center transition-all text-body-sm-bold max-[1280px]:h-[32px] max-[1280px]:px-2 max-[1280px]:py-1 h-5 max-[1280px]:max-w-full xl:!max-w-[200px] min-[1440px]:!max-w-[280px] min-[1600px]:!max-w-[320px] xl:border-l-2',
        item.isActive
          ? 'color-border-active color-text-default max-[1280px]:border-none max-[1280px]:bg-[#F8F9FA] max-[1280px]:rounded max-[1280px]:text-[#363B3F]'
          : 'color-text-secondary border-transparent lg:hover:!brightness-90',
      );
    }, [item.isActive]);

    return (
      <div
        data-index={index}
        style={{
          paddingLeft: `${(item.level - 1) * 8}px`,
        }}
        className={className}
        data-testid="toc-item"
      >
        <a
          href={`#${item.id}`}
          onClick={handleClick}
          data-item-index={item.itemIndex}
          className="flex items-center justify-between pl-2 gap-1 h-[32px] transition-all no-underline w-full group"
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
  },
);

ToCItem.displayName = 'ToCItem';

export const ToCEmptyState = memo(() => {
  return (
    <div className="p-4 text-center text-body-sm color-text-secondary select-none">
      <p>Start editing your document to see the outline.</p>
    </div>
  );
});

ToCEmptyState.displayName = 'ToCEmptyState';

export const ToC = memo(({ items = [], editor, setItems }: ToCProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const isMobile = useMediaQuery('(max-width: 1280px)');

  // Add refs for the cache
  const headingsCacheRef = useRef<Map<string, HTMLElement> | null>(null);
  const lastCacheTimeRef = useRef<number>(0);

  // Use the optimized context but only what we need
  const { collapsedHeadings, setCollapsedHeadings, expandMultipleHeadings } =
    useEditorContext();

  // Memoize the filtered and processed items for faster rendering
  const processedItems = useMemo(() => {
    return items.map((item) => ({
      ...item,
      isActive: item.id === activeId,
    }));
  }, [items, activeId]);

  // Update getHeadingsMap to use refs
  const getHeadingsMap = useCallback(() => {
    if (
      editor &&
      (!headingsCacheRef.current || Date.now() - lastCacheTimeRef.current > 500)
    ) {
      const newMap = new Map<string, HTMLElement>();

      // Use a more efficient selector that queries all headings at once
      const allHeadings = editor.view.dom.querySelectorAll('[data-toc-id]');
      allHeadings.forEach((element) => {
        const id = element.getAttribute('data-toc-id');
        if (id) {
          newMap.set(id, element as HTMLElement);
        }
      });

      headingsCacheRef.current = newMap;
      lastCacheTimeRef.current = Date.now();
    }

    return headingsCacheRef.current;
  }, [editor]);

  // Fix for handling heading expansion
  const expandHeadingAndItsAncestors = useCallback(
    (id: string) => {
      // Ensure direct expansion of clicked heading
      if (collapsedHeadings.has(id)) {
        setCollapsedHeadings((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }

      // Find the clicked item
      const clickedItem = items.find((item) => item.id === id);
      if (!clickedItem) return;

      const clickedLevel = clickedItem.level;

      // If clicked item is H1, expand all its nested content
      if (clickedLevel === 1) {
        let isWithinCurrentH1 = false;
        const headingsToExpand: string[] = [];

        items.forEach((item) => {
          // Start collecting items after current H1
          if (item.id === id) {
            isWithinCurrentH1 = true;
            return;
          }

          // Stop when we hit the next H1
          if (item.level === 1) {
            isWithinCurrentH1 = false;
            return;
          }

          // Expand all items between current H1 and next H1
          if (isWithinCurrentH1 && collapsedHeadings.has(item.id)) {
            headingsToExpand.push(item.id);
          }
        });

        if (headingsToExpand.length > 0) {
          expandMultipleHeadings(headingsToExpand);
        }
      } else {
        // For non-H1 headings, find and expand all ancestors
        const headingsToExpand: string[] = [];

        // Simple iteration up the levels to find ancestors
        for (
          let i = items.findIndex((item) => item.id === id) - 1;
          i >= 0;
          i--
        ) {
          const item = items[i];
          if (item.level < clickedLevel && collapsedHeadings.has(item.id)) {
            headingsToExpand.push(item.id);
            if (item.level === 1) break; // Stop at H1
          }
        }

        if (headingsToExpand.length > 0) {
          expandMultipleHeadings(headingsToExpand);
        }
      }
    },
    [items, collapsedHeadings, expandMultipleHeadings, setCollapsedHeadings],
  );

  // Optimize clicking on a heading by using the cached heading structure
  const onItemClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();

      // Update active item
      setActiveId(id);

      if (editor) {
        // First handle heading expansion - this is critical for making the TOC work
        expandHeadingAndItsAncestors(id);

        // Find the element - try the DOM cache first, but fall back to direct query if not found
        const headingsMap = getHeadingsMap();
        let element = headingsMap?.get(id);

        // If not found in the cache, try direct lookup and refresh the cache
        if (!element) {
          element = editor.view.dom.querySelector(
            `[data-toc-id="${id}"]`,
          ) as HTMLElement;
          if (element && headingsMap) {
            headingsMap.set(id, element);
          }
        }

        if (!element) {
          return;
        }

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
    },
    [editor, expandHeadingAndItsAncestors, getHeadingsMap, isMobile],
  );

  const onItemRemove = useCallback(
    (e: React.MouseEvent, id: string) => {
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
    },
    [activeId, onItemClick, setItems],
  );

  // Empty state check
  if (items.length === 0) {
    return <ToCEmptyState />;
  }

  return (
    <div
      className="flex flex-col max-[1280px]:gap-2 gap-4 overflow-auto no-scrollbar max-[1280px]:max-h-[168px] max-h-[calc(80vh-40px)] mb-3"
      data-testid="toc-container"
    >
      {processedItems.map((item, i) => (
        <ToCItem
          onItemClick={onItemClick}
          onItemRemove={onItemRemove}
          key={item.id}
          item={item}
          index={i + 1}
        />
      ))}
    </div>
  );
});

ToC.displayName = 'ToC';
