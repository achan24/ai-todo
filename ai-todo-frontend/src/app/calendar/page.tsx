'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  IconButton, 
  Divider,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Menu,
  MenuItem
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { format, addDays, startOfWeek, addHours, parseISO, isToday } from 'date-fns';
import './calendar.css';
import config from '@/config/config';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';

// Define the Task interface based on your existing schema
interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  due_date?: string;
  is_starred: boolean;
  scheduled_time?: string;
  tags: string[];
  estimated_minutes?: number;
  subtasks: Task[];
  metadata?: string; // JSON string for storing additional data
  goal_id?: number;
  parent_id?: number;
}

// Define the Goal interface
interface Goal {
  id: number;
  title: string;
  description?: string;
  tasks?: Task[];
  subgoals?: Goal[];
}

// Define the CalendarEvent interface
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  priority: 'high' | 'medium' | 'low';
  is_starred: boolean;
  completed: boolean;
  timerActive?: boolean;
  timerLastUpdated?: number; // Last time the timer was updated
  elapsedTime?: number; // Total elapsed time in milliseconds
}

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [starredTasks, setStarredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const calendarRef = useRef<HTMLDivElement>(null);
  
  // Menu state for event options
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // Timer update interval
  useEffect(() => {
    // Update all active timers every second
    const timerInterval = setInterval(() => {
      setCalendarEvents(prev => {
        const hasActiveTimers = prev.some(event => event.timerActive);
        if (!hasActiveTimers) return prev; // No need to update if no timers are active
        
        const now = Date.now();
        
        return prev.map(event => {
          if (event.timerActive && event.timerLastUpdated) {
            // Calculate time since last update (max 2 seconds to prevent huge jumps after sleep)
            const timeSinceLastUpdate = Math.min(now - event.timerLastUpdated, 2000);
            const newElapsedTime = (event.elapsedTime || 0) + timeSinceLastUpdate;
            
            return { 
              ...event, 
              elapsedTime: newElapsedTime,
              timerLastUpdated: now
            };
          }
          return event;
        });
      });
    }, 1000);
    
    // Handle visibility change (tab switching, computer sleep/wake)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // When page becomes visible again, update the last updated time
        // without adding elapsed time to prevent jumps
        setCalendarEvents(prev => {
          return prev.map(event => {
            if (event.timerActive) {
              return { ...event, timerLastUpdated: Date.now() };
            }
            return event;
          });
        });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(timerInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Fetch tasks when component mounts
  useEffect(() => {
    fetchTasks();
    fetchGoals();
  }, []);

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/api/tasks?timestamp=${Date.now()}&limit=1000`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      const data = await response.json();
      
      // Flatten tasks to get all tasks including subtasks
      const flattenTasks = (tasks: Task[]): Task[] => {
        let result: Task[] = [];
        tasks.forEach(task => {
          result.push(task);
          if (task.subtasks && task.subtasks.length > 0) {
            result = result.concat(flattenTasks(task.subtasks));
          }
        });
        return result;
      };
      
      // Get all tasks (including subtasks) in a flat array for starred tasks display
      const allTasks = flattenTasks(data);
      
      // Keep the original task structure for proper subtask lookup
      // This preserves the parent-child relationships
      setTasks(data);
      
      // Filter for starred and non-completed tasks
      const starred = allTasks.filter(task => {
        // Convert is_starred to a boolean if it's not already
        const isStarred = typeof task.is_starred === 'string' 
          ? task.is_starred === 'true' 
          : Boolean(task.is_starred);
        
        return isStarred === true && !task.completed;
      });
      
      setStarredTasks(starred);
      
      // Convert tasks with scheduled_time to calendar events
      // We need to check both top-level tasks and subtasks for scheduled_time
      const getAllTasksWithScheduledTime = (tasks: Task[]): Task[] => {
        let result: Task[] = [];
        tasks.forEach(task => {
          if (task.scheduled_time) {
            result.push(task);
          }
          if (task.subtasks && task.subtasks.length > 0) {
            result = result.concat(getAllTasksWithScheduledTime(task.subtasks));
          }
        });
        return result;
      };
      
      const tasksWithScheduledTime = getAllTasksWithScheduledTime(data);
      
      const events = tasksWithScheduledTime.map((task: Task) => {
        const startTime = new Date(task.scheduled_time || '');
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
        
        let timerData = { elapsedTime: undefined, timerActive: false };
        if (task.metadata) {
          try {
            const metadata = JSON.parse(task.metadata);
            if (metadata.timerData && metadata.timerData.elapsedTime > 0) {
              timerData = metadata.timerData;
            }
          } catch (e) {
            console.error('Error parsing task metadata:', e);
          }
        }
        
        return {
          id: task.id.toString(),
          title: task.title,
          start: startTime,
          end: endTime,
          priority: task.priority,
          is_starred: task.is_starred,
          completed: task.completed,
          elapsedTime: timerData.elapsedTime,
          timerActive: task.completed ? false : timerData.timerActive,
          timerLastUpdated: timerData.timerActive ? Date.now() : undefined
        };
      });
      
      setCalendarEvents(events);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  // Fetch goals from API
  const fetchGoals = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/api/goals?timestamp=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch goals');
      }
      const data = await response.json();
      setGoals(data);
    } catch (error) {
      console.error('Error fetching goals:', error);
      setError('Failed to fetch goals. Please try again later.');
    }
  };

  // Add a useEffect to refresh tasks when the page gains focus
  useEffect(() => {
    const fetchTasksOnFocus = async () => {
      try {
        console.log('Refreshing tasks on focus');
        // Fetch tasks
        const tasksResponse = await fetch(`${config.apiUrl}/api/tasks?timestamp=${Date.now()}&limit=1000`);
        if (!tasksResponse.ok) {
          throw new Error('Failed to fetch tasks');
        }
        
        const data = await tasksResponse.json();
        
        // Flatten tasks to get all tasks including subtasks
        const flattenTasks = (tasks: Task[]): Task[] => {
          let result: Task[] = [];
          tasks.forEach(task => {
            result.push(task);
            if (task.subtasks && task.subtasks.length > 0) {
              result = result.concat(flattenTasks(task.subtasks));
            }
          });
          return result;
        };
        
        // Get all tasks (including subtasks) in a flat array for starred tasks display
        const allTasks = flattenTasks(data);
        
        // Keep the original task structure for proper subtask lookup
        // This preserves the parent-child relationships
        setTasks(data);
        
        // Filter for starred and non-completed tasks
        const starred = allTasks.filter(task => {
          // Convert is_starred to a boolean if it's not already
          const isStarred = typeof task.is_starred === 'string' 
            ? task.is_starred === 'true' 
            : Boolean(task.is_starred);
          
          return isStarred === true && !task.completed;
        });
        
        setStarredTasks(starred);
        
        // Update calendar events
        const getAllTasksWithScheduledTime = (tasks: Task[]): Task[] => {
          let result: Task[] = [];
          tasks.forEach(task => {
            if (task.scheduled_time) {
              result.push(task);
            }
            if (task.subtasks && task.subtasks.length > 0) {
              result = result.concat(getAllTasksWithScheduledTime(task.subtasks));
            }
          });
          return result;
        };
        
        const tasksWithScheduledTime = getAllTasksWithScheduledTime(data);
        
        const events = tasksWithScheduledTime.map((task: Task) => {
          const startTime = new Date(task.scheduled_time || '');
          const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
          
          let timerData = { elapsedTime: undefined, timerActive: false };
          if (task.metadata) {
            try {
              const metadata = JSON.parse(task.metadata);
              if (metadata.timerData && metadata.timerData.elapsedTime > 0) {
                timerData = metadata.timerData;
              }
            } catch (e) {
              console.error('Error parsing task metadata:', e);
            }
          }
          
          return {
            id: task.id.toString(),
            title: task.title,
            start: startTime,
            end: endTime,
            priority: task.priority,
            is_starred: task.is_starred,
            completed: task.completed,
            elapsedTime: timerData.elapsedTime,
            timerActive: task.completed ? false : timerData.timerActive,
            timerLastUpdated: timerData.timerActive ? Date.now() : undefined
          };
        });
        
        setCalendarEvents(events);
      } catch (error) {
        console.error('Error refreshing tasks on focus:', error);
      }
      
      // Also refresh goals to get updated goal names
      const goalsResponse = await fetch(`${config.apiUrl}/api/goals?timestamp=${Date.now()}`);
      if (goalsResponse.ok) {
        const goalsData = await goalsResponse.json();
        setGoals(goalsData);
      }
    };

    // Add event listener for when the window gains focus
    window.addEventListener('focus', fetchTasksOnFocus);
    
    // Initial fetch when component mounts
    fetchTasksOnFocus();
    
    // Clean up event listener when component unmounts
    return () => {
      window.removeEventListener('focus', fetchTasksOnFocus);
    };
  }, []);

  // Toggle star status
  const toggleStar = async (taskId: number) => {
    try {
      console.log('Toggling star for task ID:', taskId);
      
      const response = await fetch(`${config.apiUrl}/api/tasks/${taskId}/star`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        throw new Error('Failed to update task star status');
      }
      
      const updatedTask = await response.json();
      
      // Update tasks state recursively to handle both top-level tasks and subtasks
      setTasks(prevTasks => {
        const updateTaskStarStatus = (tasks: Task[]): Task[] => {
          return tasks.map(task => {
            if (task.id === taskId) {
              return { ...task, is_starred: updatedTask.is_starred };
            }
            if (task.subtasks && task.subtasks.length > 0) {
              return { ...task, subtasks: updateTaskStarStatus(task.subtasks) };
            }
            return task;
          });
        };
        
        return updateTaskStarStatus(prevTasks);
      });
      
      // Update starred tasks
      if (updatedTask.is_starred) {
        // Add to starred tasks if not already there
        setStarredTasks(prev => {
          // First check if the task already exists in the starred tasks list
          const exists = prev.some(task => task.id === taskId);
          
          if (exists) {
            return prev;
          }
          
          // If not, find the complete task object from the tasks hierarchy
          const taskToAdd = findTaskById(taskId, tasks);
          if (taskToAdd) {
            return [...prev, taskToAdd];
          }
          
          // If we can't find the task in the hierarchy, use the updatedTask from the API
          // This ensures we always add the task even if it's not found in the hierarchy
          return [...prev, updatedTask];
        });
      } else {
        // Remove from starred tasks
        setStarredTasks(prev => prev.filter(task => task.id !== taskId));
      }
      
      // Update calendar events
      setCalendarEvents(prev => 
        prev.map(event => 
          event.id === taskId.toString() ? { ...event, is_starred: updatedTask.is_starred } : event
        )
      );
      
    } catch (error) {
      console.error('Error toggling star status:', error);
    }
  };
  
  // Toggle task completion status
  const toggleTaskCompletion = async (taskId: number) => {
    try {
      // Find the task to determine its current completion status
      const task = findTaskById(taskId, tasks);
      if (!task) {
        console.error('Task not found:', taskId);
        return;
      }
      
      const newCompletionStatus = !task.completed;
      
      // Optimistically update UI first
      // Update tasks state recursively
      setTasks(prevTasks => {
        const updateTaskCompletionStatus = (tasks: Task[]): Task[] => {
          return tasks.map(task => {
            if (task.id === taskId) {
              return { ...task, completed: newCompletionStatus };
            }
            if (task.subtasks && task.subtasks.length > 0) {
              return { ...task, subtasks: updateTaskCompletionStatus(task.subtasks) };
            }
            return task;
          });
        };
        
        return updateTaskCompletionStatus(prevTasks);
      });
      
      // Update calendar events and stop timer if task is completed
      setCalendarEvents(prev => 
        prev.map(event => {
          if (event.id === taskId.toString()) {
            return { 
              ...event, 
              completed: newCompletionStatus,
              // If completing the task, stop the timer
              timerActive: newCompletionStatus ? false : event.timerActive 
            };
          }
          return event;
        })
      );
      
      // If task is completed, remove from starred tasks
      if (newCompletionStatus) {
        setStarredTasks(prev => prev.filter(task => task.id !== taskId));
      }
      
      // Make the API call using the PUT endpoint for updating tasks
      const response = await fetch(`${config.apiUrl}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: newCompletionStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update task completion status');
      }
      
      const updatedTask = await response.json();
      
      // Update tasks state with server response recursively
      setTasks(prevTasks => {
        const updateTaskCompletionStatus = (tasks: Task[]): Task[] => {
          return tasks.map(task => {
            if (task.id === taskId) {
              return { ...task, completed: updatedTask.completed };
            }
            if (task.subtasks && task.subtasks.length > 0) {
              return { ...task, subtasks: updateTaskCompletionStatus(task.subtasks) };
            }
            return task;
          });
        };
        
        return updateTaskCompletionStatus(prevTasks);
      });
      
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };
  
  // Helper function to find a task or subtask by ID
  const findTaskById = (taskId: number, taskList: Task[]): Task | null => {
    for (const task of taskList) {
      if (task.id === taskId) {
        return task;
      }
      
      if (task.subtasks && task.subtasks.length > 0) {
        const subtask = findTaskById(taskId, task.subtasks);
        if (subtask) {
          return subtask;
        }
      }
    }
    
    return null;
  };
  
  // Toggle timer for a task
  const toggleTimer = async (eventId: string) => {
    // Find the current event
    const taskId = parseInt(eventId);
    const currentEvent = calendarEvents.find(event => event.id === eventId);
    if (!currentEvent) return;
    
    const now = Date.now();
    let updatedEvent: CalendarEvent | undefined;
    
    // Update the calendar events state
    setCalendarEvents(prev => {
      return prev.map(event => {
        if (event.id === eventId) {
          if (event.timerActive) {
            // Stopping the timer
            updatedEvent = { 
              ...event, 
              timerActive: false,
              // Keep the current elapsed time
              timerLastUpdated: undefined
            };
            return updatedEvent;
          } else {
            // Starting the timer
            updatedEvent = { 
              ...event, 
              timerActive: true,
              timerLastUpdated: now,
              // Keep existing elapsed time when resuming
              elapsedTime: event.elapsedTime || 0
            };
            return updatedEvent;
          }
        }
        return event;
      });
    });
    
    // If we have an updated event, save the timer data to the task
    if (updatedEvent) {
      try {
        // Store the timer data in the task's metadata field
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        // Create or update metadata object
        const metadata = task.metadata ? JSON.parse(task.metadata) : {};
        metadata.timerData = {
          elapsedTime: updatedEvent.elapsedTime || 0,
          timerActive: updatedEvent.timerActive || false,
          lastUpdated: now
        };
        
        // Update the task with the new metadata
        const response = await fetch(`${config.apiUrl}/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ metadata: JSON.stringify(metadata) }),
        });
        
        if (!response.ok) {
          console.error('Failed to save timer data');
        }
      } catch (error) {
        console.error('Error saving timer data:', error);
      }
    }
  };
  
  // Format elapsed time as HH:MM:SS
  const formatElapsedTime = (milliseconds?: number): string => {
    // If milliseconds is undefined or 0, return empty string to avoid showing 00:00:00
    if (milliseconds === undefined || milliseconds === 0) return '';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  };

  // Handle task drop from starred/all tasks list onto calendar
  const handleExternalDrop = async (taskId: number, date: Date, hour: number, minute: number = 0) => {
    try {
      console.log('Handling external drop for task ID:', taskId, 'at date:', date, 'hour:', hour, 'minute:', minute);
      
      // Find the task in our state using the recursive helper
      const task = findTaskById(taskId, tasks);
      if (!task) {
        console.error('Task not found:', taskId);
        return;
      }
      
      // Create a date with the specified hour and minute
      const scheduledDateTime = new Date(date);
      scheduledDateTime.setHours(hour, minute, 0, 0);
      const scheduledTime = scheduledDateTime.toISOString();
      
      // Optimistically update UI first for better user experience
      // Update calendar events immediately
      setCalendarEvents(prev => {
        // Check if event already exists
        const existingEventIndex = prev.findIndex(event => event.id === taskId.toString());
        
        const newEvent: CalendarEvent = {
          id: taskId.toString(),
          title: task.title,
          start: scheduledDateTime,
          end: new Date(scheduledDateTime.getTime() + 60 * 60 * 1000), // Add 1 hour to the start time
          priority: task.priority,
          is_starred: task.is_starred,
          completed: task.completed,
          elapsedTime: undefined,
          timerActive: false,
          timerLastUpdated: undefined
        };
        
        if (existingEventIndex >= 0) {
          // Update existing event
          const updatedEvents = [...prev];
          updatedEvents[existingEventIndex] = newEvent;
          return updatedEvents;
        } else {
          // Add new event
          return [...prev, newEvent];
        }
      });
      
      // Then make the API call
      const response = await fetch(`${config.apiUrl}/api/tasks/${taskId}/schedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scheduled_time: scheduledTime }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to schedule task');
      }
      
      const updatedTask = await response.json();
      
      // Update tasks state with server response recursively
      setTasks(prevTasks => {
        const updateTaskScheduledTime = (tasks: Task[]): Task[] => {
          return tasks.map(task => {
            if (task.id === taskId) {
              return { ...task, scheduled_time: updatedTask.scheduled_time };
            }
            if (task.subtasks && task.subtasks.length > 0) {
              return { ...task, subtasks: updateTaskScheduledTime(task.subtasks) };
            }
            return task;
          });
        };
        
        return updateTaskScheduledTime(prevTasks);
      });
      
      // Update starred tasks if it's a starred task
      if (updatedTask.is_starred) {
        // First check if the task already exists in the starred tasks list
        setStarredTasks(prev => {
          // First check if the task already exists in the starred tasks list
          const exists = prev.some(task => task.id === taskId);
          
          if (exists) {
            return prev;
          }
          
          // If not, find the complete task object from the tasks hierarchy
          const taskToAdd = findTaskById(taskId, tasks);
          if (taskToAdd) {
            return [...prev, taskToAdd];
          }
          
          // If we can't find the task in the hierarchy, use the updatedTask from the API
          // This ensures we always add the task even if it's not found in the hierarchy
          return [...prev, updatedTask];
        });
      }
      
      console.log('Task scheduled successfully:', updatedTask);
    } catch (error) {
      console.error('Error scheduling task:', error);
      
      // Revert the optimistic update if there was an error
      // This would require more complex state management in a real app
    }
  };
  
  // Handle drag start for task items
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    console.log('Drag started for task:', task.id);
    // Make sure we set the data transfer properly
    e.dataTransfer.setData('text/plain', task.id.toString());
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTask(task);
  };
  
  // Handle drag over for calendar cells
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.classList.contains('calendar-cell')) {
      e.currentTarget.classList.add('drag-over');
    }
  };
  
  // Handle drag leave for calendar cells
  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.classList.contains('calendar-cell')) {
      e.currentTarget.classList.remove('drag-over');
    }
  };
  
  // Handle drop for calendar cells
  const handleDrop = (e: React.DragEvent, date: Date, hour: number, minute: number = 0) => {
    e.preventDefault();
    if (e.currentTarget.classList.contains('calendar-cell')) {
      e.currentTarget.classList.remove('drag-over');
      
      const taskId = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (taskId && !isNaN(taskId)) {
        // Always use handleExternalDrop for both new tasks and rescheduling
        // This will handle the API call and state updates
        handleExternalDrop(taskId, date, hour, minute);
      }
    }
  };
  
  // Handle calendar event drop (rescheduling)
  const handleEventDrop = async (taskId: number, newDate: Date, newHour: number, newMinute: number = 0) => {
    try {
      // Call the same function we use for external drops
      await handleExternalDrop(taskId, newDate, newHour, newMinute);
    } catch (error) {
      console.error('Error handling event drop:', error);
    }
  };
  
  // Handle opening the event menu
  const handleEventMenuOpen = (event: React.MouseEvent<HTMLElement>, eventId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedEventId(eventId);
  };
  
  // Handle closing the event menu
  const handleEventMenuClose = () => {
    setAnchorEl(null);
    setSelectedEventId(null);
  };
  
  // Handle unscheduling a task
  const handleUnscheduleTask = async () => {
    if (!selectedEventId) return;
    
    try {
      const taskId = parseInt(selectedEventId, 10);
      
      // Make API call to unschedule the task
      const response = await fetch(`${config.apiUrl}/api/tasks/${taskId}/schedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scheduled_time: "" }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to unschedule task');
      }
      
      // Remove the event from calendar events
      setCalendarEvents(prev => prev.filter(event => event.id !== selectedEventId));
      
      // Update tasks state
      setTasks(prevTasks => {
        const updateTaskScheduledTime = (tasks: Task[]): Task[] => {
          return tasks.map(task => {
            if (task.id === taskId) {
              return { ...task, scheduled_time: undefined };
            }
            if (task.subtasks && task.subtasks.length > 0) {
              return { ...task, subtasks: updateTaskScheduledTime(task.subtasks) };
            }
            return task;
          });
        };
        
        return updateTaskScheduledTime(prevTasks);
      });
      
      // Update starred tasks if it's a starred task
      setStarredTasks(prev => {
        return prev.map(task => {
          if (task.id === taskId) {
            return { ...task, scheduled_time: undefined };
          }
          return task;
        });
      });
      
      console.log('Task unscheduled successfully');
    } catch (error) {
      console.error('Error unscheduling task:', error);
    } finally {
      handleEventMenuClose();
    }
  };
  
  // Current time indicator reference and state
  const currentTimeRef = useRef<HTMLDivElement>(null);
  const [currentTimePosition, setCurrentTimePosition] = useState<number>(0);
  
  // Update current time position
  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // Force re-render to update the time indicator position
      // This is more reliable than using percentage-based positioning
      setCurrentTimePosition(Date.now()); // Just using this as a trigger for re-render
      
      // Scroll to current time if it's today
      if (isToday(currentDate)) {
        // Get the table container
        const tableContainer = document.querySelector('.MuiTableContainer-root');
        if (tableContainer) {
          // Calculate scroll position: each hour is approximately 120px in height (30px * 4 slots)
          // Subtract some offset to position the current time in the middle of the viewport
          const scrollPosition = (hours * 120) + (minutes / 60 * 120) - 200;
          tableContainer.scrollTop = Math.max(0, scrollPosition);
        }
      }
    };
    
    // Update immediately and then every minute
    updateCurrentTime();
    const interval = setInterval(updateCurrentTime, 60000);
    
    return () => clearInterval(interval);
  }, [currentDate]);
  
  // Helper function to get goal title by id
  const getGoalTitle = (goalId?: number) => {
    if (!goalId) return '';
    
    // Recursive function to search through goals and their subgoals
    const findGoalById = (goals: Goal[], id: number): Goal | undefined => {
      for (const goal of goals) {
        if (goal.id === id) {
          return goal;
        }
        
        if (goal.subgoals && goal.subgoals.length > 0) {
          const subgoal = findGoalById(goal.subgoals, id);
          if (subgoal) {
            return subgoal;
          }
        }
      }
      
      return undefined;
    };
    
    const goal = findGoalById(goals, goalId);
    return goal ? goal.title : `Goal ${goalId}`;
  };

  // Calendar navigation functions
  const goToToday = () => {
    setCurrentDate(new Date());
    // Scroll to current time will happen in the useEffect
  };
  const goToPreviousDay = () => setCurrentDate(prev => addDays(prev, -1));
  const goToNextDay = () => setCurrentDate(prev => addDays(prev, 1));
  const goToPreviousWeek = () => setCurrentDate(prev => addDays(prev, -7));
  const goToNextWeek = () => setCurrentDate(prev => addDays(prev, 7));
  
  // Get time slots for the day view (15-minute intervals)
  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        slots.push({ hour, minute });
      }
    }
    return slots;
  };
  
  // Get the current time slot
  const getCurrentTimeSlot = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = Math.floor(now.getMinutes() / 15) * 15;
    return { hour: currentHour, minute: currentMinute };
  };
  
  // Store the current time slot
  const [currentTimeSlot, setCurrentTimeSlot] = useState(getCurrentTimeSlot());
  
  // Update the current time slot every minute
  useEffect(() => {
    const updateCurrentTimeSlot = () => {
      setCurrentTimeSlot(getCurrentTimeSlot());
    };
    
    // Update immediately
    updateCurrentTimeSlot();
    
    // Update every minute
    const intervalId = setInterval(updateCurrentTimeSlot, 60000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Get days for the week view
  const getDaysInWeek = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 0 });
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(start, i));
    }
    return days;
  };
  
  // Format time slot for display
  const formatTimeSlot = (hour: number, minute: number) => {
    let hourDisplay;
    if (hour === 0) hourDisplay = '12';
    else if (hour === 12) hourDisplay = '12';
    else hourDisplay = hour < 12 ? `${hour}` : `${hour - 12}`;
    
    const ampm = hour < 12 ? 'AM' : 'PM';
    const minuteDisplay = minute === 0 ? '00' : minute.toString();
    
    return `${hourDisplay}:${minuteDisplay} ${ampm}`;
  };
  
  // Get events for a specific time slot and day
  const getEventsForTimeSlot = (date: Date, hour: number, minute: number) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    return calendarEvents.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= dayStart && 
             eventDate <= dayEnd && 
             eventDate.getHours() === hour &&
             Math.floor(eventDate.getMinutes() / 15) * 15 === minute;
    });
  };
  
  // Get events for a specific hour (all 15-min slots) - used for week view
  const getEventsForHour = (date: Date, hour: number) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    return calendarEvents.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= dayStart && 
             eventDate <= dayEnd && 
             eventDate.getHours() === hour;
    });
  };
  
  // Render an event in a calendar cell
  const renderEvent = (event: CalendarEvent) => {
    let bgColor = '#f1f8e9'; // low priority
    if (event.priority === 'high') {
      bgColor = '#fff4e5';
    } else if (event.priority === 'medium') {
      bgColor = '#e3f2fd';
    }
    
    return (
      <div 
        key={event.id}
        className="calendar-event"
        style={{
          backgroundColor: bgColor,
          textDecoration: event.completed ? 'line-through' : 'none',
          opacity: event.completed ? 0.7 : 1,
          cursor: 'grab' // Add cursor style to indicate draggability
        }}
        draggable={true} // Explicitly set draggable to true
        onDragStart={(e) => {
          console.log('Dragging calendar event:', event.id);
          // Find the task associated with this event
          const taskId = parseInt(event.id);
          const task = findTaskById(taskId, tasks);
          if (task) {
            // Use the existing handleDragStart function
            handleDragStart(e, task);
          } else {
            console.error('Task not found for event:', event.id);
          }
        }}
      >
        <div className="flex flex-col">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={event.completed}
                onChange={() => toggleTaskCompletion(parseInt(event.id))}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span>{event.title}</span>
            </div>
            <div className="flex items-center gap-1">
              {event.is_starred && <span style={{ color: '#f57c00' }}>★</span>}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTimer(event.id);
                }}
                disabled={event.completed}
                className={`px-2 py-1 text-xs rounded ${event.timerActive 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-green-100 text-green-800'} ${event.completed ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-80'}`}
              >
                {event.timerActive ? 'Stop' : 'Start'}
              </button>
              <IconButton
                size="small"
                onClick={(e) => handleEventMenuOpen(e, event.id)}
                sx={{ padding: '2px' }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </div>
          </div>
          
          {/* Timer display - only show if timer is active or has been used and has non-zero time */}
          {(event.timerActive || (event.elapsedTime && event.elapsedTime > 0)) && (
            <div className="mt-1 text-xs font-mono">
              {event.timerActive ? (
                <>
                  Time: {formatElapsedTime(event.elapsedTime) || '00:00:00'}
                  <span className="ml-1 animate-pulse">●</span>
                </>
              ) : (
                formatElapsedTime(event.elapsedTime) && `Time: ${formatElapsedTime(event.elapsedTime)}`
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Menu component for event options
  const EventMenu = () => {
    return (
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleEventMenuClose}
      >
        <MenuItem onClick={handleUnscheduleTask}>Unschedule</MenuItem>
      </Menu>
    );
  };
  
  // Handle receiving external drops on the calendar
  const handleReceiveExternal = (info: any) => {
    if (info.draggedEl.getAttribute('data-task-id')) {
      const taskId = parseInt(info.draggedEl.getAttribute('data-task-id'), 10);
      // Extract hour and minute from the date
      const hour = info.date.getHours();
      const minute = info.date.getMinutes();
      handleExternalDrop(taskId, info.date, hour, minute);
      return true; // Indicate that we've handled this drop
    }
    return false;
  };

  const router = useRouter();

  return (
    <div className="container mx-auto p-4">
      {/* Render the event menu */}
      <EventMenu />
      
      <Box sx={{ mb: 4 }}>
        <Button 
          component={Link} 
          href="/"
          startIcon={<ArrowBackIcon />}
          variant="text"
        >
          Back to Dashboard
        </Button>
        <Typography variant="h4" component="h1" gutterBottom>
          Day Calendar
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Left sidebar - Starred tasks */}
        <Grid item xs={12} md={3}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Starred Tasks
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {loading ? (
              <Typography>Loading tasks...</Typography>
            ) : error ? (
              <Typography color="error">{error}</Typography>
            ) : starredTasks.length === 0 ? (
              <Typography>No starred tasks. Star some tasks to see them here.</Typography>
            ) : (
              <div className="space-y-2">
                {starredTasks.map(task => (
                  <Paper 
                    key={task.id}
                    elevation={1} 
                    sx={{ p: 2, mb: 1 }}
                    className="task-item cursor-pointer"
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDoubleClick={() => {
                      if (task.goal_id) {
                        router.push(`/goals/${task.goal_id}`);
                      }
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <Typography variant="body1">
                        {task.title}
                      </Typography>
                      <div className="flex items-center">
                        <IconButton 
                          size="small" 
                          onClick={() => toggleStar(task.id)}
                          color="warning"
                        >
                          <StarIcon />
                        </IconButton>
                      </div>
                    </div>
                    {task.scheduled_time && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Scheduled: {format(new Date(task.scheduled_time), 'h:mm a')}
                      </Typography>
                    )}
                    {task.goal_id && (
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        display="block"
                        sx={{ mt: 1 }}
                      >
                        From: {getGoalTitle(task.goal_id)}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </div>
            )}
          </Paper>
        </Grid>
        
        {/* Right side - Calendar */}
        <Grid item xs={12} md={9}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Schedule
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <div style={{ height: '650px' }} ref={calendarRef}>
              {/* Calendar Navigation */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <div>
                  <Button onClick={goToPreviousDay} variant="outlined" sx={{ mr: 1 }}>
                    Previous Day
                  </Button>
                  <Button onClick={goToNextDay} variant="outlined">
                    Next Day
                  </Button>
                </div>
                <div>
                  <Button onClick={goToToday} variant="contained" color="primary">
                    Today
                  </Button>
                </div>
                <div>
                  <Button 
                    onClick={() => setViewMode('day')} 
                    variant={viewMode === 'day' ? 'contained' : 'outlined'}
                    color="primary"
                    sx={{ mr: 1 }}
                  >
                    Day
                  </Button>
                  <Button 
                    onClick={() => setViewMode('week')} 
                    variant={viewMode === 'week' ? 'contained' : 'outlined'}
                    color="primary"
                  >
                    Week
                  </Button>
                </div>
              </Box>
              
              {/* Calendar Header */}
              <Typography variant="h6" align="center" gutterBottom>
                {format(currentDate, 'MMMM d, yyyy')}
              </Typography>
              
              {/* Day View */}
              {viewMode === 'day' && (
                <TableContainer component={Paper} sx={{ maxHeight: '550px', overflow: 'auto', position: 'relative' }}>
                  {/* Time indicator removed */}
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell width="15%">Time</TableCell>
                        <TableCell>Events</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getTimeSlots().map(slot => {
                        const { hour, minute } = slot;
                        const events = getEventsForTimeSlot(currentDate, hour, minute);
                        
                        // Only show the hour at the first slot of each hour
                        const showHour = minute === 0;
                        
                        return (
                          <TableRow key={`${hour}-${minute}`}>
                            <TableCell>
                              {formatTimeSlot(hour, minute)}
                            </TableCell>
                            <TableCell 
                              className="calendar-cell"
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, currentDate, hour, minute)}
                              sx={{
                                height: '30px',
                                backgroundColor: isToday(currentDate) ? 'rgba(25, 118, 210, 0.05)' : 'inherit',
                                borderTop: showHour ? '1px solid #e0e0e0' : 'none',
                                '&.drag-over': {
                                  backgroundColor: 'rgba(25, 118, 210, 0.2)',
                                  boxShadow: 'inset 0 0 0 2px #1976d2'
                                }
                              }}
                            >
                              {events.length > 0 ? (
                                <div className="calendar-events">
                                  {events.map(event => renderEvent(event))}
                                </div>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {/* Week View */}
              {viewMode === 'week' && (
                <TableContainer component={Paper} sx={{ maxHeight: '550px', overflow: 'auto', position: 'relative' }}>
                  {/* Time indicator removed - using cell highlighting instead */}
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell width="10%">Time</TableCell>
                        {getDaysInWeek(currentDate).map(day => (
                          <TableCell key={day.toISOString()} align="center">
                            <div>{format(day, 'EEE')}</div>
                            <div>{format(day, 'MMM d')}</div>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getTimeSlots().map(slot => {
                        const { hour, minute } = slot;
                        // Only show the hour at the first slot of each hour
                        const showHour = minute === 0;
                        
                        return (
                          <TableRow key={`${hour}-${minute}`}>
                            <TableCell>
                              {formatTimeSlot(hour, minute)}
                            </TableCell>
                            {getDaysInWeek(currentDate).map(day => {
                              const events = getEventsForTimeSlot(day, hour, minute);
                              return (
                                <TableCell 
                                  key={`${day.toISOString()}-${hour}-${minute}`}
                                  className="calendar-cell"
                                  onDragOver={handleDragOver}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, day, hour, minute)}
                                  sx={{
                                    height: '30px',
                                    backgroundColor: isToday(day) ? 'rgba(25, 118, 210, 0.05)' : 'inherit',
                                    borderTop: showHour ? '1px solid #e0e0e0' : 'none',
                                    '&.drag-over': {
                                      backgroundColor: 'rgba(25, 118, 210, 0.2)',
                                      boxShadow: 'inset 0 0 0 2px #1976d2'
                                    }
                                  }}
                                >
                                  {events.length > 0 ? (
                                    <div className="calendar-events">
                                      {events.map(event => renderEvent(event))}
                                    </div>
                                  ) : null}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </div>
          </Paper>
        </Grid>
      </Grid>

      {/* All Tasks Section */}
      <Paper elevation={2} sx={{ p: 2, mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          All Tasks
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        {loading ? (
          <Typography>Loading tasks...</Typography>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : tasks.length === 0 ? (
          <Typography>No tasks found.</Typography>
        ) : (
          <Grid container spacing={2}>
            {tasks.map(task => (
              <Grid item xs={12} sm={6} md={4} key={task.id}>
                <Paper 
                  elevation={1} 
                  sx={{ p: 2 }}
                  className="task-item"
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, task)}
                >
                  <div className="flex justify-between items-center">
                    <Typography variant="body1" sx={{ 
                      textDecoration: task.completed ? 'line-through' : 'none',
                      color: task.completed ? 'text.secondary' : 'text.primary'
                    }}>
                      {task.title}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => toggleStar(task.id)}
                      color="warning"
                    >
                      <StarIcon />
                    </IconButton>
                  </div>
                  {task.description && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {task.description}
                    </Typography>
                  )}
                  <div className="flex mt-2 justify-between">
                    <div>
                      {task.priority && (
                        <span className={`inline-block px-2 py-1 text-xs rounded ${
                          task.priority === 'high' 
                            ? 'bg-red-100 text-red-800' 
                            : task.priority === 'medium' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                        }`}>
                          {task.priority}
                        </span>
                      )}
                    </div>
                    {task.due_date && (
                      <Typography variant="caption" color="text.secondary">
                        Due: {format(new Date(task.due_date), 'MMM d')}
                      </Typography>
                    )}
                  </div>
                  {task.goal_id && (
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      display="block"
                      sx={{ mt: 1 }}
                    >
                      From: {getGoalTitle(task.goal_id)}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      <style jsx global>{`
        .task-item {
          cursor: grab;
          transition: box-shadow 0.2s, transform 0.2s;
          user-select: none;
          -webkit-user-drag: element;
        }
        .task-item:active {
          cursor: grabbing;
          transform: scale(0.98);
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        
        /* Calendar styles */
        .calendar-cell {
          transition: background-color 0.2s;
        }
        
        .calendar-cell.drag-over {
          background-color: rgba(25, 118, 210, 0.2) !important;
          box-shadow: inset 0 0 0 2px #1976d2 !important;
        }
        
        .calendar-event {
          cursor: pointer;
          margin-bottom: 4px;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.875rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .calendar-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        }
        
        .calendar-event:active {
          opacity: 0.7;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        }
        
        .calendar-event input[type="checkbox"] {
          cursor: pointer;
        }
        
        .calendar-event button {
          transition: all 0.2s;
        }
        
        .calendar-event button:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        
        @keyframes pulse {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
        
        .animate-pulse {
          animation: pulse 1s infinite;
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}
