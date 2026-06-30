import assert from 'node:assert/strict';
import { markDirty, markSynced, isItemDirty, prepareSyncPayload } from '../src/utils/syncState.ts';

const dirtyItem = markDirty({ id: '1', title: 'demo' });
assert.equal(isItemDirty(dirtyItem), true, 'new item should be treated as dirty');

const syncedItem = markSynced(dirtyItem, '2026-07-01T00:00:00.000Z');
assert.equal(isItemDirty(syncedItem), false, 'synced item should not be treated as dirty');
assert.equal(syncedItem.is_dirty, false, 'snake_case dirty flag should be cleared');
assert.equal(syncedItem.isDirty, false, 'camelCase dirty flag should be cleared');
assert.equal(syncedItem.synced_at, '2026-07-01T00:00:00.000Z', 'snake_case synced timestamp should be set');
assert.equal(syncedItem.syncedAt, '2026-07-01T00:00:00.000Z', 'camelCase synced timestamp should be set');

const payload = prepareSyncPayload({ id: '2', is_dirty: true, isDirty: true, synced_at: null, syncedAt: null }, 'user-1', '2026-07-01T00:00:00.000Z');
assert.equal(payload.is_dirty, false, 'remote payload should clear dirty flag');
assert.equal(payload.isDirty, false, 'remote payload should clear camel dirty flag');
assert.equal(payload.user_id, 'user-1', 'remote payload should include user id');
assert.equal(payload.synced_at, '2026-07-01T00:00:00.000Z', 'remote payload should include synced timestamp');

console.log('syncState regression tests passed');
