export interface SyncStateLike {
  synced_at?: string | null;
  syncedAt?: string | null;
  is_dirty?: boolean;
  isDirty?: boolean;
}

export function isItemDirty<T extends SyncStateLike>(item: T | null | undefined): boolean {
  if (!item) return false;
  return Boolean(item.is_dirty || item.isDirty || !item.synced_at || !item.syncedAt);
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

// ─── 删除追踪 ────────────────────────────────────────────────
// 本地删除项目后，需要通知云端同步删除。deletedIds 记录所有待同步的已删除 ID。
// 在 performSync 中删除云端记录后清空对应的 deletedIds。

const DELETED_IDS_KEY = 'work-status-app-deleted-ids';

export type DeletedIdsCategory = 'todos' | 'checkInProjects' | 'checkInRecords' | 'timeRecords' | 'achievementLogs' | 'inspirations' | 'shopItems';

export type DeletedIds = Record<DeletedIdsCategory, string[]>;

export function getDeletedIds(): DeletedIds {
  try {
    const saved = localStorage.getItem(DELETED_IDS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { todos: [], checkInProjects: [], checkInRecords: [], timeRecords: [], achievementLogs: [], inspirations: [], shopItems: [] };
}

export function addDeletedId(category: DeletedIdsCategory, id: string): void {
  const ids = getDeletedIds();
  if (!ids[category].includes(id)) {
    ids[category].push(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(ids));
  }
}

export function addDeletedIds(category: DeletedIdsCategory, newIds: string[]): void {
  const ids = getDeletedIds();
  let changed = false;
  for (const id of newIds) {
    if (!ids[category].includes(id)) {
      ids[category].push(id);
      changed = true;
    }
  }
  if (changed) {
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(ids));
  }
}

export function clearDeletedIds(category?: DeletedIdsCategory): void {
  if (category) {
    const ids = getDeletedIds();
    ids[category] = [];
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(ids));
  } else {
    localStorage.removeItem(DELETED_IDS_KEY);
  }
}
