export type TodoTag = 'long-term' | 'one-time';

/** 成就商店商品分类 */
export type ShopCategory = 'life' | 'study' | 'work' | 'entertainment' | 'other';

/** 可同步实体的通用字段 - 同时支持 snake_case 和 camelCase */
export interface Syncable {
  synced_at?: string | null;
  syncedAt?: string | null;
  is_dirty?: boolean;
  isDirty?: boolean;
}

/**
 * 成就商店商品
 * 代表可以用成就值兑换的"小愿望"
 */
export interface ShopItem extends Syncable {
  id: string;
  name: string;                 // 商品名称
  description: string;          // 详细描述
  price: number;                // 所需成就值
  category: ShopCategory;       // 分类
  icon?: string;                // 图标名称（lucide icon）
  isPurchased: boolean;         // 是否已购买
  purchasedAt?: string | null;  // 购买时间
  createdAt: string;            // 创建时间
}

export interface Todo extends Syncable {
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

export interface CheckInProject extends Syncable {
  id: string;
  name: string;
  type: CheckInType;
  points: number;
  createdAt: string;
}

export interface CheckInRecord extends Syncable {
  id: string;
  projectId: string;
  projectName: string;
  type: CheckInType;
  points: number;
  createdAt: string;
}

export interface TimeRecord extends Syncable {
  id: string;
  startTime: string;
  endTime: string;
  content: string;
  note: string;
  createdAt: string;
  todoId: string | null;
  startTimestamp: number;
}

export interface AchievementLog extends Syncable {
  id: string;
  type: 'todo' | 'task' | 'commodity' | 'shop_purchase';
  title: string;
  points: number;
  createdAt: string;
  shopItemId?: string;  // 关联的商店商品ID
}

export interface Inspiration extends Syncable {
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
  shopItems: ShopItem[];  // 成就商店商品
  totalAchievements: number;
  totalEarned: number;
  totalSpent: number;
}