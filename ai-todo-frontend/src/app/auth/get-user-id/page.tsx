'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function GetUserId() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-md">
      <h1 className="text-2xl font-bold mb-6">Your Supabase User ID</h1>
      
      {user ? (
        <div className="bg-gray-100 p-4 rounded-lg mb-4">
          <p className="text-sm text-gray-500 mb-1">User ID (UUID):</p>
          <p className="font-mono bg-white p-2 rounded border break-all">{user.id}</p>
          
          <div className="mt-4">
            <button 
              onClick={copyToClipboard}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
          
          <div className="mt-6 text-sm">
            <p className="font-semibold">Instructions:</p>
            <ol className="list-decimal pl-5 space-y-2 mt-2">
              <li>Copy this UUID to your clipboard</li>
              <li>Add it to your backend <code className="bg-gray-200 px-1 rounded">.env</code> file as:</li>
              <li>
                <code className="bg-gray-200 px-1 rounded">
                  SUPABASE_USER_ID={user.id}
                </code>
              </li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-100 p-4 rounded-lg">
          <p>Please log in first to see your user ID.</p>
          <a href="/auth/login" className="text-blue-500 hover:underline mt-2 inline-block">
            Go to Login
          </a>
        </div>
      )}
    </div>
  );
}
