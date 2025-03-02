'use client';

import { useState, useEffect } from 'react';
import config from '../config'; // Assuming config is in a separate file

interface Metric {
  id: number;
  name: string;
  unit: string;
  current_value: number;
  target_value?: number;
}

interface ContributionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contribution: { metric_id: number; contribution_value: number }) => void;
  metricId?: number;
  initialValue?: number;
}

export default function ContributionDialog({ isOpen, onClose, onSubmit, metricId, initialValue }: ContributionDialogProps) {
  const [metric, setMetric] = useState<Metric | null>(null);
  const [contributionValue, setContributionValue] = useState(initialValue?.toString() || '');

  useEffect(() => {
    if (metricId) {
      fetch(`${config.apiUrl}/api/metrics/${metricId}`)
        .then(res => res.json())
        .then(data => setMetric(data))
        .catch(err => console.error('Error fetching metric:', err));
    }
  }, [metricId]);

  useEffect(() => {
    // Update contribution value when initialValue changes
    setContributionValue(initialValue?.toString() || '');
  }, [initialValue]);

  // Listen for metric updates
  useEffect(() => {
    const handleMetricUpdate = (event: CustomEvent<Metric>) => {
      if (event.detail.id === metricId) {
        setMetric(event.detail);
      }
    };

    window.addEventListener('metricUpdated', handleMetricUpdate as EventListener);
    return () => {
      window.removeEventListener('metricUpdated', handleMetricUpdate as EventListener);
    };
  }, [metricId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (metric && contributionValue) {
      onSubmit({
        metric_id: metric.id,
        contribution_value: parseFloat(contributionValue)
      });
    }
    onClose();
  };

  if (!isOpen || !metric) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-lg font-medium mb-4">Record Contribution</h2>
        <p className="text-sm text-gray-600 mb-4">
          How much did this task contribute to the metric "{metric.name}"?
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contribution ({metric.unit})
            </label>
            <input
              type="number"
              value={contributionValue}
              onChange={(e) => setContributionValue(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
              step="any"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
