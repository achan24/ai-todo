import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  TextField,
  IconButton,
  Box,
  Typography,
  Checkbox
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DoneIcon from '@mui/icons-material/Done';
import { Task } from '../types/task';

interface ExtractedTask {
  title: string;
  selected: boolean;
}

interface ExtractTasksDialogProps {
  open: boolean;
  onClose: () => void;
  aiMessage: string;
  onAddTasks: (tasks: Partial<Task>[]) => void;
}

export default function ExtractTasksDialog({ 
  open, 
  onClose, 
  aiMessage,
  onAddTasks 
}: ExtractTasksDialogProps) {
  // Parse initial tasks from AI message
  const parseTasksFromMessage = (message: string): ExtractedTask[] => {
    try {
      // First try to find lines starting with '-' or '•'
      const tasks = message.split('\n')
        .filter(line => {
          const trimmed = line.trim();
          return trimmed.startsWith('-') || trimmed.startsWith('•');
        })
        .map(line => ({
          title: line.replace(/^[-•]\s*/, '').trim(), // Remove bullet and whitespace
          selected: true
        }))
        .filter(task => task.title.length > 0); // Remove empty tasks
      
      // If no tasks found, try to find numbered lists (1., 2., etc)
      if (tasks.length === 0) {
        const numberedTasks = message.split('\n')
          .filter(line => /^\d+\.\s/.test(line.trim()))
          .map(line => ({
            title: line.replace(/^\d+\.\s*/, '').trim(),
            selected: true
          }))
          .filter(task => task.title.length > 0);
        
        return numberedTasks;
      }
      
      return tasks;
    } catch (error) {
      console.error('Error parsing tasks:', error);
      return [];
    }
  };

  const [tasks, setTasks] = useState<ExtractedTask[]>(() => {
    const parsedTasks = parseTasksFromMessage(aiMessage);
    console.log('Parsed tasks:', parsedTasks);
    return parsedTasks;
  });
  
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(tasks[index].title);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null) {
      setTasks(prev => prev.map((task, i) => 
        i === editingIndex ? { ...task, title: editValue } : task
      ));
      setEditingIndex(null);
    }
  };

  const handleToggleTask = (index: number) => {
    setTasks(prev => prev.map((task, i) => 
      i === index ? { ...task, selected: !task.selected } : task
    ));
  };

  const handleDeleteTask = (index: number) => {
    setTasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddSelected = () => {
    const selectedTasks = tasks
      .filter(task => task.selected)
      .map(task => ({
        title: task.title,
        completed: false
      }));

    if (selectedTasks.length > 0) {
      onAddTasks(selectedTasks);
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Extract Tasks</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Edit and select the tasks you want to add as subtasks
        </Typography>
        
        <List>
          {tasks.map((task, index) => (
            <ListItem 
              key={index}
              sx={{ 
                bgcolor: 'background.paper',
                borderRadius: 1,
                mb: 1,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Checkbox
                checked={task.selected}
                onChange={() => handleToggleTask(index)}
                size="small"
              />

              {editingIndex === index ? (
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                  />
                  <IconButton 
                    size="small"
                    onClick={handleSaveEdit}
                    color="primary"
                  >
                    <DoneIcon />
                  </IconButton>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, gap: 1 }}>
                  <Typography sx={{ flex: 1 }}>{task.title}</Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleStartEdit(index)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteTask(index)}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </ListItem>
          ))}
        </List>

        {tasks.length === 0 && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ textAlign: 'center', mt: 2 }}
          >
            No tasks found in the AI's response. Try asking for a task breakdown.
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleAddSelected}
          disabled={!tasks.some(t => t.selected)}
        >
          Add Selected Tasks
        </Button>
      </DialogActions>
    </Dialog>
  );
}
