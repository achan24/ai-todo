'use client';

import { useEffect, useState } from 'react';

export default function CheckEnvPage() {
  const [envVars, setEnvVars] = useState({
    supabaseUrl: '',
    supabaseAnonKey: '',
  });

  useEffect(() => {
    setEnvVars({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set (hidden for security)' : 'Not set',
    });
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Environment Variables Check</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Frontend Environment Variables</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="font-medium">NEXT_PUBLIC_SUPABASE_URL:</div>
          <div className={envVars.supabaseUrl === 'Not set' ? 'text-red-500' : 'text-green-500'}>
            {envVars.supabaseUrl}
          </div>
          
          <div className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY:</div>
          <div className={envVars.supabaseAnonKey === 'Not set' ? 'text-red-500' : 'text-green-500'}>
            {envVars.supabaseAnonKey}
          </div>
        </div>
        
        {(envVars.supabaseUrl === 'Not set' || envVars.supabaseAnonKey === 'Not set') && (
          <div className="mt-6 p-4 bg-yellow-100 rounded-lg">
            <p className="font-semibold text-yellow-800">Missing Environment Variables!</p>
            <p className="mt-2">
              Please create or update your <code className="bg-gray-200 px-1 rounded">.env.local</code> file in the frontend root directory with the following:
            </p>
            <pre className="mt-2 bg-gray-800 text-white p-3 rounded overflow-x-auto">
              NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co{'\n'}
              NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
            </pre>
            <p className="mt-4">
              You can find these values in your Supabase project dashboard under Project Settings &gt; API.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
