'use client';

import { useState, useEffect } from 'react';
import { Button, Container, Typography, Box, List, ListItem, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PencilIcon, TrashIcon, ClockIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';

interface Goal {
  id: string;
  title: string;
  description: string;
  importance: string;
  deadline: string;
  progress: number;
  parent_id?: string | null;
  subgoals?: Goal[];
}

interface GoalItemProps {
  goal: Goal;
  level?: number;
  onDragStart: (e: React.DragEvent, goalId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, goalId: string) => void;
  onEdit: (goalId: string) => void;
  onDelete: (goalId: string) => void;
  onClick: (goalId: string) => void;
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
    <>
      <li 
        key={goal.id} 
        className={`goal-item relative hover:bg-gray-50 cursor-pointer ${level === 0 ? 'px-4 py-4 sm:px-6' : 'px-3 py-2 sm:px-4'}`}
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
        <div className="absolute inset-0 hover:bg-gray-50 -z-10" />
        
        {/* Indentation line for subgoals */}
        {level > 0 && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-px bg-gray-200" 
            style={{ left: `${level * 2 - 0.5}rem` }}
          />
        )}

        <div className="flex items-center justify-between" style={{ marginLeft: `${level * 2}rem` }}>
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
          <div className="flex items-center space-x-2">
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
                e.stopPropagation();
                onDelete(goal.id);
              }}
            >
              <TrashIcon className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </li>
      {hasSubgoals && !isCollapsed && (
        goal.subgoals.map(subgoal => (
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
        ))
      )}
    </>
  );
};

export default function GoalManager() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await fetch('http://localhost:8005/api/goals');
      const data = await response.json();
      setGoals(data.map((goal: Goal) => ({
        ...goal,
        subgoals: goal.subgoals || []
      })));
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const handleCreateGoal = () => {
    router.push('/goals/new');
  };

  const handleGoalClick = (goalId: string) => {
    router.push(`/goals/${goalId}`);
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, goalId: string) => {
    e.dataTransfer.setData('goalId', goalId);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const goalItem = target.closest('.goal-item');
    if (goalItem) {
      goalItem.classList.add('drag-over');
    }
  };

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const goalItem = target.closest('.goal-item');
    if (goalItem) {
      goalItem.classList.remove('drag-over');
    }
  };

  // Handle drop
  const handleDrop = async (e: React.DragEvent, targetGoalId: string) => {
    e.preventDefault();
    const draggedGoalId = e.dataTransfer.getData('goalId');
    const target = e.target as HTMLElement;
    const goalItem = target.closest('.goal-item');
    if (goalItem) {
      goalItem.classList.remove('drag-over');
    }
    
    if (draggedGoalId === targetGoalId) return;

    // Prevent dropping a parent onto its own child
    const isTargetDescendant = (targetId: string, draggedId: string): boolean => {
      const target = goals.find(g => g.id === targetId);
      if (!target) return false;
      if (!target.subgoals) return false;
      
      return target.subgoals.some(subgoal => 
        subgoal.id === draggedId || isTargetDescendant(subgoal.id, draggedId)
      );
    };

    if (isTargetDescendant(draggedGoalId, targetGoalId)) {
      console.error("Cannot drop a goal into its own subgoal");
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

      // Refresh goals to show new hierarchy
      fetchGoals();
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const handleEditGoal = (goalId: string) => {
    router.push(`/goals/${goalId}/edit`);
  };

  const handleDeleteGoal = async (goalId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this goal?');
    if (!confirmed) return;

    try {
      const response = await fetch(`http://localhost:8005/api/goals/${goalId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete goal');
      }

      // Recursively filter out the deleted goal and its subgoals
      setGoals(prevGoals => {
        const filterDeletedGoal = (goals: Goal[]): Goal[] => {
          return goals
            .filter(goal => goal.id !== goalId)
            .map(goal => ({
              ...goal,
              subgoals: goal.subgoals ? filterDeletedGoal(goal.subgoals) : []
            }));
        };
        return filterDeletedGoal(prevGoals);
      });
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <Typography variant="h4" component="h1">
              My Goals
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateGoal}
            >
              Create New Goal
            </Button>
          </div>

          {/* Goals List */}
          <div className="bg-white shadow rounded-lg">
            <List>
              {goals
                .filter(goal => !goal.parent_id)
                .map(goal => (
                  <GoalItem
                    key={goal.id}
                    goal={goal}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onEdit={handleEditGoal}
                    onDelete={handleDeleteGoal}
                    onClick={handleGoalClick}
                  />
                ))}
            </List>
          </div>
        </div>
      </div>

      <style jsx>{`
        .goal-item.drag-over {
          border: 2px dashed #4f46e5;
          background-color: #f5f3ff;
        }
      `}</style>
    </div>
  );
}
