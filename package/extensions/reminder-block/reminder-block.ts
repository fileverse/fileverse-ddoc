import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ReminderNodeView } from './reminder-node-view';
import { ReminderBlockOptions, Reminder } from './types';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    reminderBlock: {
      setReminderBlock: (attributes: {
        id: string;
        reminder: Reminder;
      }) => ReturnType;
    };
  }
}

export const ReminderBlock = Node.create<ReminderBlockOptions>({
  name: 'reminderBlock',

  group: 'inline',

  inline: true,

  atom: true,

  addOptions() {
    return {
      onReminderCreate: undefined,
      onReminderDelete: undefined,
      onReminderUpdate: undefined,
      reminders: [],
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
      },
      reminder: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="reminder-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-type': 'reminder-block' }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ReminderNodeView);
  },

  addCommands() {
    return {
      setReminderBlock:
        (attributes) =>
        ({ commands, state }) => {
          const { selection } = state;
          const { to } = selection;

          return commands.insertContentAt(to, {
            type: this.name,
            attrs: attributes,
          });
        },
    };
  },
});
