import { Editor, Range } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { ReminderMenu } from './reminder-menu';
import { Reminder, ReminderBlockOptions } from './types';

export function showReminderMenu(editor: Editor, range: Range) {
  let popup: TippyInstance[] = [];

  const getReferenceClientRect = () => {
    const node = editor.view.domAtPos(range.from).node as HTMLElement;
    return node.getBoundingClientRect();
  };

  // Create the React component first
  const component = new ReactRenderer(ReminderMenu, {
    props: {
      editor,
      isOpen: true,
      onClose: () => {
        popup[0]?.destroy();
        component.destroy();
      },
      onCreateReminder: (reminder: Reminder) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setReminderBlock({
            id: reminder.id,
            reminder: reminder,
          })
          .run();

        const extensionOptions = editor.extensionManager.extensions.find(
          (ext) => ext.name === 'reminderBlock',
        )?.options as ReminderBlockOptions;

        if (extensionOptions?.onReminderCreate) {
          extensionOptions.onReminderCreate(reminder);
        }

        popup[0]?.destroy();
        component.destroy();
      },
    },
    editor,
  });

  // Now create the tippy instance after the component is ready
  popup = tippy('body', {
    getReferenceClientRect,
    appendTo: () => document.body,
    content: component.element,
    showOnCreate: true,
    interactive: true,
    trigger: 'manual',
    placement: 'bottom-start',
    animation: 'shift-toward-subtle',
    popperOptions: {
      strategy: 'fixed',
      modifiers: [
        {
          name: 'flip',
          options: {
            fallbackPlacements: ['bottom', 'right'],
          },
        },
      ],
    },
  });

  return component;
}
