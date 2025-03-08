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
  private notificationSound: HTMLAudioElement | null = null;
  private isInitialized: boolean = false;
  private userHasInteracted: boolean = false;
  private pendingSounds: number = 0;

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
    
    // Initialize the service when the browser is ready
    if (typeof window !== 'undefined') {
      // Create notification sound
      this.createNotificationSound();
      
      // Initialize on page load
      if (document.readyState === 'complete') {
        this.initialize();
      } else {
        window.addEventListener('load', () => this.initialize());
      }
      
      // Re-initialize when the page becomes visible again
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          console.log('Page became visible, checking for reminders...');
          this.checkForPendingReminders();
        }
      });
      
      // Listen for user interactions to enable sound
      document.addEventListener('click', () => {
        this.userHasInteracted = true;
        // Try to play any pending sounds
        if (this.pendingSounds > 0) {
          this.playNotificationSoundWithUserInteraction();
        }
      });
    }
  }

  /**
   * Initialize the notification service
   */
  private initialize() {
    if (this.isInitialized) return;
    
    console.log('Initializing notification service...');
    this.startChecking();
    this.requestNotificationPermission();
    this.isInitialized = true;
  }
  
  /**
   * Create the notification sound element
   */
  private createNotificationSound() {
    try {
      // Use the new, better notification sound
      this.notificationSound = new Audio('/notification-new.mp3');
      this.notificationSound.preload = 'auto';
      this.notificationSound.volume = 0.7; // Set volume to 70% for a more pleasant experience
      
      // If the file doesn't exist, fall back to the original sound
      this.notificationSound.addEventListener('error', () => {
        console.log('New notification sound file not found, trying original sound');
        try {
          this.notificationSound = new Audio('/notification.mp3');
          this.notificationSound.preload = 'auto';
        } catch (err) {
          console.log('Original notification sound file not found, using fallback sound');
          this.notificationSound = null;
        }
      });
    } catch (error) {
      console.error('Error creating notification sound:', error);
    }
  }
  
  /**
   * Play a notification sound
   */
  private playNotificationSound() {
    // Increment pending sounds counter
    this.pendingSounds++;
    
    // Try to vibrate the device if supported (mobile)
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
        console.log('Device vibrated for notification');
      }
    } catch (error) {
      console.error('Error with vibration feedback:', error);
    }
    
    // If the user has interacted with the page, we can play sound
    if (this.userHasInteracted) {
      this.playNotificationSoundWithUserInteraction();
    } else {
      console.log('Audio notification queued - waiting for user interaction');
    }
  }
  
  /**
   * Play notification sound after user interaction
   */
  private playNotificationSoundWithUserInteraction() {
    try {
      if (this.pendingSounds <= 0) return;
      
      if (this.notificationSound) {
        // Reset the sound to the beginning and play it
        this.notificationSound.currentTime = 0;
        
        // Create a short fade-in effect for a smoother sound experience
        const originalVolume = this.notificationSound.volume || 0.7;
        this.notificationSound.volume = 0.1; // Start at low volume
        
        this.notificationSound.play()
          .then(() => {
            // Gradually increase volume for a nicer experience
            setTimeout(() => { this.notificationSound!.volume = 0.4; }, 50);
            setTimeout(() => { this.notificationSound!.volume = originalVolume; }, 100);
            
            console.log('Notification sound played successfully');
            this.pendingSounds = 0; // Reset counter after successful playback
          })
          .catch(err => {
            console.error('Error playing notification sound:', err);
            this.playFallbackSound();
          });
      } else {
        this.playFallbackSound();
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
      this.playFallbackSound();
    }
  }
  
  /**
   * Play a fallback notification sound using Web Audio API
   * Creates a more pleasant, gentle notification sound
   */
  private playFallbackSound() {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a more complex sound with multiple oscillators for a pleasant chime
      const mainOscillator = audioContext.createOscillator();
      const secondOscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Connect everything
      mainOscillator.connect(gainNode);
      secondOscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure oscillators for a pleasant sound
      mainOscillator.type = 'sine';
      secondOscillator.type = 'sine';
      
      // First note is higher
      mainOscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
      secondOscillator.frequency.setValueAtTime(1320, audioContext.currentTime); // E6
      
      // Gentle fade in and out
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.3);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
      
      // Start and stop the oscillators
      mainOscillator.start(audioContext.currentTime);
      secondOscillator.start(audioContext.currentTime + 0.05);
      
      mainOscillator.stop(audioContext.currentTime + 0.5);
      secondOscillator.stop(audioContext.currentTime + 0.5);
      
      // Clean up
      setTimeout(() => {
        audioContext.close();
      }, 600);
    } catch (error) {
      console.error('Error playing fallback sound:', error);
    }
  }
  
  /**
   * Request notification permission if not already granted
   */
  private async requestNotificationPermission() {
    if (!('Notification' in window)) return;
    
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      await Notification.requestPermission();
    }
  }

  /**
   * Start checking for pending reminders at regular intervals
   */
  startChecking(intervalMs: number = 10000) { // Check every 10 seconds for more immediate notifications
    if (this.checkInterval) {
      this.stopChecking();
    }

    this.checkInterval = setInterval(() => {
      this.checkForPendingReminders();
    }, intervalMs);

    // Also check immediately
    this.checkForPendingReminders();
    console.log('Started checking for reminders every', intervalMs / 1000, 'seconds');
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
      // Get current time to compare with reminder times
      const now = new Date();
      console.log(`Checking for pending reminders at ${now.toISOString()}...`);
      
      const response = await fetch(`${config.apiUrl}/api/reminders/pending`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch pending reminders: ${response.status}`);
      }
      
      const reminders: Reminder[] = await response.json();
      console.log('Found pending reminders:', reminders.length);
      
      if (reminders.length > 0) {
        console.log('Reminder times:', reminders.map(r => r.reminder_time).join(', '));
      }
      
      // Notify for each reminder that we haven't already notified about
      reminders.forEach(reminder => {
        // Check if we've already notified about this reminder
        if (!this.notifiedReminderIds.has(reminder.id)) {
          console.log(`Processing new reminder: ${reminder.id} - ${reminder.title} - ${reminder.reminder_time}`);
          
          // Notify immediately
          this.notifyReminder(reminder);
          this.notifiedReminderIds.add(reminder.id);
          
          // Save to localStorage
          localStorage.setItem('notifiedReminderIds', 
            JSON.stringify(Array.from(this.notifiedReminderIds)));
          
          // Mark as sent on the server
          this.markReminderAsSent(reminder.id);
        }
      });
      
      this.lastCheckedTime = now;
    } catch (error) {
      console.error('Error checking for pending reminders:', error);
    }
  }

  /**
   * Notify all listeners about a due reminder
   */
  private notifyReminder(reminder: Reminder) {
    console.log('Notifying about reminder:', reminder.title);
    
    // Play notification sound
    this.playNotificationSound();
    
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
      // Format the time for display
      const reminderTime = new Date(reminder.reminder_time);
      const timeString = reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Create a notification with more detailed information
      const notification = new Notification(`${reminder.title} (${timeString})`, {
        body: reminder.message || 'Reminder for your task',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `reminder-${reminder.id}`, // Prevents duplicate notifications
        requireInteraction: true // Keep notification visible until user interacts with it
      } as NotificationOptions);
      
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

  /**
   * Get all reminders for a specific task
   */
  async getRemindersForTask(taskId: number): Promise<Reminder[]> {
    try {
      const response = await fetch(`${config.apiUrl}/api/reminders/task/${taskId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reminders for task: ${response.status}`);
      }
      
      const reminders: Reminder[] = await response.json();
      return reminders;
    } catch (error) {
      console.error(`Error fetching reminders for task ${taskId}:`, error);
      return [];
    }
  }
}

// Export as a singleton
export const notificationService = new NotificationService();
export default notificationService;
