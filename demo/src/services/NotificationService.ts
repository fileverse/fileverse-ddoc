import { Reminder } from '../../../package/extensions/reminder-block/types';
import reminderDB from './ReminderDB';

// Extended notification options with additional properties
interface ExtendedNotificationOptions extends NotificationOptions {
  actions?: {
    action: string;
    title: string;
  }[];
  vibrate?: number[];
  requireInteraction?: boolean;
}

class NotificationService {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private permissionStatus: NotificationPermission = 'default';
  private isInitialized = false;
  private checkInterval: number | null = null;
  private readonly CHECK_INTERVAL_MS = 60000; // Check for due reminders every minute

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Check notification permission
      this.permissionStatus = Notification.permission;
      if (this.permissionStatus !== 'granted') {
        console.log('Notification permission not granted.');
        return false;
      }

      // Check for service worker
      if (!('serviceWorker' in navigator)) {
        console.error('Service Worker not supported in this browser');
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        console.error('Service Worker not registered');
        return false;
      }

      this.serviceWorkerRegistration = registration;
      this.isInitialized = true;
      
      // Start checking for due reminders
      this.startPeriodicCheck();
      
      console.log('Notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing notification service:', error);
      return false;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    try {
      this.permissionStatus = await Notification.requestPermission();
      return this.permissionStatus;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  startPeriodicCheck(): void {
    // Clear any existing interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Start new interval
    this.checkInterval = window.setInterval(() => {
      this.checkDueReminders();
    }, this.CHECK_INTERVAL_MS);

    // Also check immediately
    this.checkDueReminders();
  }

  stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async checkDueReminders(): Promise<void> {
    try {
      // Only proceed if service is initialized
      if (!this.isInitialized || !this.serviceWorkerRegistration) {
        console.log('Notification service not initialized, skipping reminder check');
        return;
      }

      const now = Date.now();
      // Look for reminders due in the last minute up to now
      // This gives us some buffer in case the check was delayed
      const lookbackTime = now - this.CHECK_INTERVAL_MS;
      
      const dueReminders = await reminderDB.getRemindersDue(lookbackTime, now);
      
      console.log(`Found ${dueReminders.length} due reminders`);
      
      // Send notification for each due reminder
      for (const reminder of dueReminders) {
        await this.sendReminderNotification(reminder);
        
        // Mark reminder as completed
        await reminderDB.markReminderAsCompleted(reminder.id);
      }
    } catch (error) {
      console.error('Error checking due reminders:', error);
    }
  }

  async sendReminderNotification(reminder: Reminder): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      console.error('Service Worker registration not available');
      return;
    }

    if (this.permissionStatus !== 'granted') {
      console.error('Notification permission not granted');
      return;
    }

    try {
      await this.serviceWorkerRegistration.showNotification(`Reminder: ${reminder.title}`, {
        body: reminder.title,
        icon: '/icons/apple-icon.png',
        badge: '/icons/apple-icon.png',
        tag: `reminder-${reminder.id}`,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: {
          reminderId: reminder.id,
          timestamp: reminder.timestamp,
          url: window.location.href
        },
        actions: [
          {
            action: 'view',
            title: 'View Document'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      } as ExtendedNotificationOptions);
      
      console.log(`Notification sent for reminder: ${reminder.id}`);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Can be used to send an immediate test notification
  async sendTestNotification(title: string, body: string): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      console.error('Service Worker registration not available');
      return;
    }

    if (this.permissionStatus !== 'granted') {
      console.error('Notification permission not granted');
      return;
    }

    try {
      await this.serviceWorkerRegistration.showNotification(title, {
        body,
        icon: '/icons/apple-icon.png',
        tag: 'test-notification',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: {
          url: window.location.href
        },
        actions: [
          {
            action: 'view',
            title: 'View'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      } as ExtendedNotificationOptions);
      
      console.log('Test notification sent');
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }
  
  // Helper method to schedule a notification for a specific reminder
  async scheduleReminderNotification(reminder: Reminder): Promise<void> {
    // Store the reminder in the database
    await reminderDB.addReminder(reminder);
    
    console.log(`Scheduled notification for reminder: ${reminder.id} at ${new Date(reminder.timestamp).toLocaleString()}`);
    
    // If the reminder is due very soon (in the next minute),
    // schedule a timeout to trigger the notification
    const timeUntilDue = reminder.timestamp - Date.now();
    if (timeUntilDue <= this.CHECK_INTERVAL_MS && timeUntilDue > 0) {
      setTimeout(() => {
        this.sendReminderNotification(reminder)
          .then(() => reminderDB.markReminderAsCompleted(reminder.id))
          .catch(console.error);
      }, timeUntilDue);
    }
  }
}

// Create a singleton instance
const notificationService = new NotificationService();
export default notificationService; 