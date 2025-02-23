'use client';

import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Complete project presentation',
      completed: false,
      priority: 'high',
      dueDate: '2025-02-24'
    },
    {
      id: '2',
      title: 'Schedule doctor appointment',
      completed: false,
      priority: 'medium',
      dueDate: '2025-02-28'
    }
  ]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              What Should I Do Next?
            </button>
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
                    placeholder="What needs to be done?"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                  <button className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Add Task
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
                <li key={task.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => {}}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      <div className="flex space-x-2 mt-1">
                        <span className={`
                          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${task.priority === 'high' ? 'bg-red-100 text-red-800' : 
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-green-100 text-green-800'}
                        `}>
                          {task.priority}
                        </span>
                        {task.dueDate && (
                          <span className="inline-flex items-center text-xs text-gray-500">
                            Due: {task.dueDate.split('-').reverse().join('/')}
                          </span>
                        )}
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
