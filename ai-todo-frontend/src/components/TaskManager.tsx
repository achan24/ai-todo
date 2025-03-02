'use client';

import { useState, useEffect } from 'react';
import { PencilIcon, TrashIcon, TagIcon, SparklesIcon, ClockIcon, CalendarIcon } from '@heroicons/react/24/solid';
import EditTaskDialog from './EditTaskDialog';
import ContributionDialog from './ContributionDialog';
import config from '../config';

interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  tags: string[];
  ai_confidence?: number;
  estimated_minutes?: number;
  due_date?: string;
  subtasks?: Task[];
  metric_id?: number | null;
  contribution_value?: number;
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
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <p className={`${level === 0 ? 'text-sm' : 'text-xs'} font-medium text-gray-900 ${task.completed ? 'line-through text-gray-500' : ''}`}>
                  {task.title}
                </p>
                <div className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                  task.priority === 'high' ? 'bg-red-100 text-red-800' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {task.priority}
                </div>
                {task.estimated_minutes && (
                  <span className="flex items-center text-xs text-gray-500">
                    <ClockIcon className={`${level === 0 ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />
                    {task.estimated_minutes} min
                  </span>
                )}
                {task.due_date && (
                  <span className="flex items-center text-xs text-gray-500">
                    <CalendarIcon className={`${level === 0 ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />
                    {new Date(task.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
              {task.description && (
                <p className={`${level === 0 ? 'text-sm' : 'text-xs'} text-gray-500 mt-0.5`}>
                  {task.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {task.tags && task.tags.length > 0 && (
              <div className="flex space-x-1">
                {task.tags.map((tag, index) => (
                  <span key={index} className={`inline-flex items-center px-1.5 py-0.5 rounded-full ${level === 0 ? 'text-xs' : 'text-[10px]'} font-medium bg-blue-100 text-blue-800`}>
                    <TagIcon className={`${level === 0 ? 'h-3 w-3' : 'h-2.5 w-2.5'} mr-0.5`} />
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={() => onEdit(task)}
              className="p-1 rounded-full hover:bg-gray-200"
            >
              <PencilIcon className={`${level === 0 ? 'h-4 w-4' : 'h-3.5 w-3.5'} text-gray-400`} />
            </button>
            <button
              onClick={() => onDelete(task.id, task.title)}
              className="p-1 rounded-full hover:bg-gray-200"
            >
              <TrashIcon className={`${level === 0 ? 'h-4 w-4' : 'h-3.5 w-3.5'} text-gray-400`} />
            </button>
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

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isContributionDialogOpen, setIsContributionDialogOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [recommendedTask, setRecommendedTask] = useState<Task | null>(null);

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${config.apiUrl}/api/tasks`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const data = await response.json();
      console.log('Raw task data:', JSON.stringify(data, null, 2));
      setTasks(data.map((task: Task) => ({
        ...task,
        tags: task.tags || [],
        subtasks: task.subtasks || []  // Ensure subtasks is never undefined
      })));
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Add task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const response = await fetch(`${config.apiUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTaskTitle,
          priority: 'medium',
          tags: []
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add task');
      }

      const newTask = await response.json();
      setTasks([...tasks, { ...newTask, tags: newTask.tags || [] }]);
      setNewTaskTitle('');
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  // Toggle task completion
  const handleToggleComplete = async (taskId: number, currentStatus: boolean) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      if (!currentStatus && task.metric_id) {
        // If completing a task with a metric, show contribution dialog
        setCompletingTask(task);
        setIsContributionDialogOpen(true);
        return;
      }

      // Otherwise just toggle completion
      const response = await fetch(`${config.apiUrl}/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contribution_value: null,
          metric_id: null
        }),
      });

      if (response.ok) {
        setTasks(tasks.map(task => 
          task.id === taskId ? { ...task, completed: !currentStatus } : task
        ));
      }
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };

  const handleContributionSubmit = async (contribution: { metric_id: number; contribution_value: number }) => {
    if (!completingTask) return;

    try {
      const response = await fetch(`${config.apiUrl}/api/tasks/${completingTask.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contribution),
      });

      if (response.ok) {
        // Update tasks state
        setTasks(tasks.map(task => 
          task.id === completingTask.id ? { ...task, completed: true } : task
        ));

        // Fetch updated metric data
        const metricResponse = await fetch(`${config.apiUrl}/api/metrics/${contribution.metric_id}`);
        if (metricResponse.ok) {
          const updatedMetric = await metricResponse.json();
          // Update the metric in any components that need it
          // This will trigger a re-render of components using this metric
          const event = new CustomEvent('metricUpdated', { detail: updatedMetric });
          window.dispatchEvent(event);
        }
      }
    } catch (error) {
      console.error('Error completing task with contribution:', error);
    }

    setCompletingTask(null);
  };

  // Update task
  const handleUpdateTask = async (taskId: number, updates: Partial<Task>) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updates,
          metric_id: updates.metric_id === undefined ? null : updates.metric_id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      const updatedTask = await response.json();

      // Update the task in the state tree
      setTasks(prevTasks => {
        const updateTaskInTree = (tasks: Task[]): Task[] => {
          return tasks.map(task => {
            if (task.id === taskId) {
              return { ...task, ...updatedTask };
            }
            if (task.subtasks) {
              return { ...task, subtasks: updateTaskInTree(task.subtasks) };
            }
            return task;
          });
        };
        return updateTaskInTree(prevTasks);
      });
      setIsEditModalOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  // Delete task
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

      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Get AI recommendation
  const getNextTask = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/api/tasks/next`);
      if (!response.ok) {
        throw new Error('Failed to get next task');
      }
      const data = await response.json();
      setRecommendedTask(data);
    } catch (error) {
      console.error('Error getting next task:', error);
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

      // Refresh tasks to show new hierarchy
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
            <button 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={fetchTasks}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              What Should I Do Next?
            </button>
          </div>

          {/* AI Recommendation Section */}
          <div className="mb-6">
            <button
              onClick={getNextTask}
              className="mb-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded flex items-center"
            >
              <SparklesIcon className="h-5 w-5 mr-2" />
              What Should I Do Next?
            </button>
            
            {recommendedTask && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-purple-900">AI Recommends:</h3>
                    <p className="text-purple-800">{recommendedTask.title}</p>
                    {recommendedTask.description && (
                      <p className="text-sm text-purple-600 mt-1">{recommendedTask.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm text-purple-700">
                      Confidence: {Math.round(recommendedTask.ai_confidence * 100)}%
                    </div>
                    <button
                      onClick={() => handleToggleComplete(recommendedTask.id, recommendedTask.completed)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded"
                    >
                      Start Now
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quick Add Task */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900">Quick Add Task</h3>
                <div className="mt-5 space-y-4">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTask(e);
                      }
                    }}
                  />
                  <button 
                    className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={handleAddTask}
                    disabled={isLoading || !newTaskTitle.trim()}
                  >
                    {isLoading ? 'Adding...' : 'Add Task'}
                  </button>
                </div>
              </div>
            </div>

            {/* Voice Note */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900">Voice Note</h3>
                <div className="mt-5">
                  <button className="w-full inline-flex justify-center items-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                    Record Thought
                  </button>
                </div>
              </div>
            </div>

            {/* Daily Check-In */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900">Daily Check-In</h3>
                <p className="mt-2 text-sm text-gray-500">How are you feeling about your tasks today?</p>
                <div className="mt-5">
                  <button className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Start Check-In
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul role="list" className="divide-y divide-gray-200">
              {tasks.map((task) => (
                <TaskItem 
                  key={task.id} 
                  task={task}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onToggleComplete={handleToggleComplete}
                  onEdit={(task) => {
                    setEditingTask(task);
                    setIsEditModalOpen(true);
                  }}
                  onDelete={handleDeleteTask}
                />
              ))}
            </ul>
          </div>

          {/* Edit Task Dialog */}
          <EditTaskDialog
            task={editingTask}
            open={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setEditingTask(null);
            }}
            onSave={(updatedTask) => {
              if (editingTask) {
                handleUpdateTask(editingTask.id, updatedTask);
              }
            }}
          />

          {/* Contribution Dialog */}
          <ContributionDialog
            isOpen={isContributionDialogOpen}
            onClose={() => {
              setIsContributionDialogOpen(false);
              setCompletingTask(null);
            }}
            onSubmit={handleContributionSubmit}
            metricId={completingTask?.metric_id}
            initialValue={completingTask?.contribution_value}
          />
        </div>
      </div>
      <style jsx>{`
        .task-item.drag-over {
          border: 2px dashed #4f46e5;
          background-color: #f5f3ff;
        }
      `}</style>
    </div>
  );
}
