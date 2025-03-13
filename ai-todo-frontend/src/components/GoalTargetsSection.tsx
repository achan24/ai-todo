'use client';

import React, { useState, useEffect, Fragment } from 'react';
import {
  Box,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Chip,
  FormHelperText,
  Grid,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  DragIndicator as DragIndicatorIcon,
  AccountTree as AccountTreeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  ViewColumn as ViewColumnIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  CheckCircle as CheckCircleIcon,
  CenterFocusStrong as CenterFocusStrongIcon,
  Undo as UndoIcon,
} from '@mui/icons-material';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import config from '@/config/config';

interface GoalTarget {
  id: string;
  goal_id: number;
  title: string;
  description: string | null;
  status: string;
  position: number | null;
  deadline: string | null;
  notes: string;
  goaltarget_parent_id: string | null;
  created_at: string;
  updated_at: string;
  children?: GoalTarget[];
}

interface GoalTargetsSectionProps {
  goalId: string;
  onTargetAdded?: (target: GoalTarget) => void;
  onTargetUpdated?: (target: GoalTarget) => void;
  onTargetDeleted?: (targetId: number) => void;
}

const GoalTargetsSection: React.FC<GoalTargetsSectionProps> = ({
  goalId,
  onTargetAdded,
  onTargetUpdated,
  onTargetDeleted,
}) => {
  const [targets, setTargets] = useState<GoalTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddTargetModal, setShowAddTargetModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState<GoalTarget | null>(null);
  const [viewMode, setViewMode] = useState<string>('traditional');
  const [newTarget, setNewTarget] = useState<Partial<GoalTarget>>({
    title: '',
    description: '',
    deadline: null,
    status: 'concept',
    notes: '[]',
    goal_id: parseInt(goalId),
    goaltarget_parent_id: null,
    position: null
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  // State for tracking expanded/collapsed state of parent targets
  const [collapsedTargets, setCollapsedTargets] = useState<string[]>([]);

  useEffect(() => {
    // Add CSS for drag and drop
    const style = document.createElement('style');
    style.innerHTML = `
      .target-item {
        transition: all 0.2s ease;
        position: relative;
      }
      .target-item-child {
        margin-left: 2rem !important;
        width: calc(100% - 2.5rem) !important;
        padding-left: 1rem !important;
        background-color: #fafafa;
        font-size: 0.95rem;
      }
      .target-parent-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.5rem;
        color: #666;
        font-size: 0.85rem;
      }
      .dragging {
        opacity: 0.5;
        border: 2px dashed #aaa !important;
      }
      .drag-over {
        background-color: #f0f7ff !important;
        border: 2px dashed #2196f3 !important;
      }
      .drag-handle {
        cursor: grab;
        color: #999;
      }
      .drag-handle:hover {
        color: #555;
      }
      .expand-button {
        margin-right: 8px;
        color: #666;
        background-color: #f5f5f5;
        border-radius: 50%;
      }
      .expand-button:hover {
        color: #000;
        background-color: #e0e0e0;
      }
      .target-children-container {
        margin-left: 2.5rem;
        padding-left: 0.5rem;
        margin-bottom: 1rem;
      }
      .child-target-text {
        font-size: 0.95rem;
      }
      .child-count-badge {
        margin-left: 8px;
        font-size: 0.75rem;
        background-color: #f0f0f0;
        color: #666;
        border-radius: 10px;
        padding: 2px 6px;
        display: inline-flex;
        align-items: center;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Fetch targets when component mounts or goalId changes
  useEffect(() => {
    fetchTargets();
  }, [goalId]);

  const fetchTargets = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${config.apiUrl}/api/goals/${goalId}/targets`);

      if (!response.ok) {
        throw new Error(`Failed to fetch targets: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Raw data from backend:', data);
      console.log('Raw data types:', data.map((t: any) => ({ 
        id: t.id, 
        idType: typeof t.id,
        parentId: t.goaltarget_parent_id,
        parentIdType: typeof t.goaltarget_parent_id
      })));
      
      // Ensure all IDs are strings for consistent comparison
      const processedData = data.map((target: any) => ({
        ...target,
        id: String(target.id),
        goal_id: Number(target.goal_id),
        // Keep goaltarget_parent_id as string or null as expected by the backend
      }));
      
      console.log('Processed data:', processedData);
      console.log('Processed data types:', processedData.map((t: any) => ({ 
        id: t.id, 
        idType: typeof t.id,
        parentId: t.goaltarget_parent_id,
        parentIdType: typeof t.goaltarget_parent_id
      })));
      
      setTargets(processedData);
    } catch (error) {
      console.error('Error fetching targets:', error);
      setError('Failed to load targets');
    } finally {
      setLoading(false);
    }
  };

  const validateTarget = (target: Partial<GoalTarget>): boolean => {
    const errors: Record<string, string> = {};

    if (!target.title?.trim()) {
      errors.title = 'Title is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddTarget = async () => {
    if (!validateTarget(newTarget)) return;

    try {
      // Ensure data is properly formatted for the backend
      const targetToCreate = {
        ...newTarget,
        goal_id: parseInt(goalId),
        notes: newTarget.notes || '[]',
        position: newTarget.position || 0,
        // Ensure goaltarget_parent_id is null if empty string
        goaltarget_parent_id: newTarget.goaltarget_parent_id || null
      };

      const response = await fetch(`${config.apiUrl}/api/goals/${goalId}/targets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(targetToCreate),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error('Failed to add target');
      }

      const addedTarget = await response.json();
      setTargets([...targets, addedTarget]);
      setShowAddTargetModal(false);
      setNewTarget({
        title: '',
        description: '',
        deadline: null,
        status: 'concept',
        notes: '[]',
        goal_id: parseInt(goalId),
        goaltarget_parent_id: null,
        position: null
      });

      if (onTargetAdded) {
        onTargetAdded(addedTarget);
      }
    } catch (error) {
      console.error('Error adding target:', error);
      setError('Failed to add target');
    }
  };

  const handleUpdateTarget = async (targetId: string, target: GoalTarget) => {
    if (!target || !validateTarget(target)) return;

    try {
      const response = await fetch(`${config.apiUrl}/api/goals/${goalId}/targets/${targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(target),
      });

      if (!response.ok) {
        throw new Error('Failed to update target');
      }

      const updatedTarget = await response.json();
      setTargets(targets.map((t) => (t.id === updatedTarget.id ? updatedTarget : t)));
      setEditingTarget(null);
      setShowAddTargetModal(false);

      if (onTargetUpdated) {
        onTargetUpdated(updatedTarget);
      }
    } catch (error) {
      console.error('Error updating target:', error);
      setError('Failed to update target');
    }
  };

  const handleDeleteTarget = async (targetId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this target?');
    if (!confirmed) return;

    try {
      const response = await fetch(`${config.apiUrl}/api/goals/${goalId}/targets/${targetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete target');
      }

      setTargets(targets.filter((target) => target.id !== targetId));

      if (onTargetDeleted) {
        onTargetDeleted(parseInt(targetId));
      }
    } catch (error) {
      console.error('Error deleting target:', error);
      setError('Failed to delete target');
    }
  };

  const handleStatusChange = async (targetId: string, newStatus: string) => {
    const targetToUpdate = targets.find((t) => t.id === targetId);
    if (!targetToUpdate) return;

    try {
      const response = await fetch(`${config.apiUrl}/api/goals/${goalId}/targets/${targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...targetToUpdate,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update target status');
      }

      const updatedTarget = await response.json();
      setTargets(targets.map((target) => (target.id === updatedTarget.id ? updatedTarget : target)));

      if (onTargetUpdated) {
        onTargetUpdated(updatedTarget);
      }
    } catch (error) {
      console.error('Error updating target status:', error);
      setError('Failed to update target status');
    }
  };

  const handleToggleStatus = async (targetId: string) => {
    const target = targets.find(t => t.id === targetId);
    if (!target) return;
    
    const newStatus = target.status === 'completed' ? 'active' : 'completed';
    
    try {
      const response = await fetch(`${config.apiUrl}/api/goals/${goalId}/targets/${targetId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update target status');
      }
      
      // Update local state
      setTargets(targets.map(t => 
        t.id === targetId ? { ...t, status: newStatus } : t
      ));
    } catch (error) {
      console.error('Error updating target status:', error);
      setError('Failed to update target status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concept':
        return 'default';
      case 'active':
        return 'primary';
      case 'completed':
        return 'success';
      case 'abandoned':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Format as YYYY-MM-DDThh:mm
    return date.toISOString().slice(0, 16);
  };

  const getNextActiveTarget = () => {
    // First look for active targets with the earliest deadline
    const activeTargets = targets.filter(t => t.status === 'active');
    if (activeTargets.length > 0) {
      // Sort by deadline (if available)
      const withDeadline = activeTargets.filter(t => t.deadline);
      if (withDeadline.length > 0) {
        return withDeadline.sort((a, b) => 
          new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
        )[0];
      }
      // If no active targets have deadlines, return the first active target
      return activeTargets[0];
    }
    
    // If no active targets, look for concept targets
    const conceptTargets = targets.filter(t => t.status === 'concept');
    if (conceptTargets.length > 0) {
      return conceptTargets[0];
    }
    
    // If no active or concept targets, return the first incomplete target
    const incompleteTargets = targets.filter(t => t.status !== 'completed' && t.status !== 'abandoned');
    if (incompleteTargets.length > 0) {
      return incompleteTargets[0];
    }
    
    // If all else fails, return the first target
    return targets.length > 0 ? targets[0] : null;
  };

  const handleUpdateStatus = (target: GoalTarget, newStatus: string) => {
    const updatedTarget = { ...target, status: newStatus };
    handleUpdateTarget(updatedTarget.id, updatedTarget);
  };

  const handleEditTarget = (target: GoalTarget) => {
    setEditingTarget(target);
    setNewTarget({
      title: target.title,
      description: target.description,
      deadline: target.deadline,
      status: target.status,
      notes: target.notes,
      goal_id: target.goal_id,
      goaltarget_parent_id: target.goaltarget_parent_id,
      position: target.position
    });
    setValidationErrors({});
    setShowAddTargetModal(true);
  };

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: 'traditional' | 'inverted' | 'focus' | 'focus-context' | null,
  ) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleDragStart = (e: React.DragEvent, targetId: string) => {
    // Ensure targetId is a valid string
    if (!targetId) {
      console.error('Invalid target ID for drag:', targetId);
      e.preventDefault();
      return;
    }
    
    console.log('Starting drag for target ID:', targetId, 'Type:', typeof targetId);
    e.dataTransfer.setData('text/plain', targetId);
    
    // Add visual feedback for the dragged item
    const targetItem = (e.target as HTMLElement).closest('.target-item');
    if (targetItem) {
      targetItem.classList.add('dragging');
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Remove dragging class from all items
    document.querySelectorAll('.target-item.dragging').forEach(item => {
      item.classList.remove('dragging');
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const targetItem = target.closest('.target-item');
    if (targetItem) {
      targetItem.classList.add('drag-over');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const targetItem = target.closest('.target-item');
    if (targetItem) {
      targetItem.classList.remove('drag-over');
    }
  };

  const handleDrop = async (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    
    // Ensure dropTargetId is valid
    if (!dropTargetId) {
      console.error('Invalid drop target ID:', dropTargetId);
      return;
    }
    
    const target = e.target as HTMLElement;
    const targetItem = target.closest('.target-item');
    if (targetItem) {
      targetItem.classList.remove('drag-over');
    }
    
    // Get the dragged target ID from dataTransfer
    const draggedTargetId = e.dataTransfer.getData('text/plain');
    console.log('Dropped with data:', draggedTargetId);
    
    if (!draggedTargetId) {
      console.error('No target ID found in drop data');
      return;
    }
    
    if (draggedTargetId === dropTargetId) {
      console.log('Cannot drop onto self, IDs match:', draggedTargetId);
      return;
    }

    // Log the IDs and targets for debugging
    console.log('Dragged ID:', draggedTargetId, 'type:', typeof draggedTargetId);
    console.log('Drop Target ID:', dropTargetId, 'type:', typeof dropTargetId);
    console.log('All target IDs:', targets.map(t => ({ id: t.id, type: typeof t.id })));
    
    // Find the current target to preserve its other properties
    const draggedTarget = targets.find(t => t.id === draggedTargetId);
    
    if (!draggedTarget) {
      console.error("Dragged target not found in targets array:", 
        { draggedId: draggedTargetId, targetIds: targets.map(t => ({ id: t.id })) });
      return;
    }

    console.log('Found dragged target:', draggedTarget);

    // Prevent dropping a parent onto its own child (would create circular reference)
    const isTargetDescendant = (targetId: string, draggedId: string): boolean => {
      const target = targets.find(t => t.id === targetId);
      if (!target) return false;
      
      // Check if any of the targets have this target as parent
      const childTargets = targets.filter(t => 
        t.goaltarget_parent_id === targetId
      );
      if (childTargets.length === 0) return false;
      
      return childTargets.some(childTarget => 
        childTarget.id === draggedId || isTargetDescendant(childTarget.id, draggedId)
      );
    };

    if (isTargetDescendant(draggedTargetId, dropTargetId)) {
      console.error("Cannot drop a target into its own child target");
      return;
    }

    try {
      // Determine the new position
      const siblingTargets = targets.filter(t => 
        t.goaltarget_parent_id === dropTargetId && t.id !== draggedTargetId
      );
      const newPosition = siblingTargets.length > 0 
        ? Math.max(...siblingTargets.map(t => t.position || 0)) + 1 
        : 0;

      console.log(`Updating target ${draggedTarget.id} to have parent ${dropTargetId} at position ${newPosition}`);

      const response = await fetch(`${config.apiUrl}/api/goals/${goalId}/targets/${draggedTarget.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goaltarget_parent_id: dropTargetId,
          position: newPosition
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response:', errorData);
        throw new Error(`Failed to update target parent: ${response.status} ${response.statusText}`);
      }

      console.log('Target updated successfully');
      // Refresh targets to show new hierarchy
      fetchTargets();
    } catch (error) {
      console.error('Error updating target parent:', error);
      setError('Failed to update target hierarchy');
    }
  };

  const getParentTargetTitle = (parentId: string | null): string => {
    if (!parentId) return '';
    const parentTarget = targets.find(t => t.id === parentId);
    return parentTarget ? parentTarget.title : `Target ${parentId}`;
  };

  const organizeTargets = (targets: GoalTarget[]): GoalTarget[] => {
    const targetMap = new Map<string, GoalTarget>();
    const rootTargets: GoalTarget[] = [];
    
    // First pass: create a map of all targets
    targets.forEach(target => {
      targetMap.set(target.id, { ...target });
    });
    
    // Second pass: organize into hierarchy
    targets.forEach(target => {
      if (target.goaltarget_parent_id) {
        const parentTarget = targetMap.get(target.goaltarget_parent_id);
        if (parentTarget) {
          if (!parentTarget.children) parentTarget.children = [];
          parentTarget.children.push({ ...target });
        } else {
          rootTargets.push({ ...target });
        }
      } else {
        rootTargets.push({ ...target });
      }
    });
    
    return rootTargets;
  };

  // Helper function to recursively render parent chain for inverted tree view
  const renderParentChain = (target: GoalTarget, depth: number) => {
    if (!target.goaltarget_parent_id) return null;
    
    const parentTarget = targets.find(t => t.id === target.goaltarget_parent_id);
    if (!parentTarget) return null;
    
    return (
      <Box className="parent-chain" sx={{ mt: 1 }}>
        <Box 
          className="connector-line" 
          sx={{ 
            height: '20px', 
            width: '2px', 
            backgroundColor: '#ccc', 
            margin: '0 auto' 
          }} 
        />
        <Paper 
          className="p-3 border rounded-lg hover:bg-gray-50 parent-item"
          sx={{ 
            backgroundColor: depth === 1 ? '#f8f9fa' : '#fff',
            width: `calc(100% - ${depth * 20}px)`,
            marginLeft: `${depth * 10}px`
          }}
          draggable
          onDragStart={(e) => handleDragStart(e, parentTarget.id)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, parentTarget.id)}
        >
          <Box className="flex justify-between items-start">
            <Box className="flex items-center">
              <IconButton 
                size="small" 
                onClick={() => handleToggleStatus(parentTarget.id)}
              >
                {parentTarget.status === 'completed' ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <RadioButtonUncheckedIcon />
                )}
              </IconButton>
              <Typography 
                variant="body1" 
                className={parentTarget.status === 'completed' ? 'line-through text-gray-500' : ''}
                sx={{ fontWeight: 'medium' }}
              >
                {parentTarget.title}
              </Typography>
              {/* Show child count badge if there are children */}
              {getChildTargets(parentTarget.id).length > 0 && (
                <Box 
                  component="span" 
                  className="child-count-badge"
                  sx={{ ml: 1 }}
                >
                  {getChildTargets(parentTarget.id).length}
                </Box>
              )}
            </Box>
            <Box>
              <IconButton size="small" onClick={() => handleEditTarget(parentTarget)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => handleDeleteTarget(parentTarget.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          {parentTarget.deadline && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 5 }} component="span">
              <Typography variant="body2" className="text-gray-600" component="span">
                Due: {new Date(parentTarget.deadline).toLocaleDateString()} {new Date(parentTarget.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
              {getDaysRemaining(parentTarget.deadline) && (
                <Box 
                  component="span"
                  sx={{ 
                    backgroundColor: getDaysRemaining(parentTarget.deadline)?.color,
                    color: '#fff',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    display: 'inline-flex'
                  }}
                >
                  {getDaysRemaining(parentTarget.deadline)?.text}
                </Box>
              )}
            </Box>
          )}
        </Paper>
        
        {/* Recursively render parent's parent */}
        {renderParentChain(parentTarget, depth + 1)}
      </Box>
    );
  };

  // Helper functions
  const getDaysRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    
    const deadlineDate = new Date(deadline);
    const today = new Date();
    
    // Reset hours to compare just the dates
    today.setHours(0, 0, 0, 0);
    const deadlineDateOnly = new Date(deadlineDate);
    deadlineDateOnly.setHours(0, 0, 0, 0);
    
    const diffTime = deadlineDateOnly.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Return days and color based on urgency
    return {
      days: diffDays,
      color: getDeadlineColor(diffDays),
      text: diffDays === 0 ? 'Due today!' : 
            diffDays < 0 ? `${Math.abs(diffDays)} days overdue` : 
            `${diffDays} days remaining`
    };
  };

  // Get color based on days remaining
  const getDeadlineColor = (days: number) => {
    if (days < 0) return '#d32f2f'; // Overdue - red
    if (days === 0) return '#f57c00'; // Due today - orange
    if (days <= 2) return '#ed6c02'; // 1-2 days - light orange
    if (days <= 7) return '#ffa726'; // 3-7 days - amber
    if (days <= 14) return '#ffca28'; // 8-14 days - yellow
    return '#66bb6a'; // More than 14 days - green
  };

  // Toggle expansion state of a target
  const toggleExpand = (targetId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering drag events
    setCollapsedTargets(prev => {
      const index = prev.indexOf(targetId);
      if (index === -1) {
        return [...prev, targetId];
      } else {
        return [...prev.slice(0, index), ...prev.slice(index + 1)];
      }
    });
  };

  // Check if a target is expanded
  const isTargetExpanded = (targetId: string) => {
    return !collapsedTargets.includes(targetId); // Default to expanded if not set
  };

  // Get all child targets for a parent, sorted by deadline
  const getChildTargets = (parentId: string) => {
    return targets
      .filter(t => t.goaltarget_parent_id === parentId)
      .sort((a, b) => {
        // Sort by deadline (closest first)
        if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        // If only one has a deadline, it comes first
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        // If neither has a deadline, sort by position
        return (a.position || 0) - (b.position || 0);
      });
  };

  const renderTargets = () => {
    if (loading) {
      return <Typography>Loading targets...</Typography>;
    }

    if (error) {
      return <Typography color="error">{error}</Typography>;
    }

    if (targets.length === 0) {
      return <Typography>No targets yet. Add one to get started!</Typography>;
    }

    // Focus mode - show only the next target
    if (viewMode === 'focus') {
      // Find the next incomplete leaf target (target with no children)
      const nextLeafTarget = targets
        .filter(target => getChildTargets(target.id).length === 0 && target.status !== 'completed')
        .sort((a, b) => {
          // Sort by deadline if available
          if (a.deadline && b.deadline) {
            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          } else if (a.deadline) {
            return -1; // a has deadline, b doesn't, so a comes first
          } else if (b.deadline) {
            return 1; // b has deadline, a doesn't, so b comes first
          }
          // If no deadlines, sort by position
          return (a.position || 0) - (b.position || 0);
        })[0];

      if (!nextLeafTarget) {
        return <Typography>All leaf targets are completed! Try adding more specific tasks or marking some as incomplete.</Typography>;
      }

      return (
        <Paper className="p-4 mb-4 border rounded-lg">
          <Box className="flex justify-between items-start mb-4">
            <Typography variant="h6">{nextLeafTarget.title}</Typography>
            <Box>
              <IconButton onClick={() => handleEditTarget(nextLeafTarget)}>
                <EditIcon />
              </IconButton>
              <IconButton onClick={() => handleDeleteTarget(nextLeafTarget.id)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
          {nextLeafTarget.description && (
            <Typography variant="body1" className="mb-3">
              {nextLeafTarget.description}
            </Typography>
          )}
          {nextLeafTarget.deadline && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }} component="span">
              <Typography variant="body2" component="span">
                Due: {new Date(nextLeafTarget.deadline).toLocaleDateString()} {new Date(nextLeafTarget.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
              {getDaysRemaining(nextLeafTarget.deadline) && (
                <Box 
                  component="span"
                  sx={{ 
                    backgroundColor: getDaysRemaining(nextLeafTarget.deadline)?.color,
                    color: '#fff',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    display: 'inline-flex'
                  }}
                >
                  {getDaysRemaining(nextLeafTarget.deadline)?.text}
                </Box>
              )}
            </Box>
          )}
          <Button
            variant="contained"
            color={nextLeafTarget.status === 'completed' ? 'secondary' : 'primary'}
            onClick={() => handleToggleStatus(nextLeafTarget.id)}
            startIcon={nextLeafTarget.status === 'completed' ? <UndoIcon /> : <CheckIcon />}
            className="mb-4"
          >
            {nextLeafTarget.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete'}
          </Button>

          {/* Show parent context if this is a child target */}
          {nextLeafTarget.goaltarget_parent_id && (
            <Box className="mt-4 pt-2 border-t border-gray-200">
              <Typography variant="subtitle2" className="text-gray-700 mb-1">
                Part of:
              </Typography>
              <Box className="pl-2 border-l-2 border-gray-300">
                {(() => {
                  // Get the full parent chain
                  const getParentChain = () => {
                    const chain: GoalTarget[] = [];
                    let currentId: string | null = nextLeafTarget.goaltarget_parent_id;
                    
                    while (currentId) {
                      const parent = targets.find(t => t.id === currentId);
                      if (parent) {
                        chain.push(parent);
                        currentId = parent.goaltarget_parent_id;
                      } else {
                        currentId = null;
                      }
                    }
                    
                    return chain;
                  };
                  
                  const parentChain = getParentChain();
                  
                  return parentChain.map((parent, index) => (
                    <Box 
                      key={parent.id}
                      className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 mb-1"
                      onClick={() => setViewMode('traditional')}
                    >
                      <Typography variant="body2" component="span" className={index === 0 ? 'font-medium' : ''}>
                        {parent.title}
                      </Typography>
                    </Box>
                  ));
                })()}
              </Box>
            </Box>
          )}
        </Paper>
      );
    }

    // Inverted tree view - show targets in a tree structure with children at the top
    if (viewMode === 'inverted') {
      // Get all root targets (targets with no parent)
      const rootTargets = targets.filter(target => !target.goaltarget_parent_id);
      
      // Sort root targets by deadline
      const sortedRootTargets = [...rootTargets].sort((a, b) => {
        // Sort by deadline (closest first)
        if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        // If only one has a deadline, it comes first
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        // If neither has a deadline, sort by position
        return (a.position || 0) - (b.position || 0);
      });
      
      // Recursive function to render a target and its children (inverted)
      const renderInvertedTarget = (target: GoalTarget, depth: number = 0) => {
        // Get child targets and sort them by deadline (closest first)
        const childTargets = getChildTargets(target.id);
        
        const hasChildren = childTargets.length > 0;
        const isExpanded = !collapsedTargets.includes(target.id);
        
        return (
          <Box key={target.id} className="mb-3">
            {/* Render children above parent (if expanded) */}
            {hasChildren && isExpanded && (
              <Box 
                className="pl-4 border-l-2 border-gray-300 ml-4 mb-2"
                sx={{ opacity: 0.9 }}
              >
                {childTargets.map(child => renderInvertedTarget(child, depth + 1))}
              </Box>
            )}
            
            {/* Render the target itself */}
            <Paper 
              className={`p-3 border rounded-lg hover:bg-gray-50 ${hasChildren ? 'mb-0' : 'mb-2'}`}
              draggable
              onDragStart={(e) => handleDragStart(e, target.id)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, target.id)}
              sx={{
                borderLeft: `4px solid ${getStatusColor(target.status)}`,
                width: `calc(100% - ${depth * 10}px)`,
                marginLeft: `${depth * 10}px`
              }}
            >
              <Box className="flex justify-between items-start">
                <Box className="flex items-center">
                  {hasChildren && (
                    <IconButton 
                      size="small"
                      className="expand-button"
                      onClick={(e) => toggleExpand(target.id, e)}
                      sx={{ mr: 1 }}
                    >
                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  )}
                  
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                    {target.status === 'completed' ? (
                      <CheckCircleIcon color="success" style={{ marginRight: '8px' }} />
                    ) : (
                      <RadioButtonUncheckedIcon style={{ marginRight: '8px' }} />
                    )}
                    <Typography 
                      variant="body1" 
                      className={target.status === 'completed' ? 'line-through text-gray-500' : ''}
                    >
                      {target.title}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <IconButton size="small" onClick={() => handleEditTarget(target)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDeleteTarget(target.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              {target.deadline && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 5 }} component="span">
                  <Typography variant="body2" className="text-gray-600" component="span">
                    Due: {new Date(target.deadline).toLocaleDateString()} {new Date(target.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                  {getDaysRemaining(target.deadline) && (
                    <Box 
                      component="span"
                      sx={{ 
                        backgroundColor: getDaysRemaining(target.deadline)?.color,
                        color: '#fff',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        display: 'inline-flex'
                      }}
                    >
                      {getDaysRemaining(target.deadline)?.text}
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          </Box>
        );
      };
      
      return (
        <Box className="inverted-tree-view">
          {sortedRootTargets.map(target => renderInvertedTarget(target))}
        </Box>
      );
    }

    // Traditional mode - regular list view
    return (
      <List className="w-full">
        {/* First render parent targets (those without a parent), sorted by deadline */}
        {targets
          .filter(target => !target.goaltarget_parent_id)
          .sort((a, b) => {
            // Sort by deadline (closest first)
            if (a.deadline && b.deadline) {
              return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            }
            // If only one has a deadline, it comes first
            if (a.deadline) return -1;
            if (b.deadline) return 1;
            // If neither has a deadline, sort by position
            return (a.position || 0) - (b.position || 0);
          })
          .map((target) => (
            <Fragment key={target.id}>
              <ListItem
                className="mb-2 border rounded-lg hover:bg-gray-50 target-item"
                style={{ marginBottom: '1rem' }}
                secondaryAction={
                  <Box>
                    <IconButton edge="end" onClick={() => handleEditTarget(target)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton edge="end" onClick={() => handleDeleteTarget(target.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
                draggable={true}
                onDragStart={(e) => handleDragStart(e, target.id)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, target.id)}
                data-target-id={target.id}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center">
                      {/* Show expand/collapse button if target has children */}
                      {getChildTargets(target.id).length > 0 && (
                        <IconButton 
                          size="small"
                          className="expand-button"
                          onClick={(e) => toggleExpand(target.id, e)}
                          style={{
                            marginRight: '8px',
                            padding: '4px',
                            backgroundColor: '#f0f0f0',
                            border: '1px solid #e0e0e0'
                          }}
                        >
                          {isTargetExpanded(target.id) ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        </IconButton>
                      )}
                      
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                        {target.status === 'completed' ? (
                          <CheckCircleIcon color="success" style={{ marginRight: '8px' }} />
                        ) : (
                          <RadioButtonUncheckedIcon style={{ marginRight: '8px' }} />
                        )}
                        {target.title}
                        
                        {/* Show child count badge if there are children */}
                        {getChildTargets(target.id).length > 0 && (
                          <Box 
                            component="span" 
                            className="child-count-badge"
                          >
                            {getChildTargets(target.id).length}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  }
                  secondary={
                    <>
                      {target.deadline && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} component="span">
                          <Typography variant="body2" className="text-gray-600" component="span">
                            Due: {new Date(target.deadline).toLocaleDateString()} {new Date(target.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                          {getDaysRemaining(target.deadline) && (
                            <Box 
                              component="span"
                              sx={{ 
                                backgroundColor: getDaysRemaining(target.deadline)?.color,
                                color: '#fff',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                display: 'inline-flex'
                              }}
                            >
                              {getDaysRemaining(target.deadline)?.text}
                            </Box>
                          )}
                        </Box>
                      )}
                      {target.description && (
                        <Typography variant="body2" className="text-gray-600">
                          {target.description}
                        </Typography>
                      )}
                    </>
                  }
                />
              </ListItem>
              
              {/* Render children if parent is expanded */}
              {isTargetExpanded(target.id) && getChildTargets(target.id).length > 0 && (
                <Box className="target-children-container mb-3">
                  {getChildTargets(target.id).map(childTarget => (
                    <ListItem
                      key={childTarget.id}
                      className="mb-2 border rounded-lg hover:bg-gray-50 target-item-child"
                      style={{ marginBottom: '0.75rem' }}
                      secondaryAction={
                        <Box>
                          <IconButton edge="end" onClick={() => handleEditTarget(childTarget)} size="small">
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton edge="end" onClick={() => handleDeleteTarget(childTarget.id)} size="small">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      }
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, childTarget.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, childTarget.id)}
                      data-target-id={childTarget.id}
                    >
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center">
                            <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                              {childTarget.status === 'completed' ? (
                                <CheckCircleIcon color="success" style={{ marginRight: '8px', fontSize: '0.9rem' }} />
                              ) : (
                                <RadioButtonUncheckedIcon style={{ marginRight: '8px', fontSize: '0.9rem' }} />
                              )}
                              <Typography variant="body2" className="child-target-text">{childTarget.title}</Typography>
                            </Box>
                          </Box>
                        }
                        secondary={
                          <>
                            {childTarget.deadline && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} component="span">
                                <Typography variant="caption" className="text-gray-600" component="span">
                                  Due: {new Date(childTarget.deadline).toLocaleDateString()} {new Date(childTarget.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                                {getDaysRemaining(childTarget.deadline) && (
                                  <Box 
                                    component="span"
                                    sx={{ 
                                      backgroundColor: getDaysRemaining(childTarget.deadline)?.color,
                                      color: '#fff',
                                      borderRadius: '4px',
                                      padding: '1px 4px',
                                      fontSize: '0.7rem',
                                      fontWeight: 'bold',
                                      display: 'inline-flex'
                                    }}
                                  >
                                    {getDaysRemaining(childTarget.deadline)?.text}
                                  </Box>
                                )}
                              </Box>
                            )}
                            {childTarget.description && (
                              <Typography variant="caption" className="text-gray-600">
                                {childTarget.description}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </Box>
              )}
            </Fragment>
          ))}
      </List>
    );
  };

  return (
    <Paper className="p-6 bg-white shadow rounded-lg">
      <Box className="flex justify-between items-center mb-4">
        <Typography variant="h6" className="font-bold">Goal Targets</Typography>
        <Box className="flex items-center">
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            aria-label="view mode"
            size="small"
          >
            <ToggleButton value="traditional" aria-label="traditional view">
              <Tooltip title="Traditional View">
                <ViewListIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="inverted" aria-label="inverted tree view">
              <Tooltip title="Inverted Tree View">
                <AccountTreeIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="focus" aria-label="focus view">
              <Tooltip title="Focus Mode">
                <CenterFocusStrongIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingTarget(null);
              setNewTarget({
                title: '',
                description: '',
                deadline: null,
                status: 'concept',
                notes: '[]',
                goal_id: parseInt(goalId),
                goaltarget_parent_id: null,
                position: null
              });
              setValidationErrors({});
              setShowAddTargetModal(true);
            }}
            className="ml-2"
          >
            Add Target
          </Button>
        </Box>
      </Box>

      {renderTargets()}

      {/* Add/Edit Target Modal */}
      <Dialog open={showAddTargetModal} onClose={() => setShowAddTargetModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Target</DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-4">
            <TextField
              label="Title"
              fullWidth
              value={newTarget.title || ''}
              onChange={(e) => setNewTarget({ ...newTarget, title: e.target.value })}
              error={!!validationErrors.title}
              helperText={validationErrors.title}
              placeholder="What does success look like for this goal?"
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newTarget.description || ''}
              onChange={(e) => setNewTarget({ ...newTarget, description: e.target.value })}
              placeholder="Add more details about this target (optional)"
            />
            <TextField
              label="Deadline (Optional)"
              type="datetime-local"
              fullWidth
              value={newTarget.deadline ? formatDateForInput(newTarget.deadline) : ''}
              onChange={(e) => setNewTarget({ ...newTarget, deadline: e.target.value ? new Date(e.target.value).toISOString() : null })}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={newTarget.status || 'concept'}
                label="Status"
                onChange={(e) => setNewTarget({ ...newTarget, status: e.target.value as string })}
              >
                <MenuItem value="concept">Concept</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="abandoned">Abandoned</MenuItem>
              </Select>
            </FormControl>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddTargetModal(false)}>Cancel</Button>
          <Button onClick={handleAddTarget} variant="contained" color="primary" disabled={!newTarget.title?.trim()}>
            Add Target
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Target Modal */}
      <Dialog open={!!editingTarget} onClose={() => setEditingTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Target</DialogTitle>
        <DialogContent>
          {editingTarget && (
            <div className="space-y-4 mt-4">
              <TextField
                label="Title"
                fullWidth
                value={editingTarget.title || ''}
                onChange={(e) => setEditingTarget({ ...editingTarget, title: e.target.value })}
                error={!!validationErrors.title}
                helperText={validationErrors.title}
              />
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={editingTarget.description || ''}
                onChange={(e) => setEditingTarget({ ...editingTarget, description: e.target.value })}
              />
              <TextField
                label="Deadline (Optional)"
                type="datetime-local"
                fullWidth
                value={editingTarget.deadline ? formatDateForInput(editingTarget.deadline) : ''}
                onChange={(e) => setEditingTarget({ ...editingTarget, deadline: e.target.value ? new Date(e.target.value).toISOString() : null })}
                InputLabelProps={{
                  shrink: true,
                }}
              />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editingTarget.status || 'concept'}
                  label="Status"
                  onChange={(e) => setEditingTarget({ ...editingTarget, status: e.target.value as string })}
                >
                  <MenuItem value="concept">Concept</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="abandoned">Abandoned</MenuItem>
                </Select>
              </FormControl>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingTarget(null)}>Cancel</Button>
          <Button 
            onClick={() => editingTarget && handleUpdateTarget(editingTarget.id, editingTarget)} 
            variant="contained" 
            color="primary" 
            disabled={!editingTarget?.title?.trim()}
          >
            Update Target
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default GoalTargetsSection;
