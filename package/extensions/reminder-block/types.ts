export interface Reminder {
  id: string;
  title: string;
  timestamp: number;
  createdAt: number;
  status: 'pending' | 'completed' | 'cancelled';
  walletAddress?: string;
}

export interface ReminderBlockOptions {
  onReminderCreate?: (reminder: Reminder) => Promise<void>;
  onReminderDelete?: (reminderId: string) => Promise<void>;
  onReminderUpdate?: (reminder: Reminder) => Promise<void>;
  reminders?: Reminder[];
}

export interface ReminderMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateReminder: (reminder: Reminder) => void;
}
