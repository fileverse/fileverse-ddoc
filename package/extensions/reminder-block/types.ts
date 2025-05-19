import React from 'react';
export interface Reminder {
  id: string;
  title: string;
  timestamp: string;
  createdAt: string;
  status: 'pending' | 'completed' | 'cancelled';
  walletAddress?: string;
}

export interface ReminderBlockOptions {
  onReminderCreate?: (reminder: Reminder, type: string) => Promise<void>;
  onReminderDelete?: (reminderId: string) => Promise<void>;
  onReminderUpdate?: (reminder: Reminder) => Promise<void>;
  reminders?: Reminder[];
}

export interface ReminderMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateReminder: (reminder: Reminder, type: string) => void;
  initialReminderTitle?: string;
  type: 'inline' | 'slash';
  setInitialReminderTitle: React.Dispatch<React.SetStateAction<string>>;
}
