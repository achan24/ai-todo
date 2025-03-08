'use client';

import { useState, useEffect } from 'react';
import { BellAlertIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Card, CardContent, Typography, Button, IconButton } from '@mui/material';
import notificationService, { Reminder } from '@/services/NotificationService';
import config from '@/config/config';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Reminder[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch existing pending reminders on component mount
  const fetchPendingReminders = async () => {
    try {
      console.log('Fetching pending reminders for NotificationCenter...');
      const response = await fetch(`${config.apiUrl}/api/reminders/pending`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch pending reminders: ${response.status}`);
      }
      
      const reminders: Reminder[] = await response.json();
      console.log('Found pending reminders for NotificationCenter:', reminders.length);
      
      if (reminders.length > 0) {
        setNotifications(reminders);
      }
    } catch (error) {
      console.error('Error fetching pending reminders:', error);
    }
  };

  useEffect(() => {
    // Fetch existing reminders immediately
    fetchPendingReminders();
    
    // Start checking for reminders
    notificationService.startChecking(15000); // Check every 15 seconds

    // Add a listener for new reminders
    const unsubscribe = notificationService.addListener((reminder) => {
      // Check if this reminder is already in our list
      setNotifications(prev => {
        if (prev.some(r => r.id === reminder.id)) {
          return prev;
        }
        // Auto-open the notification center when a new reminder comes in
        setIsOpen(true);
        return [...prev, reminder];
      });
    });

    // Clean up on unmount
    return () => {
      notificationService.stopChecking();
      unsubscribe();
    };
  }, []);

  const dismissReminder = async (reminderId: number) => {
    const success = await notificationService.dismissReminder(reminderId);
    if (success) {
      setNotifications(notifications.filter(n => n.id !== reminderId));
    }
  };

  const dismissAll = async () => {
    const promises = notifications.map(n => notificationService.dismissReminder(n.id));
    await Promise.all(promises);
    setNotifications([]);
    setIsOpen(false);
  };

  const formatReminderTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  // Find the next upcoming reminder
  const getNextReminder = () => {
    if (notifications.length === 0) return null;
    
    // Sort reminders by time
    const sortedReminders = [...notifications].sort((a, b) => {
      return new Date(a.reminder_time).getTime() - new Date(b.reminder_time).getTime();
    });
    
    return sortedReminders[0];
  };
  
  const nextReminder = getNextReminder();

  // Always render the component, even with no notifications
  // This ensures the bell icon is always visible

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Bell icon with count and next reminder info */}
      <div className="flex items-center">
        {/* Next reminder preview (visible on hover or when there are notifications) */}
        {nextReminder && (
          <div 
            className={`mr-3 bg-white text-gray-800 rounded-lg p-2 shadow-lg transition-all duration-300 ${isOpen ? 'opacity-0' : 'opacity-100'}`}
            style={{ 
              boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
              maxWidth: '200px'
            }}
          >
            <div className="text-xs font-semibold text-amber-600">Next reminder:</div>
            <div className="text-sm font-bold truncate">{nextReminder.title}</div>
            <div className="text-xs">{formatReminderTime(nextReminder.reminder_time)}</div>
          </div>
        )}
        
        {/* Bell icon with hover effect to show reminders */}
        <div 
          className={`group relative bg-amber-500 text-white rounded-full p-3 cursor-pointer shadow-lg hover:bg-amber-600 transition-colors duration-200 ${notifications.length > 0 ? 'animate-pulse-slow' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          style={{ boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)', display: notifications.length > 0 ? 'block' : 'none' }}
        >
          <div className="relative">
            <BellAlertIcon className="h-7 w-7" />
            {notifications.length > 0 ? (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                {notifications.length}
              </span>
            ) : (
              <span className="absolute -top-2 -right-2 bg-gray-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                0
              </span>
            )}
          </div>
          
          {/* Hover preview of reminders */}
          {notifications.length > 0 && !isOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg overflow-hidden z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="bg-amber-500 text-white p-2">
                <p className="text-sm font-bold">Pending Reminders ({notifications.length})</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.slice(0, 3).map((notification) => (
                  <div key={notification.id} className="p-2 border-b border-gray-100">
                    <p className="text-sm font-semibold truncate">{notification.title}</p>
                    <p className="text-xs text-gray-500">{formatReminderTime(notification.reminder_time)}</p>
                  </div>
                ))}
                {notifications.length > 3 && (
                  <div className="p-2 text-xs text-center text-gray-500">
                    + {notifications.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification panel */}
      {isOpen && (
        <Card className="shadow-xl w-80 max-h-96 overflow-y-auto">
          <div className="bg-amber-500 text-white p-2 flex justify-between items-center">
            <Typography variant="subtitle1" fontWeight="bold">
              Reminders ({notifications.length})
            </Typography>
            <div className="flex space-x-1">
              <Button 
                size="small" 
                variant="text" 
                color="inherit"
                onClick={dismissAll}
              >
                Dismiss All
              </Button>
              <IconButton 
                size="small" 
                color="inherit"
                onClick={() => setIsOpen(false)}
              >
                <XMarkIcon className="h-5 w-5" />
              </IconButton>
            </div>
          </div>
          <CardContent className="p-0">
            <div className="divide-y">
              {notifications.map((notification) => (
                <div key={notification.id} className="p-3 hover:bg-gray-50">
                  <div className="flex justify-between">
                    <div>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {notification.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatReminderTime(notification.reminder_time)}
                      </Typography>
                      {notification.message && (
                        <Typography variant="body2" className="mt-1">
                          {notification.message}
                        </Typography>
                      )}
                    </div>
                    <IconButton 
                      size="small" 
                      onClick={() => dismissReminder(notification.id)}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
