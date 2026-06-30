export interface SyncStateLike {
  synced_at?: string | null;
  syncedAt?: string | null;
  is_dirty?: boolean;
  isDirty?: boolean;
}

export function isItemDirty<T extends SyncStateLike>(item: T | null | undefined): boolean {
  if (!item) return false;
  // ✅ 修复：snakeToCamel 将 synced_at 转为 syncedAt 后丢失 snake_case 字段
  //   用 && 替代 ||：只要有任一 synced_at/syncedAt 就认为已同步
  return Boolean(item.is_dirty || item.isDirty || (!item.synced_at && !item.syncedAt));
}

export function markDirty<T extends SyncStateLike>(item: T): T & { is_dirty: boolean; isDirty: boolean; synced_at: null; syncedAt: null } {
  return {
    ...item,
    is_dirty: true,
    isDirty: true,
    synced_at: null,
    syncedAt: null,
  };
}

export function markSynced<T extends SyncStateLike>(item: T, syncedAt: string): T & { is_dirty: false; isDirty: false; synced_at: string; syncedAt: string } {
  return {
    ...item,
    is_dirty: false,
    isDirty: false,
    synced_at: syncedAt,
    syncedAt,
  };
}

export function prepareSyncPayload<T extends Record<string, any>>(record: T, userId: string, syncedAt: string) {
  return {
    ...record,
    user_id: userId,
    synced_at: syncedAt,
    is_dirty: false,
    isDirty: false,
  };
}
