'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PencilIcon, TrashIcon, TagIcon, ClockIcon } from '@heroicons/react/24/solid';
import AddIcon from '@mui/icons-material/Add';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import DeleteIcon from '@mui/icons-material/Delete';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import {
  Container,
  Typography,
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
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditTaskDialog from '../../../components/EditTaskDialog';
import TaskBreakdownDialog from '../../../components/TaskBreakdownDialog';
import ConversationList from '@/components/ConversationList';
import config from '@/config/config';

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
  metric_id: number | null;
  contribution_value: number | null;
  subtasks: Task[];
  completion_time: string | null;
  completion_order: number | null;
}

interface Contribution {
  value: number;
  task_id: number;
  timestamp: string;
}

interface Metric {
  id?: number;
  name: string;
  description: string;
  type: 'target' | 'process';
  unit: string;
  target_value: number;
  current_value: number;
  contributions_list: string;  // Raw JSON string from backend
}

interface Experience {
  id: number;
  content: string;
  type: 'positive' | 'negative';
  created_at: string;
  goal_id: number;
}

interface Strategy {
  id: number;
  title: string;
  steps: string[];
  created_at: string;
  goal_id: number;
}

interface Conversation {
  id: number;
  content: string;
  created_at: string;
  goal_id: number;
}

interface Goal {
  id: number;
  title: string;
  description: string;
  metrics: Metric[];
  experiences: Experience[];
  strategies: Strategy[];
  tasks: Task[];
  conversations: Conversation[];
  current_strategy_id: number | null;
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
  showDates: boolean;
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
  onDelete,
  showDates
}: TaskItemProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showBreakdownDialog, setShowBreakdownDialog] = useState(false);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  const handleAddSubtasks = async (subtasks: Partial<Task>[]) => {
    try {
      const responses = await Promise.all(
        subtasks.map(subtask =>
          fetch(`${config.apiUrl}/api/tasks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...subtask,
              parent_id: task.id,
              goal_id: task.goal_id
            }),
          })
        )
      );

      // Check if all responses were successful
      const hasError = responses.some(r => !r.ok);
      if (hasError) {
        throw new Error('Failed to create some subtasks');
      }

      // Refresh the goal data to show new subtasks
      window.location.reload();
    } catch (err) {
      console.error('Error creating subtasks:', err);
    }
  };

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
              {showDates && (
                <Typography variant="body2" color="text.secondary">
                  {new Date(task.created_at).toLocaleString()}
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
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBreakdownDialog(true);
                }}
                size="small"
                className="text-purple-600"
              >
                <AutoFixHighIcon className="h-4 w-4" />
              </IconButton>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                size="small"
                className="text-gray-600 hover:text-blue-600"
              >
                <PencilIcon className="h-4 w-4" />
              </IconButton>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id, task.title);
                }}
                size="small"
                className="text-red-600"
              >
                <TrashIcon className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
        </div>
      </li>
      {!isCollapsed && task.subtasks && task.subtasks.map(subtask => (
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
          showDates={showDates}
        />
      ))}
      <TaskBreakdownDialog
        open={showBreakdownDialog}
        task={task}
        onClose={() => setShowBreakdownDialog(false)}
        onAddSubtasks={handleAddSubtasks}
      />
    </>
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
  const [showPasteTasksDialog, setShowPasteTasksDialog] = useState(false);
  const [pastedTasksText, setPastedTasksText] = useState('');
  const [newMetric, setNewMetric] = useState<Partial<Metric>>({
    name: '',
    description: '',
    type: 'target',
    unit: '',
    target_value: 0,
    current_value: 0,
    contributions_list: ''
  });
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [newExperience, setNewExperience] = useState({
    content: '',
    type: 'positive' as 'positive' | 'negative'
  });
  const [newStrategy, setNewStrategy] = useState({
    title: '',
    steps: ['']
  });
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showDates, setShowDates] = useState(false);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(task => !task.parent_id) // Only top-level tasks
      .filter(task => showCompleted || !task.completed) // Filter by completion
      .filter(task => priorityFilter === 'all' || task.priority === priorityFilter) // Filter by priority
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
  }, [tasks, sortOrder, priorityFilter, showCompleted]);

  useEffect(() => {
    fetchGoalData();
  }, [params.id]);

  useEffect(() => {
    if (goal) {
      console.log('Goal updated in state:', goal);
      console.log('Strategies in goal state:', goal.strategies);
      console.log('Current strategy ID:', goal.current_strategy_id);
    }
  }, [goal]);

  const fetchGoalData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching goal data for ID:', params.id);
      const response = await fetch(`${config.apiUrl}/api/goals/${params.id}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch goal: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Goal data fetched:', data);
      console.log('Strategies in goal data:', data.strategies);
      
      if (!data) {
        throw new Error('No data returned from API');
      }
      
      setGoal({
        ...data,
        metrics: data.metrics || [], // Ensure metrics is always an array
        experiences: data.experiences || [], // Ensure experiences is always an array
        strategies: data.strategies || [], // Ensure strategies is always an array
        tasks: data.tasks || [], // Ensure tasks is always an array
        conversations: data.conversations || [] // Ensure conversations is always an array
      });

      const tasksResponse = await fetch(`${config.apiUrl}/api/goals/${params.id}/tasks`);
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setTasks(tasksData.map((task: Task) => ({
          ...task,
          tags: task.tags || [],
          estimated_minutes: task.estimated_minutes || null,
          priority: task.priority || null,
          metric_id: task.metric_id || null,
          contribution_value: task.contribution_value || null,
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
      const response = await fetch(`${config.apiUrl}/api/goals/${params.id}/tasks`, {
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
          metric_id: null,
          contribution_value: null,
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
        metric_id: newTask.metric_id || null,
        contribution_value: newTask.contribution_value || null,
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
      const response = await fetch(`${config.apiUrl}/api/tasks/${updatedTask.id}`, {
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
                metric_id: updatedTask.metric_id || null,
                contribution_value: updatedTask.contribution_value || null,
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
      // Find the task to get its metric_id and contribution_value
      const task = tasks.find(t => t.id === taskId) || tasks.flatMap(t => t.subtasks).find(t => t?.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // Use single endpoint for all task completions
      const response = await fetch(`${config.apiUrl}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completed: !currentStatus,
          metric_id: task.metric_id,
          contribution_value: task.contribution_value
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // Refresh goal data to get updated metrics
      await fetchGoalData();

      // Update task completion status in state
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
      const response = await fetch(`${config.apiUrl}/api/tasks/${taskId}`, {
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
      const response = await fetch(`${config.apiUrl}/api/tasks/${draggedTaskId}`, {
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

      // Update tasks state locally instead of fetching all data again
      setTasks(prevTasks => {
        const updatedTasks = [...prevTasks];
        
        // Helper function to find and remove task from its current position
        const findAndRemoveTask = (tasks: Task[]): [Task[], Task | null] => {
          for (let i = 0; i < tasks.length; i++) {
            if (tasks[i].id === draggedTaskId) {
              const [removedTask] = tasks.splice(i, 1);
              return [tasks, removedTask];
            }
            if (tasks[i].subtasks) {
              const [updatedSubtasks, removedTask] = findAndRemoveTask(tasks[i].subtasks);
              if (removedTask) {
                tasks[i].subtasks = updatedSubtasks;
                return [tasks, removedTask];
              }
            }
          }
          return [tasks, null];
        };

        // Helper function to add task to its new parent
        const addTaskToParent = (tasks: Task[], task: Task): boolean => {
          for (let i = 0; i < tasks.length; i++) {
            if (tasks[i].id === targetTaskId) {
              tasks[i].subtasks = tasks[i].subtasks || [];
              tasks[i].subtasks.push({
                ...task,
                parent_id: targetTaskId
              });
              return true;
            }
            if (tasks[i].subtasks && addTaskToParent(tasks[i].subtasks, task)) {
              return true;
            }
          }
          return false;
        };

        // Remove task from its current position
        const [tasksWithoutDragged, removedTask] = findAndRemoveTask(updatedTasks);
        if (removedTask) {
          // Add task to its new parent
          addTaskToParent(tasksWithoutDragged, removedTask);
        }

        return tasksWithoutDragged;
      });

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

      const response = await fetch(`${config.apiUrl}/api/goals/${params.id}/metrics`, {
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
          contributions_list: newMetric.contributions_list || ''
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
        current_value: 0,
        contributions_list: ''
      });
    } catch (error) {
      console.error('Error adding metric:', error);
    }
  };

  const handleUpdateMetric = async (metricId: number, updates: Partial<Metric>) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/metrics/${metricId}`, {
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
      const response = await fetch(`${config.apiUrl}/api/metrics/${metricId}`, {
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

  const handleUpdateDescription = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/api/goals/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: editedDescription
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update description');
      }

      setGoal(prev => prev ? { ...prev, description: editedDescription } : null);
      setIsEditingDescription(false);
    } catch (error) {
      console.error('Error updating description:', error);
    }
  };

  const handleAddExperience = async () => {
    try {
      if (!newExperience.content) {
        throw new Error('Content is required');
      }

      const response = await fetch(`${config.apiUrl}/api/goals/${params.id}/experiences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newExperience),
      });

      if (!response.ok) {
        throw new Error('Failed to add experience');
      }

      const addedExperience = await response.json();
      
      setGoal(prevGoal => {
        if (!prevGoal) return prevGoal;
        return {
          ...prevGoal,
          experiences: [addedExperience, ...prevGoal.experiences]
        };
      });

      setShowExperienceModal(false);
      setNewExperience({
        content: '',
        type: 'positive'
      });
    } catch (error) {
      console.error('Error adding experience:', error);
    }
  };

  const handleAddStrategy = async (e: React.FormEvent) => {
    try {
      if (!newStrategy.title || newStrategy.steps.some(step => !step)) {
        throw new Error('Title and all steps are required');
      }

      const response = await fetch(`${config.apiUrl}/api/goals/${params.id}/strategies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newStrategy.title,
          steps: newStrategy.steps.filter(step => step.trim() !== '')
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add strategy');
      }

      const addedStrategy = await response.json();
      
      setGoal(prevGoal => {
        if (!prevGoal) return prevGoal;
        return {
          ...prevGoal,
          strategies: [addedStrategy, ...prevGoal.strategies]
        };
      });

      setShowStrategyModal(false);
      setNewStrategy({
        title: '',
        steps: ['']
      });
    } catch (error) {
      console.error('Error adding strategy:', error);
    }
  };

  const handleEditStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStrategy) return;

    try {
      const response = await fetch(`${config.apiUrl}/api/goals/${params.id}/strategies/${editingStrategy.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editingStrategy.title,
          steps: editingStrategy.steps.filter(step => step.trim() !== '')
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update strategy');
      }

      const updatedStrategy = await response.json();
      setGoal(prev => ({
        ...prev!,
        strategies: prev!.strategies.map(s => 
          s.id === updatedStrategy.id ? updatedStrategy : s
        )
      }));
      setEditingStrategy(null);
      setShowStrategyModal(false);
    } catch (error) {
      console.error('Error updating strategy:', error);
    }
  };

  const handleAddStrategyStep = () => {
    setNewStrategy(prev => ({
      ...prev,
      steps: [...prev.steps, '']
    }));
  };

  const handleUpdateStrategyStep = (index: number, value: string) => {
    setNewStrategy(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => i === index ? value : step)
    }));
  };

  const handleRemoveStrategyStep = (index: number) => {
    setNewStrategy(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const handleSetCurrentStrategy = async (strategyId: number) => {
    try {
      console.log('Setting current strategy ID:', strategyId);
      const response = await fetch(`${config.apiUrl}/api/goals/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_strategy_id: strategyId
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error setting strategy:', errorText);
        throw new Error('Failed to update current strategy');
      }

      const updatedGoal = await response.json();
      console.log('Updated goal with new strategy:', updatedGoal);

      setGoal(prev => ({
        ...prev!,
        current_strategy_id: strategyId
      }));
    } catch (error) {
      console.error('Error updating current strategy:', error);
    }
  };

  const handleCreateTodoFromStrategy = async (strategy: Strategy) => {
    try {
      // Create parent task from strategy title
      const parentResponse = await fetch(`${config.apiUrl}/api/goals/${params.id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: strategy.title,
          description: null,
          priority: 'medium',
          tags: [],
          estimated_minutes: null,
          due_date: null,
        }),
      });

      if (!parentResponse.ok) {
        throw new Error('Failed to create parent task');
      }

      const parentTask = await parentResponse.json();

      // Create subtasks for each step
      for (const step of strategy.steps) {
        const subtaskResponse = await fetch(`${config.apiUrl}/api/goals/${params.id}/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: step,
            description: null,
            priority: 'medium',
            tags: [],
            estimated_minutes: null,
            due_date: null,
            parent_id: parentTask.id,
          }),
        });

        if (!subtaskResponse.ok) {
          throw new Error('Failed to create subtask');
        }
      }

      // Refresh tasks list
      const tasksResponse = await fetch(`${config.apiUrl}/api/goals/${params.id}/tasks`);
      const updatedTasks = await tasksResponse.json();
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Error creating todo list:', error);
    }
  };

  const handlePasteTasks = async () => {
    if (!pastedTasksText.trim()) return;
    
    try {
      // Split the pasted text by new lines and filter out empty lines
      const taskTitles = pastedTasksText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (taskTitles.length === 0) return;
      
      // Create tasks in sequence
      const newTasks = [];
      for (const title of taskTitles) {
        const response = await fetch(`${config.apiUrl}/api/goals/${params.id}/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            description: null,
            priority: 'medium',
            due_date: null,
            tags: [],
            parent_id: null,
            estimated_minutes: null,
            metric_id: null,
            contribution_value: null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Server error:', errorData);
          throw new Error(`Failed to add task: ${title}`);
        }

        const newTask = await response.json();
        newTasks.push({ 
          ...newTask, 
          tags: newTask.tags || [], 
          estimated_minutes: newTask.estimated_minutes || null,
          priority: newTask.priority || 'medium',
          metric_id: newTask.metric_id || null,
          contribution_value: newTask.contribution_value || null,
          subtasks: newTask.subtasks || []
        });
      }
      
      setTasks([...tasks, ...newTasks]);
      setPastedTasksText('');
      setShowPasteTasksDialog(false);
    } catch (error) {
      console.error('Error adding tasks:', error);
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
            <div className="flex justify-between items-center mb-2">
              <Typography variant="h6">
                Description
              </Typography>
              <IconButton
                size="small"
                onClick={() => {
                  setEditedDescription(goal?.description || '');
                  setIsEditingDescription(true);
                }}
              >
                <PencilIcon className="h-4 w-4" />
              </IconButton>
            </div>
            <Typography color="text.secondary">
              {goal?.description}
            </Typography>
          </Paper>

          {/* Edit Description Dialog */}
          <Dialog
            open={isEditingDescription}
            onClose={() => setIsEditingDescription(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Edit Description</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                multiline
                rows={4}
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                fullWidth
                variant="outlined"
                margin="normal"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setIsEditingDescription(false)}>Cancel</Button>
              <Button onClick={handleUpdateDescription} variant="contained">Save</Button>
            </DialogActions>
          </Dialog>

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
                          {(() => {
                            const contributions = JSON.parse(metric.contributions_list || '[]');
                            const total = contributions.reduce((sum: number, c: any) => sum + (c.value || 0), 0);
                            return `${total} / ${metric.target_value || 0} ${metric.unit}`;
                          })()}
                        </Typography>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: (() => {
                              const contributions = JSON.parse(metric.contributions_list || '[]');
                              const total = contributions.reduce((sum: number, c: any) => sum + (c.value || 0), 0);
                              return `${Math.min((total / (metric.target_value || 1)) * 100, 100)}%`;
                            })()
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
                      <Tooltip
                        title={
                          <div className="text-sm">
                            {(() => {
                              const contributions = JSON.parse(metric.contributions_list || '[]')
                                .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                .slice(0, 5);
                              if (contributions.length === 0) return 'No contributions yet';
                              return (
                                <div className="space-y-1">
                                  <div className="font-semibold mb-2">Recent Contributions:</div>
                                  {contributions.map((c: any, idx: number) => (
                                    <div key={idx} className="text-white">
                                      +{c.value} {metric.unit} ({new Date(c.timestamp).toLocaleDateString()})
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        }
                        arrow
                        placement="top"
                      >
                        <Typography variant="h4" className="font-bold text-center cursor-help">
                          {(() => {
                            const contributions = JSON.parse(metric.contributions_list || '[]');
                            const total = contributions.reduce((sum: number, c: any) => sum + (c.value || 0), 0);
                            return `${total} ${metric.unit}`;
                          })()}
                        </Typography>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </Grid>
            </Grid>
          </Paper>

          {/* Experiences and Strategies Section */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-3 gap-6">
              {/* Negative Experiences */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-red-600">Negative Experiences</h3>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      setNewExperience({ content: '', type: 'negative' });
                      setShowExperienceModal(true);
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="space-y-3">
                  {goal?.experiences
                    .filter(exp => exp.type === 'negative')
                    .map(exp => (
                      <div key={exp.id} className="p-3 bg-red-50 rounded-lg">
                        <p className="text-gray-800">{exp.content}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(exp.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Strategies */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-blue-600">Strategy</h3>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => setShowStrategyModal(true)}
                  >
                    Add
                  </Button>
                </div>

                {/* Strategy Selection */}
                <FormControl size="small" className="mb-4" fullWidth>
                  <InputLabel id="strategy-select-label">Current Strategy</InputLabel>
                  <Select
                    labelId="strategy-select-label"
                    label="Current Strategy"
                    value={goal?.current_strategy_id === null || goal?.current_strategy_id === undefined ? '' : goal.current_strategy_id}
                    onChange={(e) => {
                      const value = e.target.value;
                      console.log('Strategy selected:', value);
                      if (value !== '') {
                        handleSetCurrentStrategy(value as number);
                      } else {
                        // Handle empty selection (set to null)
                        handleSetCurrentStrategy(null as unknown as number);
                      }
                    }}
                    sx={{ minWidth: 200 }}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {goal?.strategies && goal.strategies.length > 0 ? (
                      goal.strategies.map((strategy) => (
                        <MenuItem key={strategy.id} value={strategy.id}>
                          {strategy.title}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>
                        <em>No strategies available</em>
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>

                {/* Display Current Strategy */}
                {goal?.current_strategy_id && goal.strategies
                  .filter(s => s.id === goal.current_strategy_id)
                  .map(strategy => (
                    <div key={strategy.id} className="p-3 bg-blue-100 rounded-lg border-2 border-blue-300">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-blue-800">{strategy.title}</h4>
                        <div className="flex items-center gap-1">
                          <Tooltip title="Create Todo List">
                            <IconButton
                              size="small"
                              onClick={() => handleCreateTodoFromStrategy(strategy)}
                            >
                              <ListAltIcon className="h-4 w-4 text-blue-600" />
                            </IconButton>
                          </Tooltip>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingStrategy(strategy);
                              setShowStrategyModal(true);
                            }}
                          >
                            <PencilIcon className="h-4 w-4 text-blue-600" />
                          </IconButton>
                        </div>
                      </div>
                      <ol className="list-decimal list-inside mt-2 space-y-1">
                        {strategy.steps.map((step, index) => (
                          <li key={index} className="text-gray-700">{step}</li>
                        ))}
                      </ol>
                    </div>
                  ))}
              </div>

              {/* Positive Experiences */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-green-600">Positive Experiences</h3>
                  <Button
                    variant="outlined"
                    color="success"
                    onClick={() => {
                      setNewExperience({ content: '', type: 'positive' });
                      setShowExperienceModal(true);
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="space-y-3">
                  {goal?.experiences
                    .filter(exp => exp.type === 'positive')
                    .map(exp => (
                      <div key={exp.id} className="p-3 bg-green-50 rounded-lg">
                        <p className="text-gray-800">{exp.content}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(exp.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Conversations Section */}
          <div className="mb-8">
            <ConversationList
              goalId={params.id}
              goalTitle={goal.title}
              goalDescription={goal.description}
              conversations={goal.conversations}
              onConversationAdded={(conversation) => {
                setGoal(prev => ({
                  ...prev!,
                  conversations: [
                    ...prev!.conversations.filter(c => c.id !== conversation.id),
                    conversation
                  ]
                }));
              }}
              onConversationDeleted={(conversationId) => {
                setGoal(prev => ({
                  ...prev!,
                  conversations: prev!.conversations.filter(c => c.id !== conversationId)
                }));
              }}
            />
          </div>

          {/* Quick Add Task */}
          <Paper className="p-6 bg-white shadow rounded-lg">
            <Typography variant="h6" gutterBottom>
              Add New Task
            </Typography>
            <Box component="form" onSubmit={handleAddTask} sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={7}>
                  <TextField
                    fullWidth
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
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
                <Grid item xs={12} sm={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    onClick={() => setShowPasteTasksDialog(true)}
                    startIcon={<ContentPasteIcon />}
                  >
                    Paste Tasks
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* Tasks List */}
          <Paper className="bg-white shadow rounded-lg">
            <Accordion elevation={0}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Filter & Sort</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box className="flex items-center gap-4">
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Sort by Date</InputLabel>
                    <Select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                      label="Sort by Date"
                    >
                      <MenuItem value="desc">Newest First</MenuItem>
                      <MenuItem value="asc">Oldest First</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value as 'all' | 'high' | 'medium' | 'low')}
                      label="Priority"
                    >
                      <MenuItem value="all">All Priorities</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="low">Low</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={showCompleted}
                        onChange={(e) => setShowCompleted(e.target.checked)}
                        size="small"
                      />
                    }
                    label="Show Completed"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={showDates}
                        onChange={(e) => setShowDates(e.target.checked)}
                        size="small"
                      />
                    }
                    label="Show Dates"
                  />
                </Box>
              </AccordionDetails>
            </Accordion>

            <List>
              {filteredTasks.map(task => (
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
                  showDates={showDates}
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
                value={newMetric.target_value || 0}
                onChange={(e) => setNewMetric({ ...newMetric, target_value: e.target.value ? parseFloat(e.target.value) : 0 })}
                inputProps={{ min: 0, step: 'any' }}
              />
            )}
            <TextField
              label="Current Value"
              type="number"
              fullWidth
              value={newMetric.current_value || 0}
              onChange={(e) => setNewMetric({ ...newMetric, current_value: e.target.value ? parseFloat(e.target.value) : 0 })}
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

      {/* Experience Modal */}
      <Dialog
        open={showExperienceModal}
        onClose={() => setShowExperienceModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Add {newExperience.type === 'positive' ? 'Positive' : 'Negative'} Experience
        </DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-4">
            <TextField
              label="Experience"
              fullWidth
              multiline
              rows={4}
              value={newExperience.content}
              onChange={(e) => setNewExperience({ ...newExperience, content: e.target.value })}
              placeholder="Describe your experience..."
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExperienceModal(false)}>Cancel</Button>
          <Button
            onClick={handleAddExperience}
            variant="contained"
            color={newExperience.type === 'positive' ? 'success' : 'error'}
          >
            Add Experience
          </Button>
        </DialogActions>
      </Dialog>

      {/* Strategy Modal */}
      <Dialog 
        open={showStrategyModal} 
        onClose={() => {
          setShowStrategyModal(false);
          setEditingStrategy(null);
          setNewStrategy({ title: '', steps: [''] });
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{editingStrategy ? 'Edit Strategy' : 'Add Strategy'}</DialogTitle>
        <form onSubmit={editingStrategy ? handleEditStrategy : handleAddStrategy}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Strategy Title"
              type="text"
              fullWidth
              value={editingStrategy ? editingStrategy.title : newStrategy.title}
              onChange={(e) => {
                if (editingStrategy) {
                  setEditingStrategy({
                    ...editingStrategy,
                    title: e.target.value
                  });
                } else {
                  setNewStrategy({
                    ...newStrategy,
                    title: e.target.value
                  });
                }
              }}
              required
            />
            <div className="mt-4">
              <Typography variant="subtitle1" className="mb-2">Steps</Typography>
              {(editingStrategy ? editingStrategy.steps : newStrategy.steps).map((step, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <TextField
                    fullWidth
                    label={`Step ${index + 1}`}
                    value={step}
                    onChange={(e) => {
                      const newSteps = [...(editingStrategy ? editingStrategy.steps : newStrategy.steps)];
                      newSteps[index] = e.target.value;
                      if (editingStrategy) {
                        setEditingStrategy({
                          ...editingStrategy,
                          steps: newSteps
                        });
                      } else {
                        setNewStrategy({
                          ...newStrategy,
                          steps: newSteps
                        });
                      }
                    }}
                    required
                  />
                  <IconButton
                    onClick={() => {
                      const newSteps = [...(editingStrategy ? editingStrategy.steps : newStrategy.steps)];
                      newSteps.splice(index, 1);
                      if (editingStrategy) {
                        setEditingStrategy({
                          ...editingStrategy,
                          steps: newSteps
                        });
                      } else {
                        setNewStrategy({
                          ...newStrategy,
                          steps: newSteps
                        });
                      }
                    }}
                    disabled={(editingStrategy ? editingStrategy.steps : newStrategy.steps).length <= 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </div>
              ))}
              <Button
                variant="text"
                onClick={() => {
                  if (editingStrategy) {
                    setEditingStrategy({
                      ...editingStrategy,
                      steps: [...editingStrategy.steps, '']
                    });
                  } else {
                    setNewStrategy({
                      ...newStrategy,
                      steps: [...newStrategy.steps, '']
                    });
                  }
                }}
              >
                Add Step
              </Button>
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setShowStrategyModal(false);
              setEditingStrategy(null);
              setNewStrategy({ title: '', steps: [''] });
            }}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingStrategy ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Paste Tasks Dialog */}
      <Dialog
        open={showPasteTasksDialog}
        onClose={() => setShowPasteTasksDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Paste Multiple Tasks</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter one task per line. Each line will be created as a separate task.
          </Typography>
          <TextField
            autoFocus
            multiline
            rows={10}
            value={pastedTasksText}
            onChange={(e) => setPastedTasksText(e.target.value)}
            fullWidth
            variant="outlined"
            placeholder="Task 1&#10;Task 2&#10;Task 3&#10;..."
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasteTasksDialog(false)}>Cancel</Button>
          <Button 
            onClick={handlePasteTasks} 
            variant="contained"
            disabled={!pastedTasksText.trim()}
          >
            Add Tasks
          </Button>
        </DialogActions>
      </Dialog>

      <EditTaskDialog
        open={!!editingTask}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleUpdateTask}
        metrics={goal?.metrics || []}
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
