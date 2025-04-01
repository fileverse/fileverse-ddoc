import { forwardRef, useEffect, useState, useCallback } from 'react';

type EmojiItem = {
  name: string;
  emoji?: string;
  fallbackImage?: string;
};

type EmojiListProps = {
  items: EmojiItem[];
  command: (item: { name: string }) => void;
};

export const EmojiList = forwardRef<HTMLDivElement, EmojiListProps>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = useCallback(
      (index: number) => {
        const item = props.items[index];
        if (item) {
          props.command({ name: item.name });
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
        className="relative flex flex-col gap-1 overflow-auto rounded-lg border color-border-default color-bg-default p-2 shadow-elevation-3"
        ref={ref}
        id="emoji-list"
      >
        {props.items.map((item, index) => (
          <button
            className={`flex w-full items-center gap-1 text-left hover:color-bg-default-hover py-1 px-2 rounded ${
              index === selectedIndex ? 'color-bg-default-hover' : ''
            }`}
            key={index}
            onClick={() => selectItem(index)}
          >
            {item.fallbackImage ? (
              <img
                src={item.fallbackImage}
                alt={item.name}
                className="h-4 w-4"
              />
            ) : (
              item.emoji
            )}
            :{item.name}:
          </button>
        ))}
      </div>
    );
  },
);
