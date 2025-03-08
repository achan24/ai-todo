'use client';

import { useState, useEffect } from 'react';
import { TagIcon, BellAlertIcon } from '@heroicons/react/24/solid';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Select, MenuItem, FormControl, InputLabel, Chip } from '@mui/material';

interface Metric {
  id: number;
  name: string;
  unit: string;
  current_value: number;
  target_value?: number;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  tags: string[];
  estimated_minutes?: number;
  metric_id?: number | null;
  contribution_value?: number;
  has_reminders?: boolean;
}

interface Reminder {
  id?: number;
  title: string;
  message?: string;
  reminder_time: string;
  reminder_type: 'one_time' | 'recurring_daily' | 'recurring_weekly' | 'recurring_monthly' | 'smart';
  task_id?: number;
}

interface EditTaskDialogProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (task: Task) => Promise<Task>;
  metrics?: Metric[];  // Made optional since not all tasks need metrics
}

export default function EditTaskDialog({ open, task, onClose, onSave, metrics = [] }: EditTaskDialogProps) {
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [newTag, setNewTag] = useState('');
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminder, setReminder] = useState<Reminder>({
    title: '',
    message: '',
    reminder_time: '',
    reminder_type: 'one_time'
  });

  // State to store existing reminders
  const [existingReminders, setExistingReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    setEditedTask(task);
    if (task?.metric_id && metrics.length > 0) {
      const metric = metrics.find(m => m.id === task.metric_id);
      setSelectedMetric(metric || null);
    } else {
      setSelectedMetric(null);
    }
    
    // Load existing reminders if the task has reminders
    if (task?.id && task?.has_reminders) {
      fetchReminders(task.id);
    } else {
      setExistingReminders([]);
    }
  }, [task, metrics]);
  
  // Function to fetch reminders for a task
  const fetchReminders = async (taskId: number) => {
    try {
      console.log(`Fetching reminders for task ${taskId}`);
      const response = await fetch(`http://localhost:8005/api/reminders/task/${taskId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch reminders: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched reminders:', data);
      setExistingReminders(data);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      setExistingReminders([]);
    }
  };

  if (!editedTask) return null;

  const handleSave = async () => {
    if (editedTask) {
      try {
        // Set has_reminders flag if we're adding a reminder
        const taskWithReminderFlag = {
          ...editedTask,
          has_reminders: showReminderForm && reminder.title && reminder.reminder_time ? true : editedTask.has_reminders
        };
        
        console.log('Saving task with data:', JSON.stringify(taskWithReminderFlag, null, 2));
        
        // First save the task to ensure we have a task ID
        const savedTask = await onSave(taskWithReminderFlag);
        console.log('Task saved:', savedTask);
        
        // If there's a reminder and the task has an ID, save the reminder
        if (showReminderForm && reminder.title && reminder.reminder_time) {
          // Use the editedTask.id if savedTask.id is not available
          const taskId = savedTask?.id || editedTask.id;
          console.log('Saving reminder for task ID:', taskId);
          
          if (taskId) {
            try {
              await saveReminder({
                ...reminder,
                task_id: taskId
              });
              console.log('Reminder saved successfully with task ID:', taskId);
            } catch (reminderError) {
              console.error('Error saving reminder:', reminderError);
            }
          } else {
            console.error('Cannot save reminder: No task ID available');
          }
        }
      } catch (error) {
        console.error('Error in handleSave:', error);
      }
      
      onClose();
    }
  };
  
  const saveReminder = async (reminderData: Reminder) => {
    try {
      // Ensure we have all required fields
      if (!reminderData.task_id || !reminderData.title || !reminderData.reminder_time) {
        console.error('Missing required fields for reminder:', reminderData);
        throw new Error('Missing required fields for reminder');
      }

      // Create a properly formatted reminder object that matches the backend schema
      const formattedReminderData = {
        title: reminderData.title,
        message: reminderData.message || 'Reminder',
        reminder_time: new Date(reminderData.reminder_time).toISOString(),
        reminder_type: 'one_time',
        task_id: reminderData.task_id
      };
      
      console.log('Sending reminder data:', formattedReminderData);
      const response = await fetch('http://localhost:8005/api/reminders/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedReminderData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Failed to save reminder: ${response.status} ${errorText}`);
      }
      
      const savedReminder = await response.json();
      console.log('Reminder saved successfully:', savedReminder);
      
      // Add the new reminder to the existingReminders state
      setExistingReminders(prev => [...prev, savedReminder]);
      
      // Update the task's has_reminders flag if needed
      if (editedTask && !editedTask.has_reminders) {
        // This is just for UI consistency - the actual update was done in handleSave
        setEditedTask({
          ...editedTask,
          has_reminders: true
        });
      }
      
      // Hide the reminder form after saving
      setShowReminderForm(false);
      
      // Reset reminder form
      setReminder({
        title: '',
        reminder_time: '',
        reminder_type: 'one_time'
      });
      setShowReminderForm(false);
      
    } catch (error) {
      console.error('Error saving reminder:', error);
      // You could add error handling UI here
    }
  };

  const handleAddTag = () => {
    if (newTag && editedTask) {
      setEditedTask({
        ...editedTask,
        tags: [...editedTask.tags, newTag]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (editedTask) {
      setEditedTask({
        ...editedTask,
        tags: editedTask.tags.filter(tag => tag !== tagToRemove)
      });
    }
  };
  
  // Function to delete a reminder
  const handleDeleteReminder = async (reminderId: number) => {
    try {
      const response = await fetch(`http://localhost:8005/api/reminders/${reminderId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete reminder: ${response.status}`);
      }
      
      console.log(`Reminder ${reminderId} deleted successfully`);
      
      // Update the list of existing reminders
      setExistingReminders(existingReminders.filter(r => r.id !== reminderId));
      
      // If no reminders left, update the task's has_reminders flag
      if (existingReminders.length <= 1 && editedTask) {
        setEditedTask({
          ...editedTask,
          has_reminders: false
        });
      }
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  const getHashColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editedTask.id ? 'Edit Task' : 'New Task'}</DialogTitle>
      <DialogContent>
        <div className="space-y-4 mt-4">
          <TextField
            fullWidth
            label="Title"
            value={editedTask.title}
            onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
          />
          
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={4}
            value={editedTask.description || ''}
            onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
          />

          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={editedTask.priority}
              label="Priority"
              onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value as 'high' | 'medium' | 'low' })}
            >
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            type="date"
            label="Due Date"
            value={editedTask.dueDate?.split('T')[0] || ''}
            onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            type="number"
            label="Estimated Minutes"
            value={editedTask.estimated_minutes || ''}
            onChange={(e) => setEditedTask({ ...editedTask, estimated_minutes: parseInt(e.target.value) || undefined })}
          />

          {metrics.length > 0 && (
            <div className="space-y-4">
              <FormControl fullWidth>
                <InputLabel>Associated Metric</InputLabel>
                <Select
                  value={editedTask.metric_id || ''}
                  label="Associated Metric"
                  onChange={(e) => {
                    const metricId = e.target.value as number;
                    const metric = metrics.find(m => m.id === metricId);
                    setSelectedMetric(metric || null);
                    setEditedTask({ 
                      ...editedTask, 
                      metric_id: metricId || null,
                      contribution_value: undefined
                    });
                  }}
                >
                  <MenuItem value="">None</MenuItem>
                  {metrics.map((metric) => (
                    <MenuItem key={metric.id} value={metric.id}>
                      {metric.name} ({metric.unit})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedMetric && (
                <TextField
                  fullWidth
                  type="number"
                  label={`Contribution (${selectedMetric.unit})`}
                  value={editedTask.contribution_value || ''}
                  onChange={(e) => setEditedTask({
                    ...editedTask,
                    contribution_value: parseFloat(e.target.value) || undefined
                  })}
                />
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex gap-2">
              <TextField
                fullWidth
                label="Add Tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={handleAddTag}
                disabled={!newTag}
                startIcon={<TagIcon className="h-5 w-5" />}
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {editedTask.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  style={{
                    backgroundColor: getHashColor(tag),
                    color: 'white'
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Reminder Section */}
          <div className="mt-6">
            {!showReminderForm ? (
              <Button
                variant="outlined"
                startIcon={<BellAlertIcon className="h-5 w-5" />}
                onClick={() => setShowReminderForm(true)}
              >
                Add Reminder
              </Button>
            ) : (
              <div className="space-y-4 p-4 border border-gray-200 rounded-md">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Set Reminder</h3>
                  <Button 
                    size="small" 
                    onClick={() => setShowReminderForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
                
                <TextField
                  fullWidth
                  label="Reminder Title"
                  value={reminder.title}
                  onChange={(e) => setReminder({ ...reminder, title: e.target.value })}
                />
                
                <TextField
                  fullWidth
                  label="Message (Optional)"
                  multiline
                  rows={2}
                  value={reminder.message || ''}
                  onChange={(e) => setReminder({ ...reminder, message: e.target.value })}
                />
                
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Reminder Time"
                  value={reminder.reminder_time}
                  onChange={(e) => setReminder({ ...reminder, reminder_time: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
                
                <FormControl fullWidth>
                  <InputLabel>Reminder Type</InputLabel>
                  <Select
                    value={reminder.reminder_type}
                    label="Reminder Type"
                    onChange={(e) => setReminder({ 
                      ...reminder, 
                      reminder_type: e.target.value as 'one_time' | 'recurring_daily' | 'recurring_weekly' | 'recurring_monthly' | 'smart'
                    })}
                  >
                    <MenuItem value="one_time">One Time</MenuItem>
                    <MenuItem value="recurring_daily">Daily</MenuItem>
                    <MenuItem value="recurring_weekly">Weekly</MenuItem>
                    <MenuItem value="recurring_monthly">Monthly</MenuItem>
                    <MenuItem value="smart">Smart (AI-determined)</MenuItem>
                  </Select>
                </FormControl>
              </div>
            )}
            
            {/* Display existing reminders */}
            {existingReminders.length > 0 && (
              <div className="mt-4 space-y-3">
                <h3 className="text-md font-medium">Existing Reminders</h3>
                {existingReminders.map((rem) => (
                  <div key={rem.id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-medium">{rem.title}</h5>
                        {rem.message && <p className="text-sm text-gray-600">{rem.message}</p>}
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <span className="mr-2">
                            {new Date(rem.reminder_time).toLocaleString()}
                          </span>
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                            {rem.reminder_type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <Button 
                        size="small" 
                        color="error" 
                        onClick={() => handleDeleteReminder(rem.id!)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
