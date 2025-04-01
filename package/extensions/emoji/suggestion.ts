/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Editor, ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';

import { EmojiList } from './EmojiList';

interface EmojiItem {
  shortcodes: string[];
  tags: string[];
}

interface ItemsProps {
  editor: {
    storage: {
      emoji: {
        emojis: EmojiItem[];
      };
    };
  };
  query: string;
}

interface RenderProps {
  clientRect: DOMRect;
  editor: Editor;
}

export default {
  items: ({ editor, query }: ItemsProps) => {
    return editor.storage.emoji.emojis
      .filter(({ shortcodes, tags }) => {
        return (
          shortcodes.find((shortcode) =>
            shortcode.startsWith(query.toLowerCase()),
          ) || tags.find((tag) => tag.startsWith(query.toLowerCase()))
        );
      })
      .slice(0, 5);
  },

  allowSpaces: false,

  render: () => {
    let component: ReactRenderer;
    let popup: any | null = null;

    return {
      onStart: (props: RenderProps) => {
        component = new ReactRenderer(EmojiList, {
          props: {
            ...props,
            onKeyDown: (event: KeyboardEvent) => {
              if (event.key === 'ArrowUp') {
                //@ts-ignore
                component.ref?.current?.up();
                return true;
              }
              if (event.key === 'ArrowDown') {
                //@ts-ignore
                component.ref?.current?.down();
                return true;
              }
              if (event.key === 'Enter') {
                //@ts-ignore
                component.ref?.current?.enter();
                return true;
              }
              return false;
            },
          },
          editor: props.editor,
        });

        //@ts-ignore
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

      onUpdate(props: RenderProps) {
        component.updateProps(props);
        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'Escape') {
          popup?.[0].hide();
          return true;
        }
        //@ts-ignore
        return component?.props?.onKeyDown?.(event);
      },

      onExit() {
        popup[0].destroy();
        component.destroy();
      },
    };
  },
};
