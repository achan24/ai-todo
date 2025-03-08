import config from '@/config/config';

export interface Reminder {
  id: number;
  title: string;
  message?: string;
  reminder_time: string;
  reminder_type: 'one_time' | 'recurring_daily' | 'recurring_weekly' | 'recurring_monthly' | 'smart';
  status: 'pending' | 'sent' | 'dismissed';
  task_id: number;
}

class NotificationService {
  private checkInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(reminder: Reminder) => void> = [];
  private lastCheckedTime: Date = new Date();
  private notifiedReminderIds: Set<number> = new Set();

  constructor() {
    // Initialize with any previously notified IDs from localStorage
    try {
      const savedIds = localStorage.getItem('notifiedReminderIds');
      if (savedIds) {
        this.notifiedReminderIds = new Set(JSON.parse(savedIds));
      }
    } catch (error) {
      console.error('Error loading notified reminder IDs:', error);
    }
  }

  /**
   * Start checking for pending reminders at regular intervals
   */
  startChecking(intervalMs: number = 60000) { // Default: check every minute
    if (this.checkInterval) {
      this.stopChecking();
    }

    this.checkInterval = setInterval(() => {
      this.checkForPendingReminders();
    }, intervalMs);

    // Also check immediately
    this.checkForPendingReminders();
  }

  /**
   * Stop checking for pending reminders
   */
  stopChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Add a listener to be notified when a reminder is due
   */
  addListener(callback: (reminder: Reminder) => void) {
    this.listeners.push(callback);
    return () => {
      this.removeListener(callback);
    };
  }

  /**
   * Remove a listener
   */
  removeListener(callback: (reminder: Reminder) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Check for pending reminders that are due
   */
  private async checkForPendingReminders() {
    try {
      const response = await fetch(`${config.apiUrl}/api/reminders/pending`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch pending reminders: ${response.status}`);
      }
      
      const reminders: Reminder[] = await response.json();
      
      // Notify for each reminder that we haven't already notified about
      reminders.forEach(reminder => {
        if (!this.notifiedReminderIds.has(reminder.id)) {
          this.notifyReminder(reminder);
          this.notifiedReminderIds.add(reminder.id);
          
          // Save to localStorage
          localStorage.setItem('notifiedReminderIds', 
            JSON.stringify(Array.from(this.notifiedReminderIds)));
          
          // Mark as sent on the server
          this.markReminderAsSent(reminder.id);
        }
      });
      
      this.lastCheckedTime = new Date();
    } catch (error) {
      console.error('Error checking for pending reminders:', error);
    }
  }

  /**
   * Notify all listeners about a due reminder
   */
  private notifyReminder(reminder: Reminder) {
    // Try to use the browser's Notification API if available and permitted
    this.showBrowserNotification(reminder);
    
    // Also notify all registered listeners
    this.listeners.forEach(listener => {
      try {
        listener(reminder);
      } catch (error) {
        console.error('Error in reminder listener:', error);
      }
    });
  }

  /**
   * Show a browser notification if possible
   */
  private async showBrowserNotification(reminder: Reminder) {
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(reminder.title, {
        body: reminder.message || 'Reminder for your task',
        icon: '/favicon.ico'
      });
      
      notification.onclick = () => {
        window.focus();
        // Navigate to the task if possible
        if (reminder.task_id) {
          // Find the goal containing this task and navigate to it
          // This would need to be implemented based on your app's routing
        }
      };
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.showBrowserNotification(reminder);
      }
    }
  }

  /**
   * Mark a reminder as sent on the server
   */
  private async markReminderAsSent(reminderId: number) {
    try {
      await fetch(`${config.apiUrl}/api/reminders/${reminderId}/sent`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error marking reminder as sent:', error);
    }
  }

  /**
   * Dismiss a reminder
   */
  async dismissReminder(reminderId: number) {
    try {
      const response = await fetch(`${config.apiUrl}/api/reminders/${reminderId}/dismiss`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to dismiss reminder');
      }
      
      return true;
    } catch (error) {
      console.error('Error dismissing reminder:', error);
      return false;
    }
  }
}

// Export as a singleton
export const notificationService = new NotificationService();
export default notificationService;
