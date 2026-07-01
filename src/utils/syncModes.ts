export type SyncMode = 'insert' | 'upsert';

export function getSyncModeForTable(tableName: string): SyncMode {
  return tableName === 'time_records' ? 'upsert' : 'insert';
}
