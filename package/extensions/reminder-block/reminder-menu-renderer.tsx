import { Editor, Range } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { ReminderMenu } from './reminder-menu';
import { Reminder, ReminderBlockOptions, ReminderMenuProps } from './types';

export function showReminderMenu(
  editor: Editor,
  range: Range,
  type: ReminderMenuProps['type'],
  onError?: (error: string) => void,
) {
  let popup: TippyInstance[] = [];
  let timeout: ReturnType<typeof setTimeout>;

  // Delete the slash command text immediately when showing the menu
  editor.chain().focus().deleteRange(range).run();

  const getReferenceClientRect = () => {
    const domAtPos = editor.view.domAtPos(range.from);
    let node = domAtPos.node as HTMLElement;

    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement as HTMLElement;
    }

    if (node?.getBoundingClientRect) {
      return node.getBoundingClientRect();
    }

    const domRange = document.createRange();
    domRange.setStart(domAtPos.node, domAtPos.offset);
    domRange.setEnd(domAtPos.node, domAtPos.offset);
    return domRange.getBoundingClientRect();
  };

  const destroyPopup = () => {
    clearTimeout(timeout);
    popup[0]?.destroy();
    component.destroy();
  };

  // Create the React component first
  const component = new ReactRenderer(ReminderMenu, {
    props: {
      editor,
      isOpen: true,
      onClose: destroyPopup,
      onCreateReminder: (reminder: Reminder) => {
        try {
          editor
            .chain()
            .focus()
            .setReminderBlock({
              id: reminder.id,
              reminder: reminder,
            })
            .run();

          const extensionOptions = editor.extensionManager.extensions.find(
            (ext) => ext.name === 'reminderBlock',
          )?.options as ReminderBlockOptions;

          if (extensionOptions?.onReminderCreate) {
            extensionOptions.onReminderCreate(reminder, type);
          }
        } catch (error) {
          console.error('Error creating reminder:', error);
          if (onError) {
            onError('Failed to create reminder');
          }
        } finally {
          destroyPopup();
        }
      },
      type,
    },
    editor,
  });

  // Now create the tippy instance after the component is ready
  popup = tippy('body', {
    getReferenceClientRect,
    appendTo: () => document.body,
    content: component.element,
    zIndex: 50,
    showOnCreate: true,
    hideOnClick: false,
    interactive: true,
    trigger: 'manual',
    placement: 'bottom-start',
    animation: 'shift-toward-subtle',
    onMount: () => {
      // Focus the input after Tippy mounts the component
      timeout = setTimeout(() => {
        const input = component.element.querySelector('input');
        if (input) {
          input.focus();
        }
      }, 0);
    },
    onDestroy: () => {
      clearTimeout(timeout);
    },
    popperOptions: {
      strategy: 'fixed',
      modifiers: [
        {
          name: 'flip',
          options: {
            fallbackPlacements: ['bottom'],
          },
        },
        {
          name: 'preventOverflow',
          options: {
            altAxis: true,
            tether: false,
          },
        },
      ],
    },
  });

  return component;
}
