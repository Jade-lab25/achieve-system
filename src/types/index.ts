export type TodoTag = 'long-term' | 'one-time';

export interface Todo {
  id: string;
  title: string;
  createdAt: string;
  completedAt: string | null;
  isCompleted: boolean;
  isDelayed: boolean;
  delayCount: number;
  totalTime: number;
  isTiming: boolean;
  timingStartTime: string | null;
  timingRecordId: string | null;
  tag: TodoTag;
}

export type CheckInType = 'task' | 'commodity';

export interface CheckInProject {
  id: string;
  name: string;
  type: CheckInType;
  points: number;
  createdAt: string;
}

export interface CheckInRecord {
  id: string;
  projectId: string;
  projectName: string;
  type: CheckInType;
  points: number;
  createdAt: string;
}

export interface TimeRecord {
  id: string;
  startTime: string;
  endTime: string;
  content: string;
  note: string;
  createdAt: string;
  todoId: string | null;
  startTimestamp: number;
}

export interface AchievementLog {
  id: string;
  type: 'todo' | 'task' | 'commodity';
  title: string;
  points: number;
  createdAt: string;
}

export interface Inspiration {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyStats {
  date: string;
  totalAchievements: number;
  checkInCount: number;
}

export interface AppState {
  todos: Todo[];
  checkInProjects: CheckInProject[];
  checkInRecords: CheckInRecord[];
  timeRecords: TimeRecord[];
  achievementLogs: AchievementLog[];
  inspirations: Inspiration[];
  totalAchievements: number;
  totalEarned: number;
  totalSpent: number;
}