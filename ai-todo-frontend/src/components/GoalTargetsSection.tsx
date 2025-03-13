'use client';

import { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
  Chip,
  Grid,
  Tooltip,
  FormHelperText,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import config from '@/config/config';

interface GoalTarget {
  id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  status: 'concept' | 'active' | 'completed' | 'abandoned';
  notes: string;
  goal_id: number;
  created_at: string;
  updated_at: string;
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
  const [newTarget, setNewTarget] = useState<Partial<GoalTarget>>({
    title: '',
    description: '',
    deadline: null,
    status: 'concept',
    notes: '[]',
    goal_id: parseInt(goalId),
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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
      setTargets(data);
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
      const targetToCreate = {
        ...newTarget,
        goal_id: parseInt(goalId),
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
      });

      if (onTargetAdded) {
        onTargetAdded(addedTarget);
      }
    } catch (error) {
      console.error('Error adding target:', error);
      setError('Failed to add target');
    }
  };

  const handleUpdateTarget = async () => {
    if (!editingTarget || !validateTarget(editingTarget)) return;

    try {
      const response = await fetch(`${config.apiUrl}/api/goals/${goalId}/targets/${editingTarget.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingTarget),
      });

      if (!response.ok) {
        throw new Error('Failed to update target');
      }

      const updatedTarget = await response.json();
      setTargets(targets.map((target) => (target.id === updatedTarget.id ? updatedTarget : target)));
      setEditingTarget(null);

      if (onTargetUpdated) {
        onTargetUpdated(updatedTarget);
      }
    } catch (error) {
      console.error('Error updating target:', error);
      setError('Failed to update target');
    }
  };

  const handleDeleteTarget = async (targetId: number) => {
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
        onTargetDeleted(targetId);
      }
    } catch (error) {
      console.error('Error deleting target:', error);
      setError('Failed to delete target');
    }
  };

  const handleStatusChange = async (targetId: number, newStatus: 'concept' | 'active' | 'completed' | 'abandoned') => {
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

  return (
    <Paper className="p-6 bg-white shadow rounded-lg mb-8">
      <div className="flex justify-between items-center mb-6">
        <Typography variant="h6">Goal Targets</Typography>
        <Button
          variant="outlined"
          onClick={() => setShowAddTargetModal(true)}
          startIcon={<AddIcon />}
        >
          Add Target
        </Button>
      </div>

      {error && (
        <Typography color="error" className="mb-4">
          {error}
        </Typography>
      )}

      {loading ? (
        <Typography>Loading targets...</Typography>
      ) : targets.length === 0 ? (
        <Typography className="text-gray-500 italic">
          No targets defined for this goal yet. Add targets to track specific success markers.
        </Typography>
      ) : (
        <div className="space-y-4">
          {targets.map((target) => (
            <Accordion key={target.id} className="border rounded-lg">
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                className={`${target.status === 'completed' ? 'bg-green-50' : target.status === 'abandoned' ? 'bg-red-50' : ''}`}
              >
                <div className="flex items-center justify-between w-full pr-8">
                  <div className="flex items-center">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(target.id, target.status === 'completed' ? 'active' : 'completed');
                      }}
                    >
                      {target.status === 'completed' ? <CheckCircleIcon color="success" /> : <RadioButtonUncheckedIcon />}
                    </IconButton>
                    <Typography className={`ml-2 ${target.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                      {target.title}
                    </Typography>
                  </div>
                  <Chip label={target.status.charAt(0).toUpperCase() + target.status.slice(1)} size="small" color={getStatusColor(target.status)} className="ml-2" />
                </div>
              </AccordionSummary>
              <AccordionDetails>
                <div className="space-y-3">
                  {target.description && (
                    <Typography variant="body2">{target.description}</Typography>
                  )}

                  {target.deadline && (
                    <Typography variant="body2" className="text-gray-600">
                      <strong>Deadline:</strong> {formatDate(target.deadline)}
                    </Typography>
                  )}

                  <div className="flex justify-end space-x-2 mt-4">
                    <IconButton size="small" onClick={() => setEditingTarget(target)} color="primary">
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteTarget(target.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </div>
                </div>
              </AccordionDetails>
            </Accordion>
          ))}
        </div>
      )}

      {/* Add Target Modal */}
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
                onChange={(e) => setNewTarget({ ...newTarget, status: e.target.value as 'concept' | 'active' | 'completed' | 'abandoned' })}
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
                  onChange={(e) => setEditingTarget({ ...editingTarget, status: e.target.value as 'concept' | 'active' | 'completed' | 'abandoned' })}
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
          <Button onClick={handleUpdateTarget} variant="contained" color="primary" disabled={!editingTarget?.title?.trim()}>
            Update Target
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default GoalTargetsSection;
