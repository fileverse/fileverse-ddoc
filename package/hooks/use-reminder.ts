import { useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import { Reminder } from '../extensions/reminder-block/types';

interface UseReminderProps {
  editor: Editor;
  onReminderCreate?: (reminder: Reminder) => Promise<void>;
  onError?: (errorString: string) => void;
}

export const useReminder = ({
  editor,
  onReminderCreate,
  onError,
}: UseReminderProps) => {
  const [initialReminderTitle, setInitialReminderTitle] = useState<string>('');
  const reminderRef = useRef<HTMLDivElement>(null);

  const handleReminderOnClose = () => {
    // Close popup using ref
    if (reminderRef.current?.parentElement) {
      // Find and close the nearest popover/dropdown container
      const popoverContent = reminderRef.current.closest('[role="dialog"]');
      if (popoverContent) {
        popoverContent.remove();
      }
    }
    if (setInitialReminderTitle) {
      setInitialReminderTitle('');
    }
  };

  const handleReminderCreate = async (reminder: Reminder) => {
    try {
      // Add reminder to editor
      editor
        .chain()
        .focus()
        .setReminderBlock({
          id: reminder.id,
          reminder: reminder,
        })
        .run();

      // Delegate to consumer app for notification handling
      if (onReminderCreate) {
        await onReminderCreate(reminder);
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
      if (onError) {
        onError('Failed to create reminder');
      }
    }
  };

  return {
    reminderRef,
    handleReminderOnClose,
    handleReminderCreate,
    initialReminderTitle,
    setInitialReminderTitle,
  };
};
