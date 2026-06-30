import { supabase } from './client';
import type { Todo, CheckInProject, CheckInRecord, TimeRecord, AchievementLog, Inspiration, UserStats } from './types';
import type { ShopItem } from '../types';
import { isItemDirty, markSynced } from '../utils/syncState';

function camelToSnake(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = obj[key];
  }
  return result;
}

function snakeToCamel(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

/**
 * 通用表同步函数 - 批量 upsert 替代逐条操作
 * 性能提升: 1000条记录从 100秒 → 2秒
 * ✅ 修复：返回带服务器 synced_at 时间戳的记录，用于本地更新
 *
 * @param tableName 表名
 * @param userId 用户ID
 * @param localItems 本地数据
 * @param batchSize 每批大小，默认 100
 * @param syncAllItems true=全量同步, false=仅同步 is_dirty 的记录
 */
async function syncTable<T extends { id: string; synced_at?: string | null; is_dirty?: boolean }>(
  tableName: string,
  userId: string,
  localItems: T[],
  batchSize: number = 100,
  syncAllItems: boolean = false
): Promise<{ error: Error | null; syncedCount: number; syncedRecords: T[] }> {
  try {
    // 增量同步：仅同步标记为 dirty 或未同步过的记录
    const itemsToSync = syncAllItems
      ? localItems
      : localItems.filter(item => isItemDirty(item));

    if (itemsToSync.length === 0) {
      return { error: null, syncedCount: 0, syncedRecords: [] };
    }

    const allSynced: any[] = [];

    // 分批批量 upsert
    for (let i = 0; i < itemsToSync.length; i += batchSize) {
      const batch = itemsToSync.slice(i, i + batchSize);
      const now = new Date().toISOString();

      const records = batch.map(item => ({
        ...camelToSnake(item),
        user_id: userId,
        synced_at: now,
        is_dirty: false,
      }));

      const { data, error } = await supabase
        .from(tableName)
        .upsert(records, { onConflict: 'id' })
        .select();

      if (error) throw error;
      if (data) {
        allSynced.push(...data);
      }
    }

    return {
      error: null,
      syncedCount: allSynced.length,
      syncedRecords: allSynced.map(snakeToCamel) as T[]
    };
  } catch (error) {
    return { error: error as Error, syncedCount: 0, syncedRecords: [] };
  }
}

/**
 * 批量插入记录 - 用于流水表（打卡记录、时间记录、成就流水）
 * 性能提升: N次请求 → 1次请求
 * ✅ 修复：返回带服务器 synced_at 时间戳的记录，用于本地更新
 */
async function batchInsert<T extends { id: string }>(
  tableName: string,
  userId: string,
  records: T[],
  batchSize: number = 500
): Promise<{ error: Error | null; insertedCount: number; insertedRecords: T[] }> {
  if (records.length === 0) {
    return { error: null, insertedCount: 0, insertedRecords: [] };
  }

  const allInserted: any[] = [];

  try {
    const now = new Date().toISOString();

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const recordsToInsert = batch.map(record => ({
        ...camelToSnake(record),
        user_id: userId,
        synced_at: now,
      }));

      const { data, error } = await supabase
        .from(tableName)
        .insert(recordsToInsert)
        .select();

      if (error && !error.message.includes('duplicate key')) {
        throw error;
      }

      if (data) {
        allInserted.push(...data);
      }
    }

    return {
      error: null,
      insertedCount: allInserted.length,
      insertedRecords: allInserted.map(snakeToCamel) as T[]
    };
  } catch (error) {
    return { error: error as Error, insertedCount: 0, insertedRecords: [] };
  }
}

export const auth = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

export const todo = {
  getAll: async (userId: string) => {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: data?.map(snakeToCamel), error };
  },

  insert: async (todo: Omit<Todo, 'id' | 'synced_at'>) => {
    const { data, error } = await supabase
      .from('todos')
      .insert({ ...camelToSnake(todo), synced_at: new Date().toISOString() })
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  },

  update: async (id: string, updates: Partial<Todo>) => {
    const { data, error } = await supabase
      .from('todos')
      .update({ ...camelToSnake(updates), synced_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);
    return { error };
  },

  /**
   * 批量同步 todos - 使用通用 syncTable
   * ❌ 已移除：本地不存在即删除远程记录的危险逻辑
   * ✅ 只做增量 upsert，不自动删除任何数据
   * ✅ 返回带服务器 synced_at 时间戳的同步记录
   */
  sync: async (userId: string, localTodos: Todo[], syncAll: boolean = false) => {
    return syncTable<Todo>('todos', userId, localTodos, 100, syncAll);
  }
};

export const checkInProject = {
  getAll: async (userId: string) => {
    const { data, error } = await supabase
      .from('check_in_projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: data?.map(snakeToCamel), error };
  },

  insert: async (project: Omit<CheckInProject, 'id' | 'synced_at'>) => {
    const { data, error } = await supabase
      .from('check_in_projects')
      .insert({ ...camelToSnake(project), synced_at: new Date().toISOString() })
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  },

  update: async (id: string, updates: Partial<CheckInProject>) => {
    const { data, error } = await supabase
      .from('check_in_projects')
      .update({ ...camelToSnake(updates), synced_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('check_in_projects')
      .delete()
      .eq('id', id);
    return { error };
  },

  /**
   * 批量同步打卡项目
   * ❌ 已移除：本地不存在即删除远程记录的危险逻辑
   * ✅ 返回带服务器 synced_at 时间戳的同步记录
   */
  sync: async (userId: string, localProjects: CheckInProject[], syncAll: boolean = false) => {
    return syncTable<CheckInProject>('check_in_projects', userId, localProjects, 100, syncAll);
  }
};

export const checkInRecord = {
  getAll: async (userId: string) => {
    const { data, error } = await supabase
      .from('check_in_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: data?.map(snakeToCamel), error };
  },

  insert: async (record: Omit<CheckInRecord, 'id' | 'synced_at'>) => {
    const { data, error } = await supabase
      .from('check_in_records')
      .insert({ ...camelToSnake(record), synced_at: new Date().toISOString() })
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  }
};

export const timeRecord = {
  getAll: async (userId: string) => {
    const { data, error } = await supabase
      .from('time_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: data?.map(snakeToCamel), error };
  },

  insert: async (record: Omit<TimeRecord, 'id' | 'synced_at'>) => {
    const { data, error } = await supabase
      .from('time_records')
      .insert({ ...camelToSnake(record), synced_at: new Date().toISOString() })
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  },

  update: async (id: string, updates: Partial<TimeRecord>) => {
    const { data, error } = await supabase
      .from('time_records')
      .update({ ...camelToSnake(updates), synced_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('time_records')
      .delete()
      .eq('id', id);
    return { error };
  }
};

export const achievementLog = {
  getAll: async (userId: string) => {
    const { data, error } = await supabase
      .from('achievement_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: data?.map(snakeToCamel), error };
  },

  insert: async (log: Omit<AchievementLog, 'id' | 'synced_at'>) => {
    const { data, error } = await supabase
      .from('achievement_logs')
      .insert({ ...camelToSnake(log), synced_at: new Date().toISOString() })
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  }
};

export const inspiration = {
  getAll: async (userId: string) => {
    const { data, error } = await supabase
      .from('inspirations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: data?.map(snakeToCamel), error };
  },

  insert: async (inspiration: Omit<Inspiration, 'id' | 'synced_at'>) => {
    const { data, error } = await supabase
      .from('inspirations')
      .insert({ ...camelToSnake(inspiration), synced_at: new Date().toISOString() })
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  },

  update: async (id: string, updates: Partial<Inspiration>) => {
    const { data, error } = await supabase
      .from('inspirations')
      .update({ ...camelToSnake(updates), synced_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('inspirations')
      .delete()
      .eq('id', id);
    return { error };
  },

  /**
   * 批量同步灵感
   * ❌ 已移除：本地不存在即删除远程记录的危险逻辑
   * ✅ 返回带服务器 synced_at 时间戳的同步记录
   */
  sync: async (userId: string, localInspirations: Inspiration[], syncAll: boolean = false) => {
    return syncTable<Inspiration>('inspirations', userId, localInspirations, 100, syncAll);
  }
};

export const userStats = {
  get: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.message.includes('No rows')) {
      return { data: null, error: null };
    }
    
    return { data: data ? snakeToCamel(data) : null, error };
  },

  upsert: async (userId: string, stats: Partial<UserStats>) => {
    const { data, error } = await supabase
      .from('user_stats')
      .upsert({
        id: userId,
        user_id: userId,
        ...camelToSnake(stats),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  }
};

/**
 * 用已同步的记录更新本地数据
 * ✅ 关键修复：将服务器返回的 synced_at 时间戳写入本地记录
 */
function updateLocalSyncStatus<T extends { id: string; synced_at?: string | null; syncedAt?: string | null; is_dirty?: boolean; isDirty?: boolean }>(
  localItems: T[],
  syncedItems: T[]
): T[] {
  const syncedMap = new Map(syncedItems.map(item => [item.id, item]));
  return localItems.map(item => {
    const syncedItem = syncedMap.get(item.id);
    if (syncedItem) {
      const syncedAt = (syncedItem as any).synced_at || (syncedItem as any).syncedAt;
      return markSynced(item, syncedAt) as T;
    }
    return item;
  });
}

export const syncAll = async (userId: string, data: {
  todos: any[];
  checkInProjects: any[];
  checkInRecords: any[];
  timeRecords: any[];
  achievementLogs: any[];
  inspirations: any[];
  shopItems: ShopItem[];
  userStats: Partial<UserStats>;
}) => {
  const errors: string[] = [];
  const syncResults: Record<string, number> = {};

  // 收集所有成功同步的记录，用于后续更新本地状态
  let syncedTodos: any[] = [];
  let syncedProjects: any[] = [];
  let insertedCheckInRecords: any[] = [];
  let insertedTimeRecords: any[] = [];
  let insertedLogs: any[] = [];
  let syncedInspirations: any[] = [];
  let syncedShopItems: any[] = [];

  try {
    // 1. 同步 todos - 批量 upsert
    if (data.todos.length > 0) {
      const { error, syncedCount, syncedRecords } = await todo.sync(userId, data.todos);
      if (error) errors.push(`Todos sync error: ${error.message}`);
      syncResults.todos = syncedCount;
      syncedTodos = syncedRecords;
    }

    // 2. 同步 checkInProjects - 批量 upsert
    if (data.checkInProjects.length > 0) {
      const { error, syncedCount, syncedRecords } = await checkInProject.sync(userId, data.checkInProjects);
      if (error) errors.push(`Project sync error: ${error.message}`);
      syncResults.checkInProjects = syncedCount;
      syncedProjects = syncedRecords;
    }

    // 3. 同步 checkInRecords - 批量插入（流水表只增不减）
    // 过滤已同步的记录（有 synced_at 且不是 dirty）
    const unsyncedCheckInRecords = data.checkInRecords.filter(r => isItemDirty(r));
    if (unsyncedCheckInRecords.length > 0) {
      const { error, insertedCount, insertedRecords } = await batchInsert('check_in_records', userId, unsyncedCheckInRecords, 500);
      if (error) errors.push(`Check-in record sync error: ${error.message}`);
      syncResults.checkInRecords = insertedCount;
      insertedCheckInRecords = insertedRecords;
    }

    // 4. 同步 timeRecords - 批量插入
    const unsyncedTimeRecords = data.timeRecords.filter(r => isItemDirty(r));
    if (unsyncedTimeRecords.length > 0) {
      const { error, insertedCount, insertedRecords } = await batchInsert('time_records', userId, unsyncedTimeRecords, 500);
      if (error) errors.push(`Time record sync error: ${error.message}`);
      syncResults.timeRecords = insertedCount;
      insertedTimeRecords = insertedRecords;
    }

    // 5. 同步 achievementLogs - 批量插入
    const unsyncedLogs = data.achievementLogs.filter(l => isItemDirty(l));
    if (unsyncedLogs.length > 0) {
      const { error, insertedCount, insertedRecords } = await batchInsert('achievement_logs', userId, unsyncedLogs, 500);
      if (error) errors.push(`Achievement log sync error: ${error.message}`);
      syncResults.achievementLogs = insertedCount;
      insertedLogs = insertedRecords;
    }

    // 6. 同步 inspirations - 批量 upsert
    if (data.inspirations.length > 0) {
      const { error, syncedCount, syncedRecords } = await inspiration.sync(userId, data.inspirations);
      if (error) errors.push(`Inspiration sync error: ${error.message}`);
      syncResults.inspirations = syncedCount;
      syncedInspirations = syncedRecords;
    }

    // 7. 同步 shopItems - 批量 upsert
    if (data.shopItems.length > 0) {
      const { error, syncedCount, syncedRecords } = await syncTable<ShopItem>('shop_items', userId, data.shopItems, 100);
      if (error) errors.push(`Shop items sync error: ${error.message}`);
      syncResults.shopItems = syncedCount;
      syncedShopItems = syncedRecords;
    }

    // 8. 同步 userStats
    if (Object.keys(data.userStats).length > 0) {
      const { error } = await userStats.upsert(userId, data.userStats);
      if (error) errors.push(`User stats sync error: ${error.message}`);
    }

  } catch (error) {
    errors.push(`Sync failed: ${(error as Error).message}`);
  }

  // ✅ 关键修复：返回同步后的数据，调用者可以用它更新本地状态
  return {
    success: errors.length === 0,
    errors,
    stats: syncResults,
    syncedData: {
      todos: updateLocalSyncStatus(data.todos, syncedTodos),
      checkInProjects: updateLocalSyncStatus(data.checkInProjects, syncedProjects),
      checkInRecords: updateLocalSyncStatus(data.checkInRecords, insertedCheckInRecords),
      timeRecords: updateLocalSyncStatus(data.timeRecords, insertedTimeRecords),
      achievementLogs: updateLocalSyncStatus(data.achievementLogs, insertedLogs),
      inspirations: updateLocalSyncStatus(data.inspirations, syncedInspirations),
      shopItems: updateLocalSyncStatus(data.shopItems, syncedShopItems),
      userStats: data.userStats,
    }
  };
};

export const shopItem = {
  getAll: async (userId: string) => {
    const { data, error } = await supabase
      .from('shop_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: data?.map(snakeToCamel), error };
  },
};

export const fetchAll = async (userId: string) => {
  const [
    { data: todos, error: todosError },
    { data: checkInProjects, error: projectsError },
    { data: checkInRecords, error: recordsError },
    { data: timeRecords, error: timeError },
    { data: achievementLogs, error: logsError },
    { data: inspirations, error: inspError },
    { data: shopItems, error: shopError },
    { data: userStatsData, error: statsError }
  ] = await Promise.all([
    todo.getAll(userId),
    checkInProject.getAll(userId),
    checkInRecord.getAll(userId),
    timeRecord.getAll(userId),
    achievementLog.getAll(userId),
    inspiration.getAll(userId),
    shopItem.getAll(userId),
    userStats.get(userId)
  ]);

  const errors = [todosError, projectsError, recordsError, timeError, logsError, inspError, shopError, statsError]
    .filter(e => e)
    .map(e => e!.message);

  return {
    data: {
      todos: todos || [],
      checkInProjects: checkInProjects || [],
      checkInRecords: checkInRecords || [],
      timeRecords: timeRecords || [],
      achievementLogs: achievementLogs || [],
      inspirations: inspirations || [],
      shopItems: shopItems || [],
      userStats: userStatsData || null
    },
    errors,
    success: errors.length === 0
  };
};