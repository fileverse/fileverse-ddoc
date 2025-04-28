import { forwardRef, useEffect, useState, useCallback } from 'react';

export type EmojiItem = {
  name: string;
  emoji: string;
};

type EmojiListProps = {
  items: EmojiItem[];
  command: (item: EmojiItem) => void;
};

export const EmojiList = forwardRef<HTMLDivElement, EmojiListProps>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = useCallback(
      (index: number) => {
        const item = props.items[index];
        if (item) {
          props.command(item);
        }
      },
      [props],
    );

    const upHandler = useCallback(() => {
      setSelectedIndex(
        (prevIndex) =>
          (prevIndex + props.items.length - 1) % props.items.length,
      );
    }, [props.items.length]);

    const downHandler = useCallback(() => {
      setSelectedIndex((prevIndex) => (prevIndex + 1) % props.items.length);
    }, [props.items.length]);

    const enterHandler = useCallback(() => {
      selectItem(selectedIndex);
    }, [selectItem, selectedIndex]);

    useEffect(() => {
      setSelectedIndex(0);
    }, [props.items]);

    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          upHandler();
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          downHandler();
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          enterHandler();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [upHandler, downHandler, enterHandler]);

    if (props.items.length === 0) return <></>;

    return (
      <div
        className="relative flex flex-col gap-1 overflow-y-auto max-h-64 rounded-lg border color-border-default color-bg-default p-2 shadow-elevation-3 no-scrollbar"
        ref={ref}
        id="emoji-list"
      >
        {props.items.map((item, index) => (
          <button
            key={index}
            type="button"
            className={`flex w-full items-center gap-1 text-left text-xs hover:color-bg-default-hover py-1 px-2 rounded ${
              index === selectedIndex ? 'color-bg-default-hover' : ''
            }`}
            onClick={() => selectItem(index)}
          >
            {item.emoji} :{item.name}:
          </button>
        ))}
      </div>
    );
  },
);

EmojiList.displayName = 'EmojiList';
