'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Button, 
  Container, 
  Typography, 
  Box, 
  List, 
  ListItem, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Chip, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Tab, 
  Tabs 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PencilIcon, TrashIcon, ClockIcon } from '@heroicons/react/24/solid';
import config from '@/config/config';

interface Goal {
  id: number;
  title: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  created_at: string;
  updated_at: string;
  user_id: number;
  parent_id?: number;
  current_strategy_id?: number;
  importance?: string;
  deadline?: string;
  progress?: number;
  subgoals?: Goal[];
  tasks?: Task[];
}

interface Task {
  id: number;
  completed: boolean;
  completed_at?: string;
  parent_id?: number;
}

interface GoalItemProps {
  goal: Goal;
  level?: number;
  onDragStart: (e: React.DragEvent, goalId: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, goalId: number) => void;
  onEdit: (goalId: number) => void;
  onDelete: (goalId: number) => void;
  onClick: (goalId: number) => void;
}

interface DeleteConfirmationDialogProps {
  open: boolean;
  goal: Goal | null;
  onClose: () => void;
  onConfirm: () => void;
}

interface DeleteConfirmationInputDialogProps {
  open: boolean;
  goal: Goal | null;
  onClose: () => void;
  onConfirm: () => void;
}

const GoalItem = ({ 
  goal, 
  level = 0,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onEdit,
  onDelete,
  onClick
}: GoalItemProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const hasSubgoals = goal.subgoals && goal.subgoals.length > 0;

  return (
    <div>
      <div 
        className={`goal-item relative hover:bg-gray-50 cursor-pointer ${
          level === 0 
            ? `px-4 py-4 sm:px-6 mb-4 rounded-lg border border-gray-200 shadow-sm` 
            : 'px-3 py-2 sm:px-4 mb-2 rounded border border-gray-100'
        }`}
        style={level > 0 ? { marginLeft: `${level * 2.5}rem` } : undefined}
        draggable
        onDragStart={(e) => onDragStart(e, goal.id)}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, goal.id)}
        onClick={(e) => {
          // Prevent click when dragging
          if (e.detail === 1) {
            onClick(goal.id);
          }
        }}
      >
        {/* Hover highlight that extends full width */}
        <div className={`absolute inset-0 hover:bg-gray-50 -z-10 ${level === 0 ? 'rounded-lg' : 'rounded'}`} />
        
        {/* Indentation line for subgoals */}
        {level > 0 && (
          <>
            <div 
              className="absolute left-0 top-0 bottom-1/2 w-px bg-gray-200" 
              style={{ left: `-0.75rem` }}
            />
            <div 
              className="absolute left-0 w-3 h-px bg-gray-200" 
              style={{ left: `-0.75rem`, top: '50%' }}
            />
          </>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {hasSubgoals && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCollapsed(!isCollapsed);
                }}
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
            <div>
              <div className="flex items-center space-x-2">
                <Typography>
                  {goal.title}
                </Typography>
                <div className="flex gap-1">
                </div>
              </div>
              {goal.description && (
                <Typography variant="body2" color="text.secondary">
                  {goal.description}
                </Typography>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {goal.priority && (
              <Chip 
                size="small"
                label={goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
                color={goal.priority === 'high' ? 'error' : goal.priority === 'medium' ? 'warning' : 'default'}
              />
            )}
            {goal.deadline && (
              <div className="flex items-center text-gray-500 text-sm">
                <ClockIcon className="h-4 w-4 mr-1" />
                {new Date(goal.deadline).toLocaleDateString()}
              </div>
            )}
            {goal.progress !== undefined && (
              <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                {goal.progress}%
              </Typography>
            )}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(goal.id);
              }}
            >
              <PencilIcon className="h-4 w-4" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(goal.id);
              }}
              className="z-10"
            >
              <TrashIcon className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </div>
      {hasSubgoals && !isCollapsed && goal.subgoals && (
        <div>
          {goal.subgoals.map(subgoal => (
            <GoalItem 
              key={subgoal.id} 
              goal={subgoal} 
              level={level + 1}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onEdit={onEdit}
              onDelete={onDelete}
              onClick={onClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DeleteConfirmationDialog = ({ open, goal, onClose, onConfirm }: DeleteConfirmationDialogProps) => {
  if (!goal) return null;
  
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Delete Goal</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete the goal "{goal.title}"? This will also delete all its subgoals.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>No</Button>
        <Button onClick={onConfirm} color="error">Yes</Button>
      </DialogActions>
    </Dialog>
  );
};

const DeleteConfirmationInputDialog = ({ open, goal, onClose, onConfirm }: DeleteConfirmationInputDialogProps) => {
  const [inputTitle, setInputTitle] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (open) {
      setInputTitle('');
      setError(false);
    }
  }, [open]);

  if (!goal) return null;

  const handleConfirm = () => {
    if (inputTitle === goal.title) {
      onConfirm();
    } else {
      setError(true);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Confirm Deletion</DialogTitle>
      <DialogContent>
        <Typography gutterBottom>
          To confirm deletion, please type the goal title:
          <br />
          <strong>{goal.title}</strong>
        </Typography>
        <TextField
          autoFocus
          fullWidth
          value={inputTitle}
          onChange={(e) => {
            setInputTitle(e.target.value);
            setError(false);
          }}
          error={error}
          helperText={error ? "Title doesn't match" : ''}
          margin="dense"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleConfirm();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} color="error">Delete</Button>
      </DialogActions>
    </Dialog>
  );
};

export default function GoalManager() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editedGoalData, setEditedGoalData] = useState({
    title: '',
    description: '',
    priority: '' as 'high' | 'medium' | 'low' | ''
  });
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showDeleteConfirmationInput, setShowDeleteConfirmationInput] = useState(false);
  const [collapsedGoals, setCollapsedGoals] = useState<Set<number>>(new Set());
  const [goalOrder, setGoalOrder] = useState<number[]>([]);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedGoalId, setDraggedGoalId] = useState<number | null>(null);
  const router = useRouter();

  const toggleCollapsed = (goalId: number) => {
    setCollapsedGoals(prev => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  };

  const calculateBadges = (goal: Goal) => {
    const badges = [];
    const now = new Date();
    
    // Hot streak - 3 consecutive daily tasks completed
    const recentCompletedTasks = goal.tasks?.filter(t => 
      t.completed && 
      t.completed_at && 
      new Date(t.completed_at).getTime() > now.getTime() - (3 * 24 * 60 * 60 * 1000)
    );
    if (recentCompletedTasks && recentCompletedTasks.length >= 3) {
      badges.push('🔥');
    }

    // Procrastinator - 2 days no activity
    const lastCompletedTask = goal.tasks?.find(t => t.completed);
    if (lastCompletedTask && 
        new Date(lastCompletedTask.completed_at!).getTime() < now.getTime() - (2 * 24 * 60 * 60 * 1000)) {
      badges.push('⏳');
    }

    // Frozen - 7 days no activity
    if (lastCompletedTask && 
        new Date(lastCompletedTask.completed_at!).getTime() < now.getTime() - (7 * 24 * 60 * 60 * 1000)) {
      badges.push('🧊');
    }

    // Momentum - completed parent task
    if (goal.tasks?.some(t => !t.parent_id && t.completed)) {
      badges.push('🚀');
    }

    // Goal completed
    if (goal.tasks?.every(t => t.completed)) {
      badges.push('🎖');
    }

    return badges;
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/api/goals`);
      if (!response.ok) {
        throw new Error('Failed to fetch goals');
      }
      const data = await response.json();
      setGoals(data);
      
      // Load or initialize goal order
      const savedOrder = localStorage.getItem('goalOrder');
      if (savedOrder) {
        // Use saved order
        setGoalOrder(JSON.parse(savedOrder));
      } else {
        // Create new order from top-level goals
        const topLevelGoals = data.filter((g: Goal) => !g.parent_id).map((g: Goal) => g.id);
        setGoalOrder(topLevelGoals);
        localStorage.setItem('goalOrder', JSON.stringify(topLevelGoals));
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const handleCreateGoal = () => {
    router.push('/goals/new');
  };

  const handleGoalClick = (goalId: number) => {
    router.push(`/goals/${goalId}`);
  };

  const handleDragStart = (e: React.DragEvent, goalId: number) => {
    if (isReordering) {
      // When reordering, track the goal ID being dragged
      setDraggedGoalId(goalId);
      e.dataTransfer.setData('goalId', goalId.toString());
    } else {
      // Normal drag for nesting goals
      e.dataTransfer.setData('goalId', goalId.toString());
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const goalItem = target.closest('.goal-item');
    if (goalItem) {
      goalItem.classList.add('drag-over');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    const goalItem = target.closest('.goal-item');
    if (goalItem) {
      goalItem.classList.remove('drag-over');
    }
  };

  const handleDrop = async (e: React.DragEvent, targetGoalId: number) => {
    e.preventDefault();
    
    if (isReordering) {
      // Handle reordering
      if (draggedGoalId === null) return;
      if (draggedGoalId === targetGoalId) return;
      
      // Get current order or create one if it doesn't exist
      const currentOrder = [...goalOrder];
      if (currentOrder.length === 0) {
        const topLevelGoals = goals.filter(g => !g.parent_id).map(g => g.id);
        currentOrder.push(...topLevelGoals);
      }
      
      // Remove the dragged goal from its current position
      const newOrder = currentOrder.filter(id => id !== draggedGoalId);
      
      // Find the index of the target goal
      const targetIndex = newOrder.indexOf(targetGoalId);
      
      // Insert the dragged goal at the new position
      if (targetIndex !== -1) {
        newOrder.splice(targetIndex, 0, draggedGoalId);
      } else {
        // If target not found, add to the end
        newOrder.push(draggedGoalId);
      }
      
      // Update state and save to localStorage
      setGoalOrder(newOrder);
      localStorage.setItem('goalOrder', JSON.stringify(newOrder));
      setDraggedGoalId(null);
    } else {
      // Handle nesting goals (original functionality)
      const draggedGoalId = parseInt(e.dataTransfer.getData('goalId'));
      
      if (draggedGoalId === targetGoalId) {
        return;
      }
  
      try {
        const response = await fetch(`http://localhost:8005/api/goals/${draggedGoalId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            parent_id: targetGoalId
          }),
        });
  
        if (!response.ok) {
          throw new Error('Failed to update goal');
        }
  
        fetchGoals();
      } catch (error) {
        console.error('Error updating goal:', error);
      }
    }
  };

  const handleEditGoal = (goalId: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    setEditingGoal(goal);
    setShowEditDialog(true);
  };

  const handleDeleteGoal = (goalId: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    setGoalToDelete(goal);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirmation = () => {
    setShowDeleteConfirmation(false);
    setShowDeleteConfirmationInput(true);
  };

  const handleFinalDeleteConfirmation = async () => {
    if (!goalToDelete) return;

    try {
      const response = await fetch(`http://localhost:8005/api/goals/${goalToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete goal');
      }

      setShowDeleteConfirmationInput(false);
      setGoalToDelete(null);
      fetchGoals();
      router.push('/'); // Redirect to goals list after successful deletion
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const handleEditGoalSubmit = async () => {
    if (!editingGoal) return;

    try {
      const response = await fetch(`${config.apiUrl}/api/goals/${editingGoal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editedGoalData.title,
          description: editedGoalData.description,
          priority: editedGoalData.priority || null
        }),
      });

      if (response.ok) {
        fetchGoals();
        setShowEditDialog(false);
        setEditingGoal(null);
      }
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  // Reset edit form when a goal is selected for editing
  useEffect(() => {
    if (editingGoal) {
      setEditedGoalData({
        title: editingGoal.title || '',
        description: editingGoal.description || '',
        priority: editingGoal.priority || ''
      });
    }
  }, [editingGoal]);

  const renderGoal = (goal: Goal, level = 0) => {
    const badges = calculateBadges(goal);
    const hasSubgoals = goal.subgoals && goal.subgoals.length > 0;
    const isCollapsed = collapsedGoals.has(goal.id);

    return (
      <div key={goal.id}>
        <div 
          className={`
            ${
              level === 0 
                ? `px-4 py-4 sm:px-6 mb-4 rounded-lg border border-gray-200 shadow-sm` 
                : 'px-3 py-2 sm:px-4 mb-2 rounded border border-gray-100'
            }
            hover:shadow-md transition-shadow bg-white
          `}
          style={level > 0 ? { marginLeft: `${level * 2.5}rem` } : undefined}
          draggable
          onDragStart={(e) => handleDragStart(e, goal.id)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, goal.id)}
          onClick={() => handleGoalClick(goal.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {hasSubgoals && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapsed(goal.id);
                  }}
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
              <div>
                <div className="flex items-center space-x-2">
                  <Typography>
                    {goal.title}
                  </Typography>
                  <div className="flex gap-1">
                    {badges.map((badge, index) => (
                      <span key={index} className="text-lg">{badge}</span>
                    ))}
                  </div>
                  {goal.deadline && (
                    <div className="flex items-center text-gray-500 text-sm">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {new Date(goal.deadline).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {goal.description && (
                  <Typography variant="body2" color="text.secondary">
                    {goal.description}
                  </Typography>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {goal.priority && (
                <Chip 
                  size="small"
                  label={goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
                  color={goal.priority === 'high' ? 'error' : goal.priority === 'medium' ? 'warning' : 'default'}
                />
              )}
              {goal.progress !== undefined && (
                <Typography variant="body2" color="text.secondary">
                  {goal.progress}%
                </Typography>
              )}
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingGoal(goal);
                  setShowEditDialog(true);
                }}
                className="text-gray-600 hover:text-blue-600"
                size="small"
              >
                <PencilIcon className="h-4 w-4" />
              </IconButton>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setGoalToDelete(goal);
                  setShowDeleteConfirmation(true);
                }}
                className="text-red-600"
                size="small"
              >
                <TrashIcon className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
        </div>
        {!isCollapsed && goal.subgoals ? goal.subgoals.map(subgoal => renderGoal(subgoal, level + 1)) : null}
      </div>
    );
  };

  // Toggle between reordering mode and normal mode
  const toggleReorderingMode = () => {
    setIsReordering(!isReordering);
  };
  
  // Sort goals based on the stored order
  const getSortedTopLevelGoals = () => {
    // Get top-level goals
    const topLevelGoals = goals.filter(goal => !goal.parent_id);
    
    // If we have no goals or no order, just return the goals as-is
    if (topLevelGoals.length === 0 || goalOrder.length === 0) {
      return topLevelGoals;
    }
    
    // Sort according to the stored order
    return [...topLevelGoals].sort((a, b) => {
      const indexA = goalOrder.indexOf(a.id);
      const indexB = goalOrder.indexOf(b.id);
      
      // If a goal is not in the order, put it at the end
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      
      return indexA - indexB;
    });
  };

  const handleAIRecommenderClick = () => {
    router.push('/ai-recommender');
  };

  return (
    <Container maxWidth="lg" className="py-8">
      <Box className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <Typography variant="h4" component="h1" className="text-gray-900">
            Goals
          </Typography>
          <div className="flex gap-2">
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateGoal}
              disabled={isReordering}
            >
              New Goal
            </Button>
            <Button
              variant={isReordering ? "contained" : "outlined"}
              color={isReordering ? "secondary" : "primary"}
              onClick={toggleReorderingMode}
            >
              {isReordering ? "Done" : "Reorder"}
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleAIRecommenderClick}
              disabled={isReordering}
            >
              AI Recommend
            </Button>
          </div>
        </div>
        
        {isReordering && (
          <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
            <Typography variant="body2">
              Drag goals up or down to reorder them. Click "Done" when finished.
            </Typography>
          </div>
        )}

        <List className="space-y-1">
          {getSortedTopLevelGoals().map(goal => renderGoal(goal))}
        </List>
      </Box>

      <DeleteConfirmationDialog
        open={showDeleteConfirmation}
        goal={goalToDelete}
        onClose={() => {
          setShowDeleteConfirmation(false);
          setGoalToDelete(null);
        }}
        onConfirm={handleDeleteConfirmation}
      />

      <DeleteConfirmationInputDialog
        open={showDeleteConfirmationInput}
        goal={goalToDelete}
        onClose={() => {
          setShowDeleteConfirmationInput(false);
          setGoalToDelete(null);
        }}
        onConfirm={handleFinalDeleteConfirmation}
      />

      <Dialog 
        open={showEditDialog} 
        onClose={() => setShowEditDialog(false)}
      >
        <DialogTitle>Edit Goal</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            type="text"
            fullWidth
            value={editedGoalData.title}
            onChange={(e) => setEditedGoalData(prev => ({ ...prev, title: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Description"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={editedGoalData.description}
            onChange={(e) => setEditedGoalData(prev => ({ ...prev, description: e.target.value }))}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Priority</InputLabel>
            <Select
              value={editedGoalData.priority}
              onChange={(e) => setEditedGoalData(prev => ({ ...prev, priority: e.target.value as 'high' | 'medium' | 'low' | '' }))}
              label="Priority"
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(false)}>Cancel</Button>
          <Button onClick={handleEditGoalSubmit}>Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
