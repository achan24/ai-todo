"use client";

import { createClient } from '@supabase/supabase-js';

// These environment variables will need to be set in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Types for Supabase tables
export type User = {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
};

export type Goal = {
  id: number;
  title: string;
  description?: string;
  priority?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  parent_id?: number;
  current_strategy_id?: number;
};

export type Task = {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  due_date?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  parent_id?: number;
  estimated_minutes?: number;
  goal_id?: number;
  metric_id?: number;
  contribution_value?: number;
  completion_time?: string;
  completion_order?: number;
  tags?: string[];
};

export type Metric = {
  id: number;
  name: string;
  description?: string;
  type: string;
  unit: string;
  target_value?: number;
  current_value: number;
  contributions_list: Array<{value: number, task_id: number, timestamp: string}>;
  created_at: string;
  updated_at: string;
  goal_id: number;
};
