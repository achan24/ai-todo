'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Divider } from '@mui/material';
import ReminderList from './ReminderList';

interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  tags: string[];
  estimated_minutes?: number;
  has_reminders?: boolean;
}

interface TaskDetailProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
}

export default function TaskDetail({ open, task, onClose }: TaskDetailProps) {
  if (!task) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <div className="flex justify-between items-center">
          <Typography variant="h6">{task.title}</Typography>
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            task.priority === 'high' ? 'bg-red-100 text-red-800' :
            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {task.priority}
          </div>
        </div>
      </DialogTitle>
      <DialogContent>
        <div className="space-y-6">
          {task.description && (
            <div>
              <Typography variant="subtitle1" fontWeight="bold">Description</Typography>
              <Typography variant="body1">{task.description}</Typography>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            {task.tags.map((tag) => (
              <div 
                key={tag} 
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {task.dueDate && (
              <div>
                <Typography variant="subtitle2" color="text.secondary">Due Date</Typography>
                <Typography variant="body2">{new Date(task.dueDate).toLocaleDateString()}</Typography>
              </div>
            )}
            
            {task.estimated_minutes && (
              <div>
                <Typography variant="subtitle2" color="text.secondary">Estimated Time</Typography>
                <Typography variant="body2">{task.estimated_minutes} minutes</Typography>
              </div>
            )}
          </div>
          
          <Divider />
          
          {/* Reminders Section */}
          <div className="mt-4">
            <ReminderList taskId={task.id} />
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
