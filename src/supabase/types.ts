export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  completed_at: string | null;
  is_completed: boolean;
  is_delayed: boolean;
  delay_count: number;
  total_time: number;
  is_timing: boolean;
  timing_start_time: string | null;
  timing_record_id: string | null;
  synced_at: string | null;
}

export interface CheckInProject {
  id: string;
  user_id: string;
  name: string;
  type: 'task' | 'commodity';
  points: number;
  created_at: string;
  synced_at: string | null;
}

export interface CheckInRecord {
  id: string;
  user_id: string;
  project_id: string;
  project_name: string;
  type: 'task' | 'commodity';
  points: number;
  created_at: string;
  synced_at: string | null;
}

export interface TimeRecord {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  content: string;
  note: string;
  created_at: string;
  synced_at: string | null;
}

export interface AchievementLog {
  id: string;
  user_id: string;
  type: 'todo' | 'task' | 'commodity';
  title: string;
  points: number;
  created_at: string;
  synced_at: string | null;
}

export interface Inspiration {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  synced_at: string | null;
}

export interface UserStats {
  id: string;
  user_id: string;
  total_achievements: number;
  total_earned: number;
  total_spent: number;
  updated_at: string;
}