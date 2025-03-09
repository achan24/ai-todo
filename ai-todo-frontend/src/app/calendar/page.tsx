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
  TableRow
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { format, addDays, startOfWeek, addHours, parseISO, isToday } from 'date-fns';
import './calendar.css';
import config from '@/config/config';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import './calendar.css';

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
  const calendarRef = useRef<HTMLDivElement>(null);
  
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

  // Fetch all tasks and convert to calendar events
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${config.apiUrl}/api/tasks`);
        if (!response.ok) {
          throw new Error('Failed to fetch tasks');
        }
        const data = await response.json();
        setTasks(data);
        
        // Filter starred tasks - include both top-level tasks and subtasks
        // First, collect all tasks including subtasks into a flat array
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
        const starred = allTasks.filter(task => task.is_starred && !task.completed);
        setStarredTasks(starred);
        
        // Convert tasks with scheduled_time to calendar events
        const events = data
          .filter((task: Task) => task.scheduled_time)
          .map((task: Task) => {
            const startTime = new Date(task.scheduled_time || '');
            // Default end time is 1 hour after start time
            const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
            
            // Extract timer data from metadata if available
            let timerData = { elapsedTime: undefined, timerActive: false };
            if (task.metadata) {
              try {
                const metadata = JSON.parse(task.metadata);
                if (metadata.timerData && metadata.timerData.elapsedTime > 0) {
                  // Only use timer data if it has a non-zero elapsed time
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
              timerActive: task.completed ? false : timerData.timerActive, // Don't activate timer for completed tasks
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

    fetchTasks();
  }, []);

  // Toggle star status
  const toggleStar = async (taskId: number) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/tasks/${taskId}/star`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        throw new Error('Failed to update task star status');
      }
      
      const updatedTask = await response.json();
      
      // Update tasks state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, is_starred: updatedTask.is_starred } : task
        )
      );
      
      // Update starred tasks
      if (updatedTask.is_starred) {
        setStarredTasks(prev => [...prev, updatedTask]);
      } else {
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
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error('Task not found:', taskId);
        return;
      }
      
      const newCompletionStatus = !task.completed;
      
      // Optimistically update UI first
      // Update tasks state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, completed: newCompletionStatus } : task
        )
      );
      
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
      console.log('Task completion status updated:', updatedTask);
      
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
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

  // Helper function to find a task by ID in a nested structure
  const findTaskById = (taskId: number, taskList: Task[]): Task | null => {
    // First check in the current level
    const foundTask = taskList.find(t => t.id === taskId);
    if (foundTask) return foundTask;
    
    // If not found, recursively check in subtasks
    for (const task of taskList) {
      if (task.subtasks && task.subtasks.length > 0) {
        const foundInSubtasks = findTaskById(taskId, task.subtasks);
        if (foundInSubtasks) return foundInSubtasks;
      }
    }
    
    return null;
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
          completed: task.completed
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
      
      // Update tasks state with server response
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, scheduled_time: updatedTask.scheduled_time } : task
        )
      );
      
      // Update starred tasks if it's a starred task
      if (updatedTask.is_starred) {
        setStarredTasks(prev => 
          prev.map(task => 
            task.id === taskId ? { ...task, scheduled_time: updatedTask.scheduled_time } : task
          )
        );
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
    e.dataTransfer.setData('text/plain', task.id.toString());
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
          opacity: event.completed ? 0.7 : 1
        }}
        draggable
        onDragStart={(e) => {
          const task = tasks.find(t => t.id.toString() === event.id);
          if (task) handleDragStart(e, task);
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

  return (
    <div className="container mx-auto p-4">
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
                    className="task-item"
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, task)}
                  >
                    <div className="flex justify-between items-center">
                      <Typography variant="body1">
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
                    {task.scheduled_time && (
                      <Typography variant="caption" color="text.secondary">
                        Scheduled: {format(new Date(task.scheduled_time), 'h:mm a')}
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
                <TableContainer component={Paper} sx={{ maxHeight: '550px', overflow: 'auto' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell width="15%">Time</TableCell>
                        <TableCell>Events</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Current time indicator for day view */}
                      {isToday(currentDate) && (
                        <div 
                          ref={currentTimeRef}
                          className="current-time-indicator"
                          style={{
                            position: 'absolute',
                            left: '15%', // Align with the start of the Events column
                            right: 0,
                            // Calculate position based on time slots
                            // Each hour has 4 slots (15min each), and each slot is 30px
                            // Total day height is 24h * 4 slots * 30px = 2880px
                            top: `${(new Date().getHours() * 120) + (new Date().getMinutes() / 60 * 120)}px`,
                            height: '2px',
                            backgroundColor: 'red',
                            zIndex: 100,
                            pointerEvents: 'none'
                          }}
                        >
                          <div 
                            style={{
                              position: 'absolute',
                              left: '-5px',
                              top: '-4px',
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: 'red'
                            }}
                          />
                        </div>
                      )}
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
                <TableContainer component={Paper} sx={{ maxHeight: '550px', overflow: 'auto' }}>
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
                      {/* Current time indicator for week view */}
                      {getDaysInWeek(currentDate).some(day => isToday(day)) && (
                        <div 
                          ref={currentTimeRef}
                          className="current-time-indicator"
                          style={{
                            position: 'absolute',
                            left: '10%', // Align with the start of the day columns
                            right: 0,
                            // Calculate position based on time slots
                            // Each hour has 4 slots (15min each), and each slot is 30px
                            // Total day height is 24h * 4 slots * 30px = 2880px
                            top: `${(new Date().getHours() * 120) + (new Date().getMinutes() / 60 * 120)}px`,
                            height: '2px',
                            backgroundColor: 'red',
                            zIndex: 100,
                            pointerEvents: 'none'
                          }}
                        >
                          <div 
                            style={{
                              position: 'absolute',
                              left: '-5px',
                              top: '-4px',
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: 'red'
                            }}
                          />
                        </div>
                      )}
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
                      color={task.is_starred ? "warning" : "default"}
                    >
                      {task.is_starred ? <StarIcon /> : <StarBorderIcon />}
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
