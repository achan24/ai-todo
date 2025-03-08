'use client';

import { useState, useEffect } from 'react';
import { BellAlertIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Card, CardContent, Typography, Button, IconButton } from '@mui/material';
import notificationService, { Reminder } from '@/services/NotificationService';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Reminder[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Start checking for reminders
    notificationService.startChecking();

    // Add a listener for new reminders
    const unsubscribe = notificationService.addListener((reminder) => {
      setNotifications(prev => [...prev, reminder]);
      // Auto-open the notification center when a new reminder comes in
      setIsOpen(true);
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
    return date.toLocaleString();
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Bell icon with count */}
      <div 
        className="bg-amber-500 text-white rounded-full p-2 cursor-pointer shadow-lg mb-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="relative">
          <BellAlertIcon className="h-6 w-6" />
          {notifications.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {notifications.length}
            </span>
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
