'use client';

import { useState, useEffect } from 'react';
import { TagIcon } from '@heroicons/react/24/solid';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Select, MenuItem, FormControl, InputLabel, Chip } from '@mui/material';

interface Metric {
  id: number;
  name: string;
  unit: string;
  current_value: number;
  target_value?: number;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  tags: string[];
  estimated_minutes?: number;
  metric_id?: number | null;
  contribution_value?: number;
}

interface EditTaskDialogProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (task: Task) => void;
  metrics?: Metric[];  // Made optional since not all tasks need metrics
}

export default function EditTaskDialog({ open, task, onClose, onSave, metrics = [] }: EditTaskDialogProps) {
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [newTag, setNewTag] = useState('');
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);

  useEffect(() => {
    setEditedTask(task);
    if (task?.metric_id && metrics.length > 0) {
      const metric = metrics.find(m => m.id === task.metric_id);
      setSelectedMetric(metric || null);
    } else {
      setSelectedMetric(null);
    }
  }, [task, metrics]);

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

  const getHashColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editedTask.id ? 'Edit Task' : 'New Task'}</DialogTitle>
      <DialogContent>
        <div className="space-y-4 mt-4">
          <TextField
            fullWidth
            label="Title"
            value={editedTask.title}
            onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
          />
          
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={4}
            value={editedTask.description || ''}
            onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
          />

          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={editedTask.priority}
              label="Priority"
              onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value as 'high' | 'medium' | 'low' })}
            >
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            type="date"
            label="Due Date"
            value={editedTask.dueDate?.split('T')[0] || ''}
            onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            type="number"
            label="Estimated Minutes"
            value={editedTask.estimated_minutes || ''}
            onChange={(e) => setEditedTask({ ...editedTask, estimated_minutes: parseInt(e.target.value) || undefined })}
          />

          {metrics.length > 0 && (
            <div className="space-y-4">
              <FormControl fullWidth>
                <InputLabel>Associated Metric</InputLabel>
                <Select
                  value={editedTask.metric_id || ''}
                  label="Associated Metric"
                  onChange={(e) => {
                    const metricId = e.target.value as number;
                    const metric = metrics.find(m => m.id === metricId);
                    setSelectedMetric(metric || null);
                    setEditedTask({ 
                      ...editedTask, 
                      metric_id: metricId || null,
                      contribution_value: undefined
                    });
                  }}
                >
                  <MenuItem value="">None</MenuItem>
                  {metrics.map((metric) => (
                    <MenuItem key={metric.id} value={metric.id}>
                      {metric.name} ({metric.unit})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedMetric && (
                <TextField
                  fullWidth
                  type="number"
                  label={`Contribution (${selectedMetric.unit})`}
                  value={editedTask.contribution_value || ''}
                  onChange={(e) => setEditedTask({
                    ...editedTask,
                    contribution_value: parseFloat(e.target.value) || undefined
                  })}
                />
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex gap-2">
              <TextField
                fullWidth
                label="Add Tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={handleAddTag}
                disabled={!newTag}
                startIcon={<TagIcon className="h-5 w-5" />}
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {editedTask.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  style={{
                    backgroundColor: getHashColor(tag),
                    color: 'white'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
