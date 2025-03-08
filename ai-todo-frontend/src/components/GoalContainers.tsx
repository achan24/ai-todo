'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  IconButton,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { Goal } from '@/types/goals';

// Define container interface
interface GoalContainer {
  id: string;
  name: string;
  color: string;
  goalIds: number[];
}

interface GoalContainersProps {
  goals: Goal[];
  onGoalClick: (goalId: number) => void;
}

export default function GoalContainers({ goals, onGoalClick }: GoalContainersProps) {
  const [containers, setContainers] = useState<GoalContainer[]>([]);
  const [unassignedGoals, setUnassignedGoals] = useState<Goal[]>([]);
  const [showAddContainer, setShowAddContainer] = useState(false);
  const [editingContainer, setEditingContainer] = useState<GoalContainer | null>(null);
  const [newContainer, setNewContainer] = useState({
    name: '',
    color: '#e2e8f0' // Default light gray
  });
  const [draggedGoal, setDraggedGoal] = useState<number | null>(null);
  const [dragOverContainer, setDragOverContainer] = useState<string | null>(null);

  // Load containers from localStorage on mount
  useEffect(() => {
    const savedContainers = localStorage.getItem('goalContainers');
    if (savedContainers) {
      setContainers(JSON.parse(savedContainers));
    } else {
      // Initialize with a default container if none exist
      const defaultContainer: GoalContainer = {
        id: 'default',
        name: 'My Goals',
        color: '#e2e8f0',
        goalIds: []
      };
      setContainers([defaultContainer]);
      localStorage.setItem('goalContainers', JSON.stringify([defaultContainer]));
    }
  }, []);

  // Update unassigned goals whenever goals or containers change
  useEffect(() => {
    if (goals.length > 0 && containers.length > 0) {
      // Get all assigned goal IDs
      const assignedGoalIds = new Set(
        containers.flatMap(container => container.goalIds)
      );
      
      // Filter out goals that are already assigned to containers
      const unassigned = goals.filter(goal => 
        !assignedGoalIds.has(goal.id) && !goal.parent_id
      );
      
      setUnassignedGoals(unassigned);
    }
  }, [goals, containers]);

  // Save containers to localStorage whenever they change
  useEffect(() => {
    if (containers.length > 0) {
      localStorage.setItem('goalContainers', JSON.stringify(containers));
    }
  }, [containers]);

  const handleAddContainer = () => {
    if (!newContainer.name.trim()) return;
    
    const newContainerObj: GoalContainer = {
      id: Date.now().toString(),
      name: newContainer.name,
      color: newContainer.color,
      goalIds: []
    };
    
    setContainers([...containers, newContainerObj]);
    setNewContainer({ name: '', color: '#e2e8f0' });
    setShowAddContainer(false);
  };

  const handleEditContainer = () => {
    if (!editingContainer || !editingContainer.name.trim()) return;
    
    setContainers(containers.map(container => 
      container.id === editingContainer.id 
        ? { ...container, name: editingContainer.name, color: editingContainer.color }
        : container
    ));
    
    setEditingContainer(null);
  };

  const handleDeleteContainer = (containerId: string) => {
    // Find the container to delete
    const containerToDelete = containers.find(c => c.id === containerId);
    if (!containerToDelete) return;
    
    // Remove the container
    setContainers(containers.filter(container => container.id !== containerId));
    
    // Any goals in the deleted container become unassigned
    setUnassignedGoals([...unassignedGoals, 
      ...goals.filter(goal => containerToDelete.goalIds.includes(goal.id))
    ]);
  };

  const handleDragStart = (goalId: number) => {
    setDraggedGoal(goalId);
  };

  const handleDragOver = (e: React.DragEvent, containerId: string) => {
    e.preventDefault();
    setDragOverContainer(containerId);
  };

  const handleDragLeave = () => {
    setDragOverContainer(null);
  };

  const handleDrop = (e: React.DragEvent, containerId: string) => {
    e.preventDefault();
    setDragOverContainer(null);
    
    if (draggedGoal === null) return;
    
    // Remove goal from its current container
    const updatedContainers = containers.map(container => ({
      ...container,
      goalIds: container.goalIds.filter(id => id !== draggedGoal)
    }));
    
    // Add goal to the new container
    const finalContainers = updatedContainers.map(container => 
      container.id === containerId
        ? { ...container, goalIds: [...container.goalIds, draggedGoal] }
        : container
    );
    
    setContainers(finalContainers);
    setDraggedGoal(null);
  };

  const handleUnassignedDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (draggedGoal === null) return;
    
    // Remove goal from all containers
    const updatedContainers = containers.map(container => ({
      ...container,
      goalIds: container.goalIds.filter(id => id !== draggedGoal)
    }));
    
    setContainers(updatedContainers);
    setDraggedGoal(null);
  };

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <Typography variant="h5" component="h2">Goal Boards</Typography>
        <Button 
          variant="outlined" 
          startIcon={<AddIcon />}
          onClick={() => setShowAddContainer(true)}
        >
          Add Board
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Container for unassigned goals */}
        <Paper 
          className="p-4 min-w-[300px] min-h-[200px] flex-1"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleUnassignedDrop}
        >
          <Typography variant="h6" className="mb-3">Unassigned Goals</Typography>
          <div className="space-y-2">
            {unassignedGoals.map(goal => (
              <Paper 
                key={goal.id}
                className="p-3 cursor-pointer hover:bg-gray-50 flex items-center"
                draggable
                onDragStart={() => handleDragStart(goal.id)}
                onClick={() => onGoalClick(goal.id)}
              >
                <DragIndicatorIcon className="mr-2 text-gray-400" />
                <div className="flex-1">
                  <Typography variant="body1">{goal.title}</Typography>
                  {goal.description && (
                    <Typography variant="body2" className="text-gray-500 truncate">
                      {goal.description}
                    </Typography>
                  )}
                </div>
              </Paper>
            ))}
            {unassignedGoals.length === 0 && (
              <Typography variant="body2" className="text-gray-500 italic">
                No unassigned goals
              </Typography>
            )}
          </div>
        </Paper>

        {/* Goal containers */}
        {containers.map(container => {
          const containerGoals = goals.filter(goal => 
            container.goalIds.includes(goal.id)
          );
          
          return (
            <Paper 
              key={container.id}
              className={`p-4 min-w-[300px] min-h-[200px] flex-1 ${
                dragOverContainer === container.id ? 'border-2 border-blue-400' : ''
              }`}
              style={{ backgroundColor: container.color }}
              onDragOver={(e) => handleDragOver(e, container.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, container.id)}
            >
              <div className="flex justify-between items-center mb-3">
                <Typography variant="h6">{container.name}</Typography>
                <div>
                  <Tooltip title="Edit board">
                    <IconButton 
                      size="small"
                      onClick={() => setEditingContainer({ ...container })}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {containers.length > 1 && (
                    <Tooltip title="Delete board">
                      <IconButton 
                        size="small"
                        onClick={() => handleDeleteContainer(container.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                {containerGoals.map(goal => (
                  <Paper 
                    key={goal.id}
                    className="p-3 cursor-pointer hover:bg-gray-50 flex items-center"
                    draggable
                    onDragStart={() => handleDragStart(goal.id)}
                    onClick={() => onGoalClick(goal.id)}
                  >
                    <DragIndicatorIcon className="mr-2 text-gray-400" />
                    <div className="flex-1">
                      <Typography variant="body1">{goal.title}</Typography>
                      {goal.description && (
                        <Typography variant="body2" className="text-gray-500 truncate">
                          {goal.description}
                        </Typography>
                      )}
                    </div>
                  </Paper>
                ))}
                {containerGoals.length === 0 && (
                  <Typography variant="body2" className="text-gray-500 italic">
                    Drag goals here
                  </Typography>
                )}
              </div>
            </Paper>
          );
        })}
      </div>

      {/* Add Container Dialog */}
      <Dialog 
        open={showAddContainer} 
        onClose={() => setShowAddContainer(false)}
      >
        <DialogTitle>Add New Board</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Board Name"
            fullWidth
            value={newContainer.name}
            onChange={(e) => setNewContainer({ ...newContainer, name: e.target.value })}
          />
          <div className="mt-4">
            <Typography variant="body2" className="mb-2">Board Color</Typography>
            <div className="flex gap-2">
              {['#e2e8f0', '#fecaca', '#bfdbfe', '#bbf7d0', '#fef3c7'].map(color => (
                <div 
                  key={color}
                  className={`w-8 h-8 rounded-full cursor-pointer ${
                    newContainer.color === color ? 'ring-2 ring-blue-500' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewContainer({ ...newContainer, color })}
                />
              ))}
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddContainer(false)}>Cancel</Button>
          <Button onClick={handleAddContainer}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Container Dialog */}
      <Dialog 
        open={!!editingContainer} 
        onClose={() => setEditingContainer(null)}
      >
        <DialogTitle>Edit Board</DialogTitle>
        <DialogContent>
          {editingContainer && (
            <>
              <TextField
                autoFocus
                margin="dense"
                label="Board Name"
                fullWidth
                value={editingContainer.name}
                onChange={(e) => setEditingContainer({ 
                  ...editingContainer, 
                  name: e.target.value 
                })}
              />
              <div className="mt-4">
                <Typography variant="body2" className="mb-2">Board Color</Typography>
                <div className="flex gap-2">
                  {['#e2e8f0', '#fecaca', '#bfdbfe', '#bbf7d0', '#fef3c7'].map(color => (
                    <div 
                      key={color}
                      className={`w-8 h-8 rounded-full cursor-pointer ${
                        editingContainer.color === color ? 'ring-2 ring-blue-500' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditingContainer({ 
                        ...editingContainer, 
                        color 
                      })}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingContainer(null)}>Cancel</Button>
          <Button onClick={handleEditContainer}>Save</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
