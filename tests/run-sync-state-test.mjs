import assert from 'node:assert/strict';
import { markDirty, markSynced, isItemDirty } from '../src/utils/syncState.ts';

function sanitizeForSync(record, userId, syncedAt) {
  const { is_dirty, isDirty, synced_at, syncedAt: _syncedAt, ...rest } = record;
  return {
    ...rest,
    user_id: userId,
    synced_at: syncedAt,
  };
}

const dirtyItem = markDirty({ id: '1', title: 'demo' });
assert.equal(isItemDirty(dirtyItem), true, 'new item should be treated as dirty');

const syncedItem = markSynced(dirtyItem, '2026-07-01T00:00:00.000Z');
assert.equal(isItemDirty(syncedItem), false, 'synced item should not be treated as dirty');
assert.equal(syncedItem.is_dirty, false, 'snake_case dirty flag should be cleared');
assert.equal(syncedItem.isDirty, false, 'camelCase dirty flag should be cleared');
assert.equal(syncedItem.synced_at, '2026-07-01T00:00:00.000Z', 'snake_case synced timestamp should be set');
assert.equal(syncedItem.syncedAt, '2026-07-01T00:00:00.000Z', 'camelCase synced timestamp should be set');

const sanitized = sanitizeForSync({ id: '2', is_dirty: true, isDirty: true, synced_at: null, syncedAt: null }, 'user-1', '2026-07-01T00:00:00.000Z');
assert.equal(sanitized.isDirty, undefined, 'sync payload should not include isDirty');
assert.equal(sanitized.is_dirty, undefined, 'sync payload should not include is_dirty');
assert.equal(sanitized.user_id, 'user-1', 'sync payload should include user id');
assert.equal(sanitized.synced_at, '2026-07-01T00:00:00.000Z', 'sync payload should include synced timestamp');

console.log('syncState regression tests passed');
