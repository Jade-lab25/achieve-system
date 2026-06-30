import { useState, useEffect, useCallback } from 'react';
import { syncAll, fetchAll } from '../supabase/database';
import type { Todo, CheckInProject, CheckInRecord, TimeRecord, AchievementLog, Inspiration, Syncable, ShopItem } from '../types';
import type { UserStats } from '../supabase/types';

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
  return {
    ...item,
    is_dirty: false,
    synced_at: syncedAt,
  };
}

interface SyncOptions {
  onDataFetched?: (data: any) => void;
}

export function useSync(userId: string | null, options?: SyncOptions) {
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSync: null,
    syncStatus: 'idle',
    syncMessage: ''
  });

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
    };
  }, [userId]);

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

    setSyncState(prev => ({ ...prev, isSyncing: true, syncStatus: 'syncing', syncMessage: '正在同步数据...' }));

    try {
      const syncStartTime = Date.now();
      const localData = loadLocalData();

      // 统计需要同步的记录数（增量同步）
      const dirtyCounts = {
        todos: localData.todos.filter(t => t.is_dirty || !t.synced_at).length,
        checkInProjects: localData.checkInProjects.filter(p => p.is_dirty || !p.synced_at).length,
        checkInRecords: localData.checkInRecords.filter(r => r.is_dirty || !r.synced_at).length,
        timeRecords: localData.timeRecords.filter(r => r.is_dirty || !r.synced_at).length,
        achievementLogs: localData.achievementLogs.filter(l => l.is_dirty || !l.synced_at).length,
        inspirations: localData.inspirations.filter(i => i.is_dirty || !i.synced_at).length,
        shopItems: localData.shopItems.filter(s => s.is_dirty || !s.synced_at).length,
      };
      const totalDirty = Object.values(dirtyCounts).reduce((a, b) => a + b, 0);
      console.log('[Sync] Incremental sync:', { totalDirty, ...dirtyCounts });

      const { success, errors, stats } = await syncAll(userId, localData);
      console.log('[Sync] syncAll result:', { success, errors, stats });

      if (success) {
        const { data: remoteData } = await fetchAll(userId);

        const syncedAt = new Date().toISOString();
        const mergedData: SyncData = {
          todos: mergeData(localData.todos, remoteData.todos, syncedAt),
          checkInProjects: mergeData(localData.checkInProjects, remoteData.checkInProjects, syncedAt),
          checkInRecords: mergeData(localData.checkInRecords, remoteData.checkInRecords, syncedAt),
          timeRecords: mergeData(localData.timeRecords, remoteData.timeRecords, syncedAt),
          achievementLogs: mergeData(localData.achievementLogs, remoteData.achievementLogs, syncedAt),
          inspirations: mergeData(localData.inspirations, remoteData.inspirations, syncedAt),
          shopItems: mergeData(localData.shopItems, remoteData.shopItems, syncedAt),
          userStats: { ...localData.userStats, ...remoteData.userStats }
        };

        saveLocalData(mergedData);

        // ✅ 同步完成后也更新 React state（清除 is_dirty 标记等）
        if (options?.onDataFetched) {
          options.onDataFetched(mergedData);
        }

        const syncDuration = ((Date.now() - syncStartTime) / 1000).toFixed(1);
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          syncStatus: 'synced',
          syncMessage: `同步成功，共同步 ${totalDirty} 条记录，耗时 ${syncDuration} 秒`,
          lastSync: syncedAt
        }));

        return mergedData;
      } else {
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          syncStatus: 'error',
          syncMessage: `同步失败: ${errors.join(', ')}`
        }));
      }
    } catch (error) {
      console.error('[Sync] performSync error:', error);
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
    
    if (userId && navigator.onLine) {
      setTimeout(() => {
        performSync(userId!);
      }, 1000);
    }
  }, [saveLocalData, performSync]);

  return {
    syncState,
    loadLocalData,
    saveLocalData,
    performSync,
    fetchFromCloud,
    syncOnChange
  };
}

function mergeData<T extends { id: string; synced_at?: string | null; is_dirty?: boolean; created_at?: string }>(
  local: T[],
  remote: T[],
  syncedAt: string
): T[] {
  const merged: T[] = [];
  const seen = new Set<string>();

  // ✅ 本地优先：确保本地未同步的 dirty 记录优先被处理
  [...local, ...remote].forEach(item => {
    if (seen.has(item.id)) return;
    seen.add(item.id);

    const remoteItem = remote.find(r => r.id === item.id);
    const localItem = local.find(l => l.id === item.id);

    if (remoteItem && localItem) {
      // 如果本地有未同步的更改，保留本地并标记为已同步
      if (localItem.is_dirty) {
        merged.push(markSynced(localItem, syncedAt));
      } else {
        // 否则取更新的版本
        const remoteTime = remoteItem.synced_at ? new Date(remoteItem.synced_at).getTime() : 0;
        const localTime = localItem.synced_at ? new Date(localItem.synced_at).getTime() : 0;
        const winner = localTime > remoteTime ? localItem : remoteItem;
        merged.push(markSynced(winner, syncedAt));
      }
    } else if (remoteItem) {
      merged.push(remoteItem);
    } else if (localItem) {
      // 只有本地的新记录，标记为已同步
      merged.push(markSynced(localItem, syncedAt));
    }
  });

  // 按创建时间倒序排列（确保最新的记录在前面）
  return merged.sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });
}