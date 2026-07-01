import { useState, useEffect, useCallback, useRef } from 'react';
import { syncAll, fetchAll, deleteBatch } from '../supabase/database';
import type { Todo, CheckInProject, CheckInRecord, TimeRecord, AchievementLog, Inspiration, Syncable, ShopItem } from '../types';
import type { UserStats } from '../supabase/types';
import { markSynced as markSyncedState, isItemDirty, getDeletedIds, clearDeletedIds } from '../utils/syncState';
import type { DeletedIdsCategory } from '../utils/syncState';

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
  const messageTimeoutRef = useRef<number | null>(null);
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
      // ✅ 兼容 AppState（顶层 totalAchievements）和 SyncData（嵌套 userStats）
      const appStateData = data as any;
      const saveData = {
        todos: data.todos,
        checkInProjects: data.checkInProjects,
        checkInRecords: data.checkInRecords,
        timeRecords: data.timeRecords,
        achievementLogs: data.achievementLogs,
        inspirations: data.inspirations,
        shopItems: data.shopItems,
        totalAchievements: appStateData.totalAchievements ?? data.userStats?.total_achievements ?? 0,
        totalEarned: appStateData.totalEarned ?? data.userStats?.total_earned ?? 0,
        totalSpent: appStateData.totalSpent ?? data.userStats?.total_spent ?? 0,
        userStats: data.userStats || {},
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

      // ─── 处理本地删除 → 云端同步删除 ─────────────────────
      const CATEGORY_TO_TABLE: Record<DeletedIdsCategory, string> = {
        todos: 'todos',
        checkInProjects: 'check_in_projects',
        checkInRecords: 'check_in_records',
        timeRecords: 'time_records',
        achievementLogs: 'achievement_logs',
        inspirations: 'inspirations',
        shopItems: 'shop_items',
      };
      const deletedIds = getDeletedIds();
      let totalDeletedFromCloud = 0;
      for (const [category, ids] of Object.entries(deletedIds) as [DeletedIdsCategory, string[]][]) {
        if (ids.length > 0) {
          const tableName = CATEGORY_TO_TABLE[category];
          console.log(`[Sync] Deleting ${ids.length} ${category} from cloud (${tableName})`);
          const { error, deletedCount } = await deleteBatch(tableName, ids);
          if (error) {
            console.error(`[Sync] Failed to delete ${category} from cloud:`, error.message);
          } else {
            totalDeletedFromCloud += deletedCount;
            clearDeletedIds(category);
          }
        }
      }

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
      console.log('[Sync] Incremental sync:', { totalDirty, ...dirtyCounts, deletedFromCloud: totalDeletedFromCloud });

      // ✅ 没有脏数据也没有删除操作时，跳过
      if (totalDirty === 0 && totalDeletedFromCloud === 0) {
        console.log('[Sync] No dirty records or deletions, skipping sync');
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
        // ✅ 关键修复：先从云端拉取所有数据（包括其他设备新增的记录）
        const { data: remoteData } = await fetchAll(userId);

        const syncedAtStr = new Date().toISOString();
        // ✅ 修复同步无限循环：
        //    syncedData 已经是 syncAll 返回的、清除了脏标记的数据
        //    现在只需要用 remoteData 补充本地没有的、其他设备新增的记录
        //    shouldMarkSynced = true，确保云端来的新记录有完整的同步字段
        const mergedData: SyncData = {
          todos: mergeData(syncedData.todos, remoteData.todos, syncedAtStr, true),
          checkInProjects: mergeData(syncedData.checkInProjects, remoteData.checkInProjects, syncedAtStr, true),
          checkInRecords: mergeData(syncedData.checkInRecords, remoteData.checkInRecords, syncedAtStr, true),
          timeRecords: mergeData(syncedData.timeRecords, remoteData.timeRecords, syncedAtStr, true),
          achievementLogs: mergeData(syncedData.achievementLogs, remoteData.achievementLogs, syncedAtStr, true),
          inspirations: mergeData(syncedData.inspirations, remoteData.inspirations, syncedAtStr, true),
          shopItems: mergeData(syncedData.shopItems, remoteData.shopItems, syncedAtStr, true),
          userStats: { ...syncedData.userStats, ...remoteData.userStats }
        };

        saveLocalData(mergedData);

        // ✅ 更新 React state，让从云端下载的其他设备数据能显示在 UI 中
        //    防止下次 syncOnChange 用旧 state 覆盖 localStorage
        if (options?.onDataFetched) {
          options.onDataFetched(mergedData);
        }

        const syncDuration = ((Date.now() - syncStartTime) / 1000).toFixed(1);
        isSyncingRef.current = false;
        const parts: string[] = [];
        if (totalDirty > 0) parts.push(`共同步 ${totalDirty} 条记录`);
        if (totalDeletedFromCloud > 0) parts.push(`清理 ${totalDeletedFromCloud} 条已删除记录`);
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          syncStatus: 'synced',
          syncMessage: `同步成功${parts.length > 0 ? '，' + parts.join('，') : ''}，耗时 ${syncDuration} 秒`,
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

        // ✅ 合并本地和云端数据。
        // ⚠️ fetchFromCloud 只下载不上传，所以 shouldMarkSynced=false
        //    防止本地未上传的 dirty 记录被错误标记为已同步
        const syncedAt = new Date().toISOString();
        const mergedData: SyncData = {
          todos: mergeData(localData.todos, recalculatedTodos, syncedAt, false),
          checkInProjects: mergeData(localData.checkInProjects, data.checkInProjects, syncedAt, false),
          checkInRecords: mergeData(localData.checkInRecords, data.checkInRecords, syncedAt, false),
          timeRecords: mergeData(localData.timeRecords, data.timeRecords, syncedAt, false),
          achievementLogs: mergeData(localData.achievementLogs, data.achievementLogs, syncedAt, false),
          inspirations: mergeData(localData.inspirations, data.inspirations, syncedAt, false),
          shopItems: mergeData(localData.shopItems, data.shopItems, syncedAt, false),
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

    // ✅ 检查是否有脏数据需要上传（防止不必要的 performSync 调用）
    const hasDirtyData = (
      data.todos.some(t => isItemDirty(t)) ||
      data.checkInProjects.some(p => isItemDirty(p)) ||
      data.checkInRecords.some(r => isItemDirty(r)) ||
      data.timeRecords.some(r => isItemDirty(r)) ||
      data.achievementLogs.some(l => isItemDirty(l)) ||
      data.inspirations.some(i => isItemDirty(i)) ||
      data.shopItems.some(s => isItemDirty(s))
    );

    if (userId && navigator.onLine && !isSyncingRef.current && hasDirtyData) {
      // ✅ 防抖：清除之前的定时器，防止快速连续操作触发多次同步
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = window.setTimeout(() => {
        performSync(userId!);
      }, 1500);
    }
  }, [saveLocalData, performSync]);

  // ✅ 同步消息 5 秒后自动消失
  useEffect(() => {
    if (syncState.syncStatus === 'synced' || syncState.syncStatus === 'error') {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      messageTimeoutRef.current = window.setTimeout(() => {
        setSyncState(prev => ({ ...prev, syncMessage: '', syncStatus: 'idle' }));
      }, 5000);
    }
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, [syncState.syncStatus, syncState.syncMessage]);

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
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
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
  syncedAtStr: string,
  shouldMarkSynced: boolean = true
): T[] {
  const merged: T[] = [];
  const seen = new Set<string>();

  // 字段兼容函数：同时支持 snake_case 和 camelCase
  const getSyncedAt = (item: T): number => {
    const val = (item as any).synced_at || (item as any).syncedAt;
    return val ? new Date(val).getTime() : 0;
  };
  const isDirty = (item: T): boolean => isItemDirty(item);

  // ✅ 确保记录同时拥有 synced_at 和 syncedAt，避免 isItemDirty 误判
  //    云端数据经 snakeToCamel 转换后只有 syncedAt，缺少 synced_at
  const normalizeSyncFields = (item: T): T => {
    const a = item as any;
    if (a.syncedAt && !a.synced_at) {
      return { ...item, synced_at: a.syncedAt };
    }
    if (a.synced_at && !a.syncedAt) {
      return { ...item, syncedAt: a.synced_at };
    }
    return item;
  };

  // ✅ 云端优先：确保云端已同步的最新数据优先被采用
  [...remote, ...local].forEach(item => {
    if (seen.has(item.id)) return;
    seen.add(item.id);

    const remoteItem = remote.find(r => r.id === item.id);
    const localItem = local.find(l => l.id === item.id);

    if (remoteItem && localItem) {
      // 如果本地有未同步的更改，保留本地
      if (isDirty(localItem)) {
        // ✅ 关键修复：
        //    performSync: shouldMarkSynced=true，表示 syncAll 已上传成功，必须清除脏标记（防止无限循环！）
        //    fetchFromCloud: shouldMarkSynced=false，只下载不上传，保留本地脏标记避免误判
        merged.push(shouldMarkSynced ? markSynced(localItem, syncedAtStr) : localItem);
      } else {
        // 否则取更新的版本（比较 synced_at/syncedAt 时间）
        const remoteTime = getSyncedAt(remoteItem);
        const localTime = getSyncedAt(localItem);
        const winner = localTime > remoteTime ? localItem : remoteItem;
        // ✅ 确保 winner 同时拥有两个字段
        merged.push(normalizeSyncFields(winner));
      }
    } else if (remoteItem) {
      // ✅ 只有云端的记录（其他设备新增的！），直接用并补充缺失的同步字段
      //    这确保了多端设备新增的数据能正确同步到本地
      merged.push(normalizeSyncFields(remoteItem));
    } else if (localItem) {
      // 只有本地的新记录
      // ✅ performSync 中调用 mergeData 时 shouldMarkSynced=true 表示已上传成功
      //    fetchFromCloud 中调用时 shouldMarkSynced=false 表示还没上传，保留脏标记
      merged.push(shouldMarkSynced ? markSynced(localItem, syncedAtStr) : localItem);
    }
  });

  // ✅ 过滤掉本地已删除的记录（防止在云端删除完成前被复活）
  const allDeletedIds = new Set<string>();
  try {
    const deletedIds = getDeletedIds();
    for (const ids of Object.values(deletedIds)) {
      for (const id of ids as string[]) {
        allDeletedIds.add(id);
      }
    }
  } catch {}

  const filtered = allDeletedIds.size > 0
    ? merged.filter(item => !allDeletedIds.has(item.id))
    : merged;

  // 按创建时间倒序排列（确保最新的记录在前面）
  const getCreatedAt = (item: T): number => {
    const val = (item as any).createdAt || (item as any).created_at;
    return val ? new Date(val).getTime() : 0;
  };
  return filtered.sort((a, b) => getCreatedAt(b) - getCreatedAt(a));
}