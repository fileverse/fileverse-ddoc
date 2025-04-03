export interface Reminder {
  id: string;
  title: string;
  timestamp: number;
  createdAt: number;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface ReminderBlockOptions {
  onReminderCreate?: (reminder: Reminder) => void;
  onReminderDelete?: (reminderId: string) => void;
  onReminderUpdate?: (reminder: Reminder) => void;
  reminders?: Reminder[];
}

export interface ReminderMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateReminder: (reminder: Reminder) => void;
}
