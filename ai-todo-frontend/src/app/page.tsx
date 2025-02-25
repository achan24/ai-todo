'use client';

import { useState } from 'react';
import GoalManager from '@/components/GoalManager'

interface Metric {
  id: number;
  name: string;
  description?: string;
  type: 'target' | 'process';
  unit: string;
  target_value?: number;
  current_value: number;
}

interface Goal {
  id: number;
  title: string;
  description?: string;
  tasks: Task[];
  subgoals: Goal[];
  metrics: Metric[];
  parent_id?: number;
}

const GoalMetrics = ({ metrics, goalId }: { metrics: Metric[], goalId: number }) => {
  const targetMetrics = metrics.filter(m => m.type === 'target');
  const processMetrics = metrics.filter(m => m.type === 'process');

  const [newMetric, setNewMetric] = useState({
    name: '',
    description: '',
    type: 'target' as 'target' | 'process',
    unit: '',
    target_value: 0,
    current_value: 0
  });

  const handleAddMetric = async () => {
    try {
      const response = await fetch(`/api/goals/${goalId}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMetric)
      });
      if (!response.ok) throw new Error('Failed to add metric');
      // Refresh goal data
    } catch (error) {
      console.error('Error adding metric:', error);
    }
  };

  const MetricCard = ({ metric }: { metric: Metric }) => (
    <div className="bg-white p-4 rounded-lg shadow mb-2">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-semibold">{metric.name}</h4>
          {metric.description && <p className="text-sm text-gray-600">{metric.description}</p>}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">
            {metric.current_value} / {metric.target_value || '∞'} {metric.unit}
          </p>
          <div className="w-32 h-2 bg-gray-200 rounded-full mt-1">
            <div 
              className="h-full bg-blue-500 rounded-full"
              style={{ 
                width: `${metric.target_value ? (metric.current_value / metric.target_value * 100) : 0}%`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold mb-2">Target Metrics</h3>
        {targetMetrics.map(metric => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
      
      <div>
        <h3 className="text-xl font-semibold mb-2">Process Metrics</h3>
        {processMetrics.map(metric => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      <div className="mt-4">
        <button
          onClick={() => document.getElementById('add-metric-modal')?.showModal()}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Metric
        </button>

        <dialog id="add-metric-modal" className="modal p-6 rounded-lg shadow-xl">
          <h3 className="text-xl font-semibold mb-4">Add New Metric</h3>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={newMetric.name}
                onChange={e => setNewMetric({...newMetric, name: e.target.value})}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={newMetric.description}
                onChange={e => setNewMetric({...newMetric, description: e.target.value})}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={newMetric.type}
                onChange={e => setNewMetric({...newMetric, type: e.target.value as 'target' | 'process'})}
                className="w-full p-2 border rounded"
              >
                <option value="target">Target Metric</option>
                <option value="process">Process Metric</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <input
                type="text"
                value={newMetric.unit}
                onChange={e => setNewMetric({...newMetric, unit: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="e.g., hours, pages, commits"
              />
            </div>
            {newMetric.type === 'target' && (
              <div>
                <label className="block text-sm font-medium mb-1">Target Value</label>
                <input
                  type="number"
                  value={newMetric.target_value}
                  onChange={e => setNewMetric({...newMetric, target_value: parseFloat(e.target.value)})}
                  className="w-full p-2 border rounded"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Current Value</label>
              <input
                type="number"
                value={newMetric.current_value}
                onChange={e => setNewMetric({...newMetric, current_value: parseFloat(e.target.value)})}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  document.getElementById('add-metric-modal')?.close();
                }}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAddMetric();
                  document.getElementById('add-metric-modal')?.close();
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add Metric
              </button>
            </div>
          </form>
        </dialog>
      </div>
    </div>
  );
};

export default function Home() {
  return <GoalManager />
}
