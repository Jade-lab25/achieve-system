import { useState, useEffect, useCallback } from 'react';
import { syncAll, fetchAll } from '../supabase/database';
import type { Todo, CheckInProject, CheckInRecord, TimeRecord, AchievementLog, Inspiration, UserStats } from '../supabase/types';

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
  userStats: Partial<UserStats>;
}

const LOCAL_STORAGE_KEY = 'work-status-app-data';

export function useSync(userId: string | null) {
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
          totalAchievements: parsed.totalAchievements || 0
        });
        
        return {
          todos: parsed.todos || [],
          checkInProjects: parsed.checkInProjects || [],
          checkInRecords: parsed.checkInRecords || [],
          timeRecords: parsed.timeRecords || [],
          achievementLogs: parsed.achievementLogs || [],
          inspirations: parsed.inspirations || [],
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
      console.log('[Sync] Starting performSync for user:', userId);
      const localData = loadLocalData();
      
      console.log('[Sync] Local data to sync:', {
        todos: localData.todos.length,
        checkInProjects: localData.checkInProjects.length,
        checkInRecords: localData.checkInRecords.length,
        timeRecords: localData.timeRecords.length,
        achievementLogs: localData.achievementLogs.length,
        inspirations: localData.inspirations.length
      });
      
      const { success, errors } = await syncAll(userId, localData);
      console.log('[Sync] syncAll result:', { success, errors });
      
      if (success) {
        const { data: remoteData, success: fetchSuccess, errors: fetchErrors } = await fetchAll(userId);
        console.log('[Sync] fetchAll result:', { fetchSuccess, fetchErrors, data: remoteData ? {
          todos: remoteData.todos.length,
          checkInProjects: remoteData.checkInProjects.length,
          checkInRecords: remoteData.checkInRecords.length,
          timeRecords: remoteData.timeRecords.length,
          achievementLogs: remoteData.achievementLogs.length,
          inspirations: remoteData.inspirations.length
        } : null });
        
        const mergedData: SyncData = {
          todos: mergeData(localData.todos, remoteData.todos),
          checkInProjects: mergeData(localData.checkInProjects, remoteData.checkInProjects),
          checkInRecords: mergeData(localData.checkInRecords, remoteData.checkInRecords),
          timeRecords: mergeData(localData.timeRecords, remoteData.timeRecords),
          achievementLogs: mergeData(localData.achievementLogs, remoteData.achievementLogs),
          inspirations: mergeData(localData.inspirations, remoteData.inspirations),
          userStats: { ...localData.userStats, ...remoteData.userStats }
        };

        saveLocalData(mergedData);
        
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          syncStatus: 'synced',
          syncMessage: '数据同步成功',
          lastSync: new Date().toISOString()
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
  }, [loadLocalData, saveLocalData]);

  const fetchFromCloud = useCallback(async (userId: string): Promise<SyncData | null> => {
    if (!navigator.onLine) {
      console.log('Offline, returning local data');
      return loadLocalData();
    }

    try {
      const { data, success } = await fetchAll(userId);
      if (success && data) {
        saveLocalData({
          todos: data.todos,
          checkInProjects: data.checkInProjects,
          checkInRecords: data.checkInRecords,
          timeRecords: data.timeRecords,
          achievementLogs: data.achievementLogs,
          inspirations: data.inspirations,
          userStats: data.userStats || {}
        });
        return data;
      }
    } catch (error) {
      console.error('Failed to fetch from cloud:', error);
    }

    return loadLocalData();
  }, [loadLocalData, saveLocalData]);

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

function mergeData<T extends { id: string; synced_at?: string | null }>(local: T[], remote: T[]): T[] {
  const merged: T[] = [];
  const seen = new Set<string>();

  [...remote, ...local].forEach(item => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    
    const remoteItem = remote.find(r => r.id === item.id);
    const localItem = local.find(l => l.id === item.id);

    if (remoteItem && localItem) {
      const remoteTime = remoteItem.synced_at ? new Date(remoteItem.synced_at).getTime() : 0;
      const localTime = localItem.synced_at ? new Date(localItem.synced_at).getTime() : 0;
      merged.push(localTime > remoteTime ? localItem : remoteItem);
    } else if (remoteItem) {
      merged.push(remoteItem);
    } else if (localItem) {
      merged.push(localItem);
    }
  });

  return merged;
}