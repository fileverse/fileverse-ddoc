import Dexie from 'dexie';
import { Reminder } from '../../../package/extensions/reminder-block/types';

// Define the database schema
export class ReminderDatabase extends Dexie {
  reminders: Dexie.Table<Reminder, string>;

  constructor() {
    super('ReminderDatabase');
    this.version(1).stores({
      reminders: 'id, timestamp, status, walletAddress, createdAt'
    });
    this.reminders = this.table('reminders');
  }

  async addReminder(reminder: Reminder): Promise<string> {
    return this.reminders.add(reminder);
  }

  async updateReminder(reminder: Reminder): Promise<number> {
    return this.reminders.update(reminder.id, reminder);
  }

  async deleteReminder(reminderId: string): Promise<void> {
    return this.reminders.delete(reminderId);
  }

  async getAllReminders(): Promise<Reminder[]> {
    return this.reminders.toArray();
  }

  async getPendingReminders(): Promise<Reminder[]> {
    return this.reminders
      .where('status')
      .equals('pending')
      .toArray();
  }

  async getUpcomingReminders(): Promise<Reminder[]> {
    const now = Date.now();
    return this.reminders
      .where('status')
      .equals('pending')
      .and(reminder => reminder.timestamp > now)
      .sortBy('timestamp');
  }

  async getOverdueReminders(): Promise<Reminder[]> {
    const now = Date.now();
    return this.reminders
      .where('status')
      .equals('pending')
      .and(reminder => reminder.timestamp <= now)
      .sortBy('timestamp');
  }

  async getRemindersDue(from: number, to: number): Promise<Reminder[]> {
    return this.reminders
      .where('timestamp')
      .between(from, to, true, true)
      .and(reminder => reminder.status === 'pending')
      .toArray();
  }

  async markReminderAsCompleted(reminderId: string): Promise<number> {
    return this.reminders.update(reminderId, { status: 'completed' });
  }

  async markReminderAsCancelled(reminderId: string): Promise<number> {
    return this.reminders.update(reminderId, { status: 'cancelled' });
  }
}

// Singleton instance
const reminderDB = new ReminderDatabase();
export default reminderDB; 