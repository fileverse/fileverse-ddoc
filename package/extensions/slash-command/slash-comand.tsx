/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from 'react';
import { useMediaQuery } from 'usehooks-ts';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { Editor, Extension } from '@tiptap/core';
import {
  CommandItemProps,
  getSuggestionItems,
  updateScrollView,
} from './slash-command-utils';
import Suggestion from '@tiptap/suggestion';

export const Command = Extension.create({
  name: 'slash-command',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: any;
        }) => {
          props.command({ editor, range });
        },
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

const CommandList = ({
  items: initialItems,
  command,
  editor,
}: {
  items: CommandItemProps[];
  command: any;
  editor: any;
  range: any;
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [items, setItems] = useState<CommandItemProps[]>(initialItems);
  const isMobile = useMediaQuery('(max-width: 640px)');
  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        if (item.title === 'Continue writing') {
          // we're using this for now until we can figure out a way to stream markdown text with proper formatting: https://github.com/steven-tey/novel/discussions/7
          //   complete(editor.getText())
          //   complete(editor.storage.markdown.getMarkdown())
        } else {
          command(item);
        }
      }
    },
    [command, editor, items],
  );

  useEffect(() => {
    if (isMobile) {
      const filteredItems = initialItems.filter(
        (item) =>
          !['2 Columns', '3 Columns', 'Twitter', 'Video Embed'].includes(
            item.title,
          ),
      );
      setItems(filteredItems);
    } else {
      setItems(initialItems);
    }
  }, [initialItems, isMobile]);

  useEffect(() => {
    const navigationKeys = ['ArrowUp', 'ArrowDown', 'Enter'];
    const onKeyDown = (e: KeyboardEvent) => {
      if (navigationKeys.includes(e.key)) {
        e.preventDefault();
        if (e.key === 'ArrowUp') {
          setSelectedIndex((selectedIndex + items.length - 1) % items.length);
          return true;
        }
        if (e.key === 'ArrowDown') {
          setSelectedIndex((selectedIndex + 1) % items.length);
          return true;
        }
        if (e.key === 'Enter') {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [items, selectedIndex, setSelectedIndex, selectItem]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const commandListContainer = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = commandListContainer?.current;

    const item = container?.children[selectedIndex] as HTMLElement;

    if (item && container) updateScrollView(container, item);
  }, [selectedIndex]);

  return items.length > 0 ? (
    <div
      id="slash-command"
      ref={commandListContainer}
      className="z-50 h-auto max-h-[330px] w-72 overflow-y-auto scroll-smooth rounded-md border border-[#DDD] bg-white px-1 py-2 shadow-md transition-all"
    >
      {items.map((item: CommandItemProps, index: number) => {
        return (
          <button
            key={index}
            className={`flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm text-neutral-500 hover:bg-neutral-100 hover:border-neutral-200 border border-transparent transition-all ${
              index === selectedIndex ? 'bg-neutral-200 text-neutral-800' : ''
            }`}
            onClick={() => selectItem(index)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-white">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-neutral-500">{item.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  ) : null;
};

const renderItems = () => {
  let component: ReactRenderer | null = null;
  let popup: any | null = null;

  return {
    onStart: (props: { editor: Editor; clientRect: DOMRect }) => {
      component = new ReactRenderer(CommandList, {
        props,
        editor: props.editor,
      });

      // @ts-ignore
      popup = tippy('body', {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
      });
    },
    onUpdate: (props: { editor: Editor; clientRect: DOMRect }) => {
      component?.updateProps(props);

      popup &&
        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
    },
    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === 'Escape') {
        popup?.[0].hide();

        return true;
      }

      // @ts-ignore
      return component?.ref?.onKeyDown(props);
    },
    onExit: () => {
      popup?.[0].destroy();
      component?.destroy();
    },
  };
};

const SlashCommand = (
  onError?: (errorString: string) => void,
  secureImageUploadUrl?: string,
) => {
  const items = ({ query }: { query: string }) => {
    return getSuggestionItems({ query, onError, secureImageUploadUrl });
  };
  return Command.configure({
    suggestion: {
      items,
      render: renderItems,
    },
  });
};

export default SlashCommand;
