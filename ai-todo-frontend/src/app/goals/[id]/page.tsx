'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PencilIcon, TrashIcon, TagIcon, ClockIcon } from '@heroicons/react/24/solid';
import AddIcon from '@mui/icons-material/Add';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  Grid,
  List,
  ListItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  MenuItem,
} from '@mui/material';

interface Task {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  due_date: string | null;
  created_at: string;
  updated_at: string;
  tags: string[];
  estimated_minutes: number | null;
  user_id: number;
  parent_id: number | null;
  goal_id: number | null;
  subtasks: Task[];
  completion_time: string | null;
  completion_order: number | null;
}

interface Metric {
  id?: number;
  name: string;
  description: string;
  type: 'target' | 'process';
  unit: string;
  target_value: number;
  current_value: number;
}

interface Goal {
  id: number;
  title: string;
  description: string;
  metrics: Metric[];
}

interface TaskItemProps {
  task: Task;
  level?: number;
  onDragStart: (e: React.DragEvent, taskId: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, taskId: number) => void;
  onToggleComplete: (taskId: number, currentStatus: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number, title: string) => void;
}

const TaskItem = ({ 
  task, 
  level = 0,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onToggleComplete,
  onEdit,
  onDelete
}: TaskItemProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  return (
    <>
      <li 
        key={task.id} 
        className={`task-item relative hover:bg-gray-50 cursor-move ${level === 0 ? 'px-4 py-4 sm:px-6' : 'px-3 py-2 sm:px-4'}`}
        draggable
        onDragStart={(e) => onDragStart(e, task.id)}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, task.id)}
      >
        {/* Hover highlight that extends full width */}
        <div className="absolute inset-0 hover:bg-gray-50 -z-10" />
        
        {/* Indentation line for subtasks */}
        {level > 0 && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-px bg-gray-200" 
            style={{ left: `${level * 2 - 0.5}rem` }}
          />
        )}

        <div className="flex items-center justify-between" style={{ marginLeft: `${level * 2}rem` }}>
          <div className="flex items-center space-x-3">
            {hasSubtasks && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700"
              >
                {isCollapsed ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => onToggleComplete(task.id, task.completed)}
              className={`${level === 0 ? 'h-4 w-4' : 'h-3.5 w-3.5'} text-blue-600 focus:ring-blue-500 border-gray-300 rounded`}
            />
            <div>
              <div className="flex items-center space-x-2">
                <Typography
                  className={task.completed ? 'line-through text-gray-500' : ''}
                >
                  {task.title}
                </Typography>
                {task.estimated_minutes && (
                  <div className="flex items-center text-gray-500 text-sm">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {task.estimated_minutes} min
                  </div>
                )}
              </div>
              {task.description && (
                <Typography variant="body2" color="text.secondary">
                  {task.description}
                </Typography>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag) => {
                  const tagColors = {
                    'bug': { bg: '#FEE2E2', text: '#DC2626' },
                    'feature': { bg: '#DBEAFE', text: '#2563EB' },
                    'urgent': { bg: '#FEE2E2', text: '#DC2626' },
                    'documentation': { bg: '#E0E7FF', text: '#4F46E5' },
                    'enhancement': { bg: '#D1FAE5', text: '#059669' },
                    'design': { bg: '#FCE7F3', text: '#DB2777' },
                    'testing': { bg: '#FEF3C7', text: '#D97706' },
                    'research': { bg: '#F3E8FF', text: '#7C3AED' }
                  };

                  const getHashColor = (str: string) => {
                    const baseColors = [
                      { bg: '#FEE2E2', text: '#DC2626' }, // red
                      { bg: '#DBEAFE', text: '#2563EB' }, // blue
                      { bg: '#D1FAE5', text: '#059669' }, // green
                      { bg: '#FCE7F3', text: '#DB2777' }, // pink
                      { bg: '#FEF3C7', text: '#D97706' }, // yellow
                      { bg: '#F3E8FF', text: '#7C3AED' }, // purple
                    ];
                    const hash = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    return baseColors[hash % baseColors.length];
                  };

                  const color = tagColors[tag.toLowerCase()] || getHashColor(tag);
                  
                  return (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      sx={{
                        height: 20,
                        backgroundColor: color.bg,
                        color: color.text,
                        '& .MuiChip-label': {
                          px: 1,
                          py: 0.25,
                          fontSize: '0.75rem',
                          fontWeight: 500,
                        },
                      }}
                    />
                  );
                })}
              </div>
            )}
            <div className="flex items-center space-x-2">
              {task.priority && (
                <Chip
                  size="small"
                  label={task.priority}
                  sx={{
                    height: 20,
                    backgroundColor: task.priority === 'high' 
                      ? '#FEE2E2' 
                      : task.priority === 'medium'
                      ? '#FEF3C7'
                      : '#D1FAE5',
                    color: task.priority === 'high'
                      ? '#DC2626'
                      : task.priority === 'medium'
                      ? '#D97706'
                      : '#059669',
                    '& .MuiChip-label': {
                      px: 1,
                      py: 0.25,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    },
                  }}
                />
              )}
              <IconButton
                size="small"
                onClick={() => onEdit(task)}
              >
                <PencilIcon className="h-4 w-4" />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => onDelete(task.id, task.title)}
              >
                <TrashIcon className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
        </div>
      </li>
      {hasSubtasks && !isCollapsed && (
        task.subtasks.map(subtask => (
          <TaskItem 
            key={subtask.id} 
            task={subtask} 
            level={level + 1}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onToggleComplete={onToggleComplete}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))
      )}
    </>
  );
};

interface EditTaskDialogProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (task: Task) => void;
}

const EditTaskDialog = ({ open, task, onClose, onSave }: EditTaskDialogProps) => {
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  if (!editedTask) return null;

  const handleSave = () => {
    if (editedTask) {
      onSave(editedTask);
      onClose();
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

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit Task</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Title"
            value={editedTask.title}
            onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={editedTask.description || ''}
            onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            fullWidth
            label="Priority"
            value={editedTask.priority || ''}
            onChange={(e) => {
              const value = e.target.value;
              setEditedTask({ 
                ...editedTask, 
                priority: value === '' ? undefined : value as 'high' | 'medium' | 'low'
              });
            }}
            sx={{ mb: 2 }}
          >
            <MenuItem value="">No Priority</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="low">Low</MenuItem>
          </TextField>
          <TextField
            fullWidth
            type="number"
            label="Estimated Time (minutes)"
            value={editedTask.estimated_minutes || ''}
            onChange={(e) => setEditedTask({ ...editedTask, estimated_minutes: parseInt(e.target.value) || null })}
            sx={{ mb: 2 }}
          />
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Tags
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              {editedTask.tags.map((tag) => {
                const tagColors = {
                  'bug': { bg: '#FEE2E2', text: '#DC2626' },
                  'feature': { bg: '#DBEAFE', text: '#2563EB' },
                  'urgent': { bg: '#FEE2E2', text: '#DC2626' },
                  'documentation': { bg: '#E0E7FF', text: '#4F46E5' },
                  'enhancement': { bg: '#D1FAE5', text: '#059669' },
                  'design': { bg: '#FCE7F3', text: '#DB2777' },
                  'testing': { bg: '#FEF3C7', text: '#D97706' },
                  'research': { bg: '#F3E8FF', text: '#7C3AED' }
                };

                const getHashColor = (str: string) => {
                  const baseColors = [
                    { bg: '#FEE2E2', text: '#DC2626' }, // red
                    { bg: '#DBEAFE', text: '#2563EB' }, // blue
                    { bg: '#D1FAE5', text: '#059669' }, // green
                    { bg: '#FCE7F3', text: '#DB2777' }, // pink
                    { bg: '#FEF3C7', text: '#D97706' }, // yellow
                    { bg: '#F3E8FF', text: '#7C3AED' }, // purple
                  ];
                  const hash = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                  return baseColors[hash % baseColors.length];
                };

                const color = tagColors[tag.toLowerCase()] || getHashColor(tag);

                return (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    size="small"
                    sx={{
                      backgroundColor: color.bg,
                      color: color.text,
                      '& .MuiChip-label': {
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      },
                    }}
                  />
                );
              })}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add new tag"
              />
              <Button onClick={handleAddTag} disabled={!newTag}>
                Add
              </Button>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default function GoalPage() {
  const params = useParams();
  const router = useRouter();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [newMetric, setNewMetric] = useState<Partial<Metric>>({
    name: '',
    description: '',
    type: 'target',
    unit: '',
    target_value: 0,
    current_value: 0
  });

  useEffect(() => {
    fetchGoalData();
  }, [params.id]);

  const fetchGoalData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`http://localhost:8005/api/goals/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch goal');
      }
      const data = await response.json();
      setGoal({
        ...data,
        metrics: data.metrics || [] // Ensure metrics is always an array
      });

      const tasksResponse = await fetch(`http://localhost:8005/api/goals/${params.id}/tasks`);
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setTasks(tasksData.map((task: Task) => ({
          ...task,
          tags: task.tags || [],
          estimated_minutes: task.estimated_minutes || null,
          priority: task.priority || null,
          subtasks: task.subtasks || []
        })));
      }
    } catch (error) {
      console.error('Error fetching goal data:', error);
      setError('Failed to load goal data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const response = await fetch(`http://localhost:8005/api/goals/${params.id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTaskTitle,
          description: null,
          priority: 'medium',
          due_date: null,
          tags: [],
          parent_id: null,
          estimated_minutes: null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error('Failed to add task');
      }

      const newTask = await response.json();
      setTasks([...tasks, { 
        ...newTask, 
        tags: newTask.tags || [], 
        estimated_minutes: newTask.estimated_minutes || null,
        priority: newTask.priority || 'medium',
        subtasks: newTask.subtasks || []
      }]);
      setNewTaskTitle('');
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      const response = await fetch(`http://localhost:8005/api/tasks/${updatedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTask),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // Update the task in the state tree
      setTasks(prevTasks => {
        const updateTaskInTree = (tasks: Task[]): Task[] => {
          return tasks.map(task => {
            if (task.id === updatedTask.id) {
              return { 
                ...task, 
                ...updatedTask,
                tags: updatedTask.tags || [],
                priority: updatedTask.priority || null,
                estimated_minutes: updatedTask.estimated_minutes || null,
                subtasks: task.subtasks // preserve subtasks
              };
            }
            if (task.subtasks) {
              return { ...task, subtasks: updateTaskInTree(task.subtasks) };
            }
            return task;
          });
        };
        return updateTaskInTree(prevTasks);
      });
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const toggleTaskCompletion = async (taskId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`http://localhost:8005/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completed: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      setTasks(prevTasks => {
        const updateTaskCompletion = (tasks: Task[]): Task[] => {
          return tasks.map(task => {
            if (task.id === taskId) {
              return { ...task, completed: !currentStatus };
            }
            if (task.subtasks) {
              return { ...task, subtasks: updateTaskCompletion(task.subtasks) };
            }
            return task;
          });
        };
        return updateTaskCompletion(prevTasks);
      });
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: number, taskTitle: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${taskTitle}"?`);
    
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8005/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      // Recursively filter out the deleted task and its subtasks
      setTasks(prevTasks => {
        const filterDeletedTask = (tasks: Task[]): Task[] => {
          return tasks
            .filter(task => task.id !== taskId)
            .map(task => ({
              ...task,
              subtasks: task.subtasks ? filterDeletedTask(task.subtasks) : []
            }));
        };
        return filterDeletedTask(prevTasks);
      });
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('taskId', taskId.toString());
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const taskItem = target.closest('.task-item');
    if (taskItem) {
      taskItem.classList.add('drag-over');
    }
  };

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const taskItem = target.closest('.task-item');
    if (taskItem) {
      taskItem.classList.remove('drag-over');
    }
  };

  // Handle drop
  const handleDrop = async (e: React.DragEvent, targetTaskId: number) => {
    e.preventDefault();
    const draggedTaskId = parseInt(e.dataTransfer.getData('taskId'), 10);
    const target = e.target as HTMLElement;
    const taskItem = target.closest('.task-item');
    if (taskItem) {
      taskItem.classList.remove('drag-over');
    }
    
    if (draggedTaskId === targetTaskId) return;

    // Prevent dropping a parent onto its own child
    const isTargetDescendant = (targetId: number, draggedId: number): boolean => {
      const target = tasks.find(t => t.id === targetId);
      if (!target) return false;
      if (!target.subtasks) return false;
      
      return target.subtasks.some(subtask => 
        subtask.id === draggedId || isTargetDescendant(subtask.id, draggedId)
      );
    };

    if (isTargetDescendant(draggedTaskId, targetTaskId)) {
      console.error("Cannot drop a task into its own subtask");
      return;
    }

    try {
      const response = await fetch(`http://localhost:8005/api/tasks/${draggedTaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parent_id: targetTaskId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // Refresh tasks to show new hierarchy
      fetchGoalData();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleAddMetric = async () => {
    try {
      // Validate required fields
      if (!newMetric.name || !newMetric.unit) {
        throw new Error('Name and unit are required');
      }

      const response = await fetch(`http://localhost:8005/api/goals/${params.id}/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newMetric.name,
          description: newMetric.description || '',
          type: newMetric.type,
          unit: newMetric.unit,
          target_value: newMetric.type === 'target' ? (newMetric.target_value || 0) : null,
          current_value: newMetric.current_value || 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add metric');
      }

      const addedMetric = await response.json();
      
      // Update the goal's metrics array
      setGoal(prevGoal => {
        if (!prevGoal) return prevGoal;
        return {
          ...prevGoal,
          metrics: [...prevGoal.metrics, addedMetric]
        };
      });

      // Reset form and close modal
      setShowMetricModal(false);
      setNewMetric({
        name: '',
        description: '',
        type: 'target',
        unit: '',
        target_value: 0,
        current_value: 0
      });
    } catch (error: any) {
      console.error('Error adding metric:', error);
      alert(error.message || 'Failed to add metric');
    }
  };

  const handleUpdateMetric = async (metricId: number, updates: Partial<Metric>) => {
    try {
      const response = await fetch(`http://localhost:8005/api/metrics/${metricId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update metric');
      }

      await fetchGoalData();
    } catch (error) {
      console.error('Error updating metric:', error);
    }
  };

  const handleDeleteMetric = async (metricId: number) => {
    const confirmed = window.confirm('Are you sure you want to delete this metric?');
    if (!confirmed) return;

    try {
      const response = await fetch(`http://localhost:8005/api/metrics/${metricId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete metric');
      }

      await fetchGoalData();
    } catch (error) {
      console.error('Error deleting metric:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!goal) return <div>Goal not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">{goal?.title}</h1>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => router.push('/')}
            >
              Back to Goals
            </Button>
          </div>

          {/* Description */}
          <Paper className="p-6 bg-white shadow rounded-lg">
            <Typography variant="h6" gutterBottom>
              Description
            </Typography>
            <Typography color="text.secondary">
              {goal?.description}
            </Typography>
          </Paper>

          {/* Metrics Section */}
          <Paper className="p-6 bg-white shadow rounded-lg">
            <div className="flex justify-between items-center mb-6">
              <Typography variant="h6">
                Metrics
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setShowMetricModal(true)}
                startIcon={<AddIcon />}
              >
                Add Metric
              </Button>
            </div>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" className="font-semibold mb-3">
                  Target Metrics
                </Typography>
                {goal?.metrics?.filter(m => m.type === 'target').map(metric => (
                  <div key={metric.id} className="bg-white border rounded-lg p-4 mb-3 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <Typography variant="subtitle1" className="font-semibold">
                          {metric.name}
                        </Typography>
                        {metric.description && (
                          <Typography variant="body2" color="text.secondary">
                            {metric.description}
                          </Typography>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteMetric(metric.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between items-center">
                        <Typography variant="body2" color="text.secondary">
                          Progress
                        </Typography>
                        <Typography variant="body2">
                          {metric.current_value} / {metric.target_value || 0} {metric.unit}
                        </Typography>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${((metric.current_value || 0) / (metric.target_value || 1)) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" className="font-semibold mb-3">
                  Process Metrics
                </Typography>
                {goal?.metrics?.filter(m => m.type === 'process').map(metric => (
                  <div key={metric.id} className="bg-white border rounded-lg p-4 mb-3 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <Typography variant="subtitle1" className="font-semibold">
                          {metric.name}
                        </Typography>
                        {metric.description && (
                          <Typography variant="body2" color="text.secondary">
                            {metric.description}
                          </Typography>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteMetric(metric.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Typography variant="h4" className="font-bold text-center">
                        {metric.current_value || 0} {metric.unit}
                      </Typography>
                    </div>
                  </div>
                ))}
              </Grid>
            </Grid>
          </Paper>

          {/* Quick Add Task */}
          <Paper className="p-6 bg-white shadow rounded-lg">
            <Typography variant="h6" gutterBottom>
              Add New Task
            </Typography>
            <Box component="form" onSubmit={handleAddTask} sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={9}>
                  <TextField
                    fullWidth
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    type="submit"
                    disabled={!newTaskTitle.trim()}
                  >
                    Add Task
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* Tasks List */}
          <Paper className="bg-white shadow rounded-lg">
            <List>
              {tasks
                .filter(task => !task.parent_id)
                .map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onToggleComplete={toggleTaskCompletion}
                    onEdit={setEditingTask}
                    onDelete={handleDeleteTask}
                  />
                ))}
            </List>
          </Paper>
        </div>
      </div>

      {/* Add Metric Modal */}
      <Dialog
        open={showMetricModal}
        onClose={() => setShowMetricModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Metric</DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-4">
            <TextField
              label="Name"
              fullWidth
              value={newMetric.name}
              onChange={(e) => setNewMetric({ ...newMetric, name: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={newMetric.description}
              onChange={(e) => setNewMetric({ ...newMetric, description: e.target.value })}
            />
            <TextField
              select
              label="Type"
              fullWidth
              value={newMetric.type}
              onChange={(e) => setNewMetric({ ...newMetric, type: e.target.value as 'target' | 'process' })}
            >
              <MenuItem value="target">Target Metric</MenuItem>
              <MenuItem value="process">Process Metric</MenuItem>
            </TextField>
            <TextField
              label="Unit"
              fullWidth
              value={newMetric.unit}
              onChange={(e) => setNewMetric({ ...newMetric, unit: e.target.value })}
              placeholder="e.g., hours, pages, commits"
              inputProps={{ type: 'text' }}
            />
            {newMetric.type === 'target' && (
              <TextField
                label="Target Value"
                type="number"
                fullWidth
                value={newMetric.target_value}
                onChange={(e) => setNewMetric({ ...newMetric, target_value: parseFloat(e.target.value) })}
                inputProps={{ min: 0, step: 'any' }}
              />
            )}
            <TextField
              label="Current Value"
              type="number"
              fullWidth
              value={newMetric.current_value}
              onChange={(e) => setNewMetric({ ...newMetric, current_value: parseFloat(e.target.value) })}
              inputProps={{ min: 0, step: 'any' }}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMetricModal(false)}>Cancel</Button>
          <Button 
            onClick={handleAddMetric} 
            variant="contained" 
            color="primary"
            disabled={!newMetric.name || !newMetric.unit}
          >
            Add Metric
          </Button>
        </DialogActions>
      </Dialog>

      <EditTaskDialog
        open={!!editingTask}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleUpdateTask}
      />

      <style jsx>{`
        .task-item.drag-over {
          border: 2px dashed #4f46e5;
          background-color: #f5f3ff;
        }
      `}</style>
    </div>
  );
}
