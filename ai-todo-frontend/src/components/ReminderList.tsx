'use client';

import { useState, useEffect } from 'react';
import { BellAlertIcon, TrashIcon } from '@heroicons/react/24/solid';
import { Card, CardContent, Typography, Button, Chip, CircularProgress } from '@mui/material';

interface Reminder {
  id: number;
  title: string;
  message?: string;
  reminder_time: string;
  reminder_type: 'one_time' | 'recurring_daily' | 'recurring_weekly' | 'recurring_monthly' | 'smart';
  status: 'pending' | 'sent' | 'dismissed';
  task_id: number;
}

interface ReminderListProps {
  taskId: number;
}

export default function ReminderList({ taskId }: ReminderListProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskId) {
      console.log('Fetching reminders for task ID:', taskId);
      fetchReminders();
    }
  }, [taskId]);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      console.log(`Fetching reminders from: http://localhost:8005/api/reminders/task/${taskId}`);
      const response = await fetch(`http://localhost:8005/api/reminders/task/${taskId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Failed to fetch reminders: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Reminders fetched:', data);
      setReminders(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      setError('Failed to load reminders. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const dismissReminder = async (reminderId: number) => {
    try {
      const response = await fetch(`http://localhost:8005/api/reminders/${reminderId}/dismiss`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to dismiss reminder');
      }
      
      // Update the local state
      setReminders(reminders.map(reminder => 
        reminder.id === reminderId 
          ? { ...reminder, status: 'dismissed' as const } 
          : reminder
      ));
    } catch (error) {
      console.error('Error dismissing reminder:', error);
      setError('Failed to dismiss reminder. Please try again.');
    }
  };

  const deleteReminder = async (reminderId: number) => {
    try {
      const response = await fetch(`http://localhost:8005/api/reminders/${reminderId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete reminder');
      }
      
      // Remove from local state
      setReminders(reminders.filter(reminder => reminder.id !== reminderId));
    } catch (error) {
      console.error('Error deleting reminder:', error);
      setError('Failed to delete reminder. Please try again.');
    }
  };

  const formatReminderTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString();
  };

  const getReminderTypeLabel = (type: string) => {
    switch (type) {
      case 'one_time': return 'One Time';
      case 'recurring_daily': return 'Daily';
      case 'recurring_weekly': return 'Weekly';
      case 'recurring_monthly': return 'Monthly';
      case 'smart': return 'Smart';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'primary';
      case 'sent': return 'success';
      case 'dismissed': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <CircularProgress size={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <p>{error}</p>
        <Button variant="outlined" size="small" onClick={fetchReminders}>
          Retry
        </Button>
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-center">
        <BellAlertIcon className="h-6 w-6 mx-auto mb-2" />
        <p>No reminders set for this task</p>
        <Button 
          variant="outlined" 
          size="small" 
          onClick={() => fetchReminders()} 
          className="mt-2"
        >
          Refresh Reminders
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Typography variant="h6" className="flex items-center gap-2">
        <BellAlertIcon className="h-5 w-5" />
        Reminders
      </Typography>
      
      {reminders.map((reminder) => (
        <Card key={reminder.id} variant="outlined" className="relative">
          <CardContent>
            <div className="flex justify-between">
              <div>
                <Typography variant="subtitle1" fontWeight="bold">
                  {reminder.title}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" className="mt-1">
                  {formatReminderTime(reminder.reminder_time)}
                </Typography>
                
                {reminder.message && (
                  <Typography variant="body2" className="mt-2">
                    {reminder.message}
                  </Typography>
                )}
                
                <div className="mt-2 space-x-2">
                  <Chip 
                    size="small" 
                    label={getReminderTypeLabel(reminder.reminder_type)} 
                    color="primary" 
                    variant="outlined"
                  />
                  <Chip 
                    size="small" 
                    label={reminder.status} 
                    color={getStatusColor(reminder.status) as any}
                  />
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                {reminder.status === 'pending' && (
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => dismissReminder(reminder.id)}
                  >
                    Dismiss
                  </Button>
                )}
                <Button 
                  size="small" 
                  color="error"
                  startIcon={<TrashIcon className="h-4 w-4" />}
                  onClick={() => deleteReminder(reminder.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
