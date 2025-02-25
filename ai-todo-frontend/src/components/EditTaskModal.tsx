'use client';

import { useState, useEffect } from 'react';
import { TagIcon } from '@heroicons/react/24/solid';

interface Metric {
  id: number;
  name: string;
  unit: string;
  current_value: number;
  target_value?: number;
}

interface Task {
  id: string;
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

interface EditTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTask: Partial<Task>) => void;
}

export default function EditTaskModal({ task, isOpen, onClose, onSave }: EditTaskModalProps) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState(task?.priority || 'medium');
  const [dueDate, setDueDate] = useState(task?.dueDate?.split('T')[0] || '');
  const [tags, setTags] = useState<string[]>(task?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(task?.estimated_minutes || '');
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [selectedMetricId, setSelectedMetricId] = useState<number | null | undefined>(task?.metric_id);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDueDate(task.dueDate?.split('T')[0] || '');
      setTags(task.tags || []);
      setNewTag('');
      setEstimatedMinutes(task.estimated_minutes || '');
      setSelectedMetricId(task.metric_id);
    }
  }, [task]);

  useEffect(() => {
    fetch('http://localhost:8005/api/metrics')
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(err => console.error('Error fetching metrics:', err));
  }, []);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      description,
      priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      tags,
      estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes.toString()) : undefined,
      metric_id: selectedMetricId === undefined ? null : selectedMetricId,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <form onSubmit={handleSubmit} className="p-6">
          <h2 className="text-lg font-medium mb-4">Edit Task</h2>
          
          <div className="space-y-4">
            <div>
              <label>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <label>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task['priority'])}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label>Metric</label>
              <select
                value={selectedMetricId === null ? '' : selectedMetricId}
                onChange={(e) => setSelectedMetricId(e.target.value === '' ? null : parseInt(e.target.value))}
              >
                <option value="">No Metric</option>
                {metrics.map(metric => (
                  <option key={metric.id} value={metric.id}>
                    {metric.name} ({metric.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div>
              <label>Estimated Time (minutes)</label>
              <input
                type="number"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                min="0"
              />
            </div>

            <div>
              <label>Tags</label>
              <div>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Add a tag"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                >
                  Add
                </button>
              </div>
              <div>
                {tags.map((tag, index) => (
                  <span key={index}>
                    <TagIcon /> {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
