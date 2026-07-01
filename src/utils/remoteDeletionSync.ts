interface SyncStateLike {
  synced_at?: string | null;
  syncedAt?: string | null;
  is_dirty?: boolean;
  isDirty?: boolean;
}

export function shouldDropSyncedLocalOnlyRecord<T extends SyncStateLike>(
  item: T,
  dropSyncedLocalOnly: boolean,
): boolean {
  if (!dropSyncedLocalOnly) return false;
  const hasSyncedAt = Boolean(item.synced_at || item.syncedAt);
  return hasSyncedAt && !item.is_dirty && !item.isDirty;
}
