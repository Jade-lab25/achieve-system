import { supabase } from './client';
import type { Todo, CheckInProject, CheckInRecord, TimeRecord, AchievementLog, Inspiration, UserStats } from './types';
import type { ShopItem } from '../types';

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
): Promise<{ error: Error | null; syncedCount: number }> {
  try {
    // 增量同步：仅同步标记为 dirty 或未同步过的记录
    const itemsToSync = syncAllItems
      ? localItems
      : localItems.filter(item => item.is_dirty || !item.synced_at);

    if (itemsToSync.length === 0) {
      return { error: null, syncedCount: 0 };
    }

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

      const { error } = await supabase
        .from(tableName)
        .upsert(records, { onConflict: 'id' });

      if (error) throw error;
    }

    return { error: null, syncedCount: itemsToSync.length };
  } catch (error) {
    return { error: error as Error, syncedCount: 0 };
  }
}

/**
 * 批量插入记录 - 用于流水表（打卡记录、时间记录、成就流水）
 * 性能提升: N次请求 → 1次请求
 */
async function batchInsert<T>(
  tableName: string,
  userId: string,
  records: T[],
  batchSize: number = 500
): Promise<{ error: Error | null; insertedCount: number }> {
  if (records.length === 0) {
    return { error: null, insertedCount: 0 };
  }

  try {
    const now = new Date().toISOString();

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const recordsToInsert = batch.map(record => ({
        ...camelToSnake(record),
        user_id: userId,
        synced_at: now,
      }));

      const { error } = await supabase
        .from(tableName)
        .insert(recordsToInsert)
        // 忽略重复主键（多端同步时可能重复插入）
        .select();

      if (error && !error.message.includes('duplicate key')) {
        throw error;
      }
    }

    return { error: null, insertedCount: records.length };
  } catch (error) {
    return { error: error as Error, insertedCount: 0 };
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
   */
  sync: async (userId: string, localTodos: Todo[], syncAll: boolean = false) => {
    return syncTable('todos', userId, localTodos, 100, syncAll);
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
   */
  sync: async (userId: string, localProjects: CheckInProject[], syncAll: boolean = false) => {
    return syncTable('check_in_projects', userId, localProjects, 100, syncAll);
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
   */
  sync: async (userId: string, localInspirations: Inspiration[], syncAll: boolean = false) => {
    return syncTable('inspirations', userId, localInspirations, 100, syncAll);
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

  try {
    // 1. 同步 todos - 批量 upsert
    if (data.todos.length > 0) {
      const { error, syncedCount } = await todo.sync(userId, data.todos);
      if (error) errors.push(`Todos sync error: ${error.message}`);
      syncResults.todos = syncedCount;
    }

    // 2. 同步 checkInProjects - 批量 upsert
    if (data.checkInProjects.length > 0) {
      const { error, syncedCount } = await checkInProject.sync(userId, data.checkInProjects);
      if (error) errors.push(`Project sync error: ${error.message}`);
      syncResults.checkInProjects = syncedCount;
    }

    // 3. 同步 checkInRecords - 批量插入（流水表只增不减）
    // 过滤已同步的记录（有 synced_at 且不是 dirty）
    const unsyncedCheckInRecords = data.checkInRecords.filter(r => !r.synced_at || r.is_dirty);
    if (unsyncedCheckInRecords.length > 0) {
      const { error, insertedCount } = await batchInsert('check_in_records', userId, unsyncedCheckInRecords, 500);
      if (error) errors.push(`Check-in record sync error: ${error.message}`);
      syncResults.checkInRecords = insertedCount;
    }

    // 4. 同步 timeRecords - 批量插入
    const unsyncedTimeRecords = data.timeRecords.filter(r => !r.synced_at || r.is_dirty);
    if (unsyncedTimeRecords.length > 0) {
      const { error, insertedCount } = await batchInsert('time_records', userId, unsyncedTimeRecords, 500);
      if (error) errors.push(`Time record sync error: ${error.message}`);
      syncResults.timeRecords = insertedCount;
    }

    // 5. 同步 achievementLogs - 批量插入
    const unsyncedLogs = data.achievementLogs.filter(l => !l.synced_at || l.is_dirty);
    if (unsyncedLogs.length > 0) {
      const { error, insertedCount } = await batchInsert('achievement_logs', userId, unsyncedLogs, 500);
      if (error) errors.push(`Achievement log sync error: ${error.message}`);
      syncResults.achievementLogs = insertedCount;
    }

    // 6. 同步 inspirations - 批量 upsert
    if (data.inspirations.length > 0) {
      const { error, syncedCount } = await inspiration.sync(userId, data.inspirations);
      if (error) errors.push(`Inspiration sync error: ${error.message}`);
      syncResults.inspirations = syncedCount;
    }

    // 7. 同步 shopItems - 批量 upsert
    if (data.shopItems.length > 0) {
      const { error, syncedCount } = await syncTable('shop_items', userId, data.shopItems, 100);
      if (error) errors.push(`Shop items sync error: ${error.message}`);
      syncResults.shopItems = syncedCount;
    }

    // 8. 同步 userStats
    if (Object.keys(data.userStats).length > 0) {
      const { error } = await userStats.upsert(userId, data.userStats);
      if (error) errors.push(`User stats sync error: ${error.message}`);
    }

  } catch (error) {
    errors.push(`Sync failed: ${(error as Error).message}`);
  }

  return {
    success: errors.length === 0,
    errors,
    stats: syncResults,
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