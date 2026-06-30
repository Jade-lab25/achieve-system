import { useState, useEffect, useCallback, useRef } from 'react';
import { syncAll, fetchAll } from '../supabase/database';
import type { Todo, CheckInProject, CheckInRecord, TimeRecord, AchievementLog, Inspiration, Syncable, ShopItem } from '../types';
import type { UserStats } from '../supabase/types';
import { markSynced as markSyncedState, isItemDirty } from '../utils/syncState';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: string | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  syncMessage: string;
}

interface SyncData {
  todos: Todo[];
  checkInProjects: CheckInProject[];
  checkInRecords: CheckInRecord[];
  timeRecords: TimeRecord[];
  achievementLogs: AchievementLog[];
  inspirations: Inspiration[];
  shopItems: ShopItem[];
  userStats: Partial<UserStats>;
}

const LOCAL_STORAGE_KEY = 'work-status-app-data';

/** 同步成功后清除 is_dirty 标记并设置 synced_at */
function markSynced<T extends Syncable>(item: T, syncedAt: string): T {
  return markSyncedState(item, syncedAt) as T;
}

interface SyncOptions {
  onDataFetched?: (data: any) => void;
}

export function useSync(userId: string | null, options?: SyncOptions) {
  const syncTimeoutRef = useRef<number | null>(null);
  const isSyncingRef = useRef<boolean>(false);
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSync: null,
    syncStatus: 'idle',
    syncMessage: ''
  });

  const loadLocalData = useCallback((): SyncData => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      console.log('[Sync] Loading local data from key:', LOCAL_STORAGE_KEY);
      console.log('[Sync] Raw data exists:', !!saved);

      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('[Sync] Loaded data:', {
          todos: parsed.todos?.length || 0,
          checkInProjects: parsed.checkInProjects?.length || 0,
          checkInRecords: parsed.checkInRecords?.length || 0,
          timeRecords: parsed.timeRecords?.length || 0,
          achievementLogs: parsed.achievementLogs?.length || 0,
          inspirations: parsed.inspirations?.length || 0,
          shopItems: parsed.shopItems?.length || 0,
          totalAchievements: parsed.totalAchievements || 0
        });

        const timeRecords: TimeRecord[] = parsed.timeRecords || [];
        const todos: Todo[] = parsed.todos || [];

        const recalculatedTodos = todos.map((todo: Todo) => {
          const todoRecords = timeRecords.filter((r: TimeRecord) => r.todoId === todo.id && r.endTime);
          const totalSeconds = todoRecords.reduce((sum: number, record: TimeRecord) => {
            if (record.startTimestamp && record.endTime) {
              const endTime = new Date(record.endTime).getTime();
              return sum + (endTime - record.startTimestamp) / 1000;
            }
            return sum;
          }, 0);
          return { ...todo, totalTime: totalSeconds };
        });

        return {
          todos: recalculatedTodos,
          checkInProjects: parsed.checkInProjects || [],
          checkInRecords: parsed.checkInRecords || [],
          timeRecords: parsed.timeRecords || [],
          achievementLogs: parsed.achievementLogs || [],
          inspirations: parsed.inspirations || [],
          shopItems: parsed.shopItems || [],
          userStats: {
            total_achievements: parsed.totalAchievements || 0,
            total_earned: parsed.totalEarned || 0,
            total_spent: parsed.totalSpent || 0
          }
        };
      }
    } catch (e) {
      console.error('[Sync] Failed to load local data:', e);
    }
    console.log('[Sync] Returning empty data');
    return {
      todos: [],
      checkInProjects: [],
      checkInRecords: [],
      timeRecords: [],
      achievementLogs: [],
      inspirations: [],
      shopItems: [],
      userStats: {}
    };
  }, []);

  const saveLocalData = useCallback((data: SyncData) => {
    try {
      const saveData = {
        todos: data.todos,
        checkInProjects: data.checkInProjects,
        checkInRecords: data.checkInRecords,
        timeRecords: data.timeRecords,
        achievementLogs: data.achievementLogs,
        inspirations: data.inspirations,
        shopItems: data.shopItems,
        totalAchievements: data.userStats.total_achievements || 0,
        totalEarned: data.userStats.total_earned || 0,
        totalSpent: data.userStats.total_spent || 0
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(saveData));
    } catch (e) {
      console.error('Failed to save local data:', e);
    }
  }, []);

  const performSync = useCallback(async (userId: string) => {
    if (!navigator.onLine) {
      setSyncState(prev => ({ ...prev, syncStatus: 'idle', syncMessage: '当前离线，数据已保存到本地' }));
      return;
    }

    // ✅ 并发守卫：防止多个同步请求同时执行
    if (isSyncingRef.current) {
      console.log('[Sync] Already syncing, skipping duplicate call');
      return;
    }
    isSyncingRef.current = true;

    setSyncState(prev => ({ ...prev, isSyncing: true, syncStatus: 'syncing', syncMessage: '正在同步数据...' }));

    try {
      const syncStartTime = Date.now();
      const localData = loadLocalData();

      // 统计需要同步的记录数（增量同步）
      const dirtyCounts = {
        todos: localData.todos.filter(t => isItemDirty(t)).length,
        checkInProjects: localData.checkInProjects.filter(p => isItemDirty(p)).length,
        checkInRecords: localData.checkInRecords.filter(r => isItemDirty(r)).length,
        timeRecords: localData.timeRecords.filter(r => isItemDirty(r)).length,
        achievementLogs: localData.achievementLogs.filter(l => isItemDirty(l)).length,
        inspirations: localData.inspirations.filter(i => isItemDirty(i)).length,
        shopItems: localData.shopItems.filter(s => isItemDirty(s)).length,
      };
      const totalDirty = Object.values(dirtyCounts).reduce((a, b) => a + b, 0);
      console.log('[Sync] Incremental sync:', { totalDirty, ...dirtyCounts });

      // ✅ 没有脏数据需要同步时，跳过 fetchAll 避免触发 onDataFetched 导致循环
      if (totalDirty === 0) {
        console.log('[Sync] No dirty records, skipping sync');
        isSyncingRef.current = false;
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          syncStatus: 'synced',
          syncMessage: '没有需要同步的数据',
        }));
        return null;
      }

      const { success, errors, stats, syncedData } = await syncAll(userId, localData);
      console.log('[Sync] syncAll result:', { success, errors, stats });

      if (success) {
        // ✅ 关键修复：先更新本地记录的同步状态（清除 is_dirty，设置 synced_at）
        const { data: remoteData } = await fetchAll(userId);

        const syncedAtStr = new Date().toISOString();
        const mergedData: SyncData = {
          // 先用 syncedData（本地记录已更新同步状态），再和云端数据合并
          todos: mergeData(syncedData.todos, remoteData.todos, syncedAtStr),
          checkInProjects: mergeData(syncedData.checkInProjects, remoteData.checkInProjects, syncedAtStr),
          checkInRecords: mergeData(syncedData.checkInRecords, remoteData.checkInRecords, syncedAtStr),
          timeRecords: mergeData(syncedData.timeRecords, remoteData.timeRecords, syncedAtStr),
          achievementLogs: mergeData(syncedData.achievementLogs, remoteData.achievementLogs, syncedAtStr),
          inspirations: mergeData(syncedData.inspirations, remoteData.inspirations, syncedAtStr),
          shopItems: mergeData(syncedData.shopItems, remoteData.shopItems, syncedAtStr),
          userStats: { ...syncedData.userStats, ...remoteData.userStats }
        };

        saveLocalData(mergedData);

        // ✅ 同步完成后更新 React state
        if (options?.onDataFetched) {
          options.onDataFetched(mergedData);
        }

        const syncDuration = ((Date.now() - syncStartTime) / 1000).toFixed(1);
        isSyncingRef.current = false;
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          syncStatus: 'synced',
          syncMessage: `同步成功，共同步 ${totalDirty} 条记录，耗时 ${syncDuration} 秒`,
          lastSync: syncedAtStr
        }));

        return mergedData;
      } else {
        isSyncingRef.current = false;
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          syncStatus: 'error',
          syncMessage: `同步失败: ${errors.join(', ')}`
        }));
      }
    } catch (error) {
      console.error('[Sync] performSync error:', error);
      isSyncingRef.current = false;
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncStatus: 'error',
        syncMessage: `同步失败: ${(error as Error).message}`
      }));
    }

    return null;
  }, [loadLocalData, saveLocalData, options]);

  const fetchFromCloud = useCallback(async (userId: string): Promise<SyncData | null> => {
    if (!navigator.onLine) {
      console.log('Offline, returning local data');
      return loadLocalData();
    }

    try {
      const { data, success } = await fetchAll(userId);
      if (success && data) {
        // 先加载本地数据，保留 is_dirty 的记录
        const localData = loadLocalData();
        const timeRecords: TimeRecord[] = data.timeRecords || [];
        const todos: Todo[] = data.todos || [];

        const recalculatedTodos = todos.map((todo: Todo) => {
          const todoRecords = timeRecords.filter((r: TimeRecord) => r.todoId === todo.id && r.endTime);
          const totalSeconds = todoRecords.reduce((sum: number, record: TimeRecord) => {
            if (record.startTimestamp && record.endTime) {
              const endTime = new Date(record.endTime).getTime();
              return sum + (endTime - record.startTimestamp) / 1000;
            }
            return sum;
          }, 0);
          return { ...todo, totalTime: totalSeconds };
        });

        // ✅ 合并本地和云端数据，保留本地未同步的 dirty 记录
        const syncedAt = new Date().toISOString();
        const mergedData: SyncData = {
          todos: mergeData(localData.todos, recalculatedTodos, syncedAt),
          checkInProjects: mergeData(localData.checkInProjects, data.checkInProjects, syncedAt),
          checkInRecords: mergeData(localData.checkInRecords, data.checkInRecords, syncedAt),
          timeRecords: mergeData(localData.timeRecords, data.timeRecords, syncedAt),
          achievementLogs: mergeData(localData.achievementLogs, data.achievementLogs, syncedAt),
          inspirations: mergeData(localData.inspirations, data.inspirations, syncedAt),
          shopItems: mergeData(localData.shopItems, data.shopItems, syncedAt),
          userStats: { ...localData.userStats, ...data.userStats }
        };

        // 保存到 localStorage
        saveLocalData(mergedData);

        // ✅ 回调更新 React state（关键修复）
        if (options?.onDataFetched) {
          options.onDataFetched(mergedData);
        }

        return mergedData;
      }
    } catch (error) {
      console.error('[Sync] fetchFromCloud error:', error);
    }

    return loadLocalData();
  }, [loadLocalData, saveLocalData, options]);

  const syncOnChange = useCallback(async (userId: string | null, data: SyncData) => {
    saveLocalData(data);

    if (userId && navigator.onLine && !isSyncingRef.current) {
      // ✅ 防抖：清除之前的定时器，防止快速连续操作触发多次同步
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = window.setTimeout(() => {
        performSync(userId!);
      }, 1500);
    }
  }, [saveLocalData, performSync]);

  // ✅ 在线/离线状态监听（放在 performSync 声明之后，避免声明前使用）
  useEffect(() => {
    const handleOnline = () => {
      setSyncState(prev => ({ ...prev, isOnline: true }));
      if (userId) {
        performSync(userId);
      }
    };

    const handleOffline = () => {
      setSyncState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // 组件卸载时清除定时器
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [userId, performSync]);

  return {
    syncState,
    loadLocalData,
    saveLocalData,
    performSync,
    fetchFromCloud,
    syncOnChange
  };
}

function mergeData<T extends { id: string; synced_at?: string | null; syncedAt?: string | null; is_dirty?: boolean; isDirty?: boolean; created_at?: string; createdAt?: string }>(
  local: T[],
  remote: T[],
  syncedAtStr: string
): T[] {
  const merged: T[] = [];
  const seen = new Set<string>();

  // 字段兼容函数：同时支持 snake_case 和 camelCase
  const getSyncedAt = (item: T): number => {
    const val = (item as any).synced_at || (item as any).syncedAt;
    return val ? new Date(val).getTime() : 0;
  };
  const isDirty = (item: T): boolean => isItemDirty(item);

  // ✅ 云端优先：确保云端已同步的最新数据优先被采用
  [...remote, ...local].forEach(item => {
    if (seen.has(item.id)) return;
    seen.add(item.id);

    const remoteItem = remote.find(r => r.id === item.id);
    const localItem = local.find(l => l.id === item.id);

    if (remoteItem && localItem) {
      // 如果本地有未同步的更改，保留本地并标记为已同步
      if (isDirty(localItem)) {
        merged.push(markSynced(localItem, syncedAtStr));
      } else {
        // 否则取更新的版本（比较 synced_at/syncedAt 时间）
        const remoteTime = getSyncedAt(remoteItem);
        const localTime = getSyncedAt(localItem);
        const winner = localTime > remoteTime ? localItem : remoteItem;
        // ❌ 不要用 markSynced！会覆盖 synced_at 破坏下次比较
        merged.push(winner);
      }
    } else if (remoteItem) {
      // 只有云端的记录，直接用
      merged.push(remoteItem);
    } else if (localItem) {
      // 只有本地的新记录，标记为已同步
      merged.push(markSynced(localItem, syncedAtStr));
    }
  });

  // 按创建时间倒序排列（确保最新的记录在前面）
  const getCreatedAt = (item: T): number => {
    const val = (item as any).createdAt || (item as any).created_at;
    return val ? new Date(val).getTime() : 0;
  };
  return merged.sort((a, b) => getCreatedAt(b) - getCreatedAt(a));
}