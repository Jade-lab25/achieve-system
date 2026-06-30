import assert from 'node:assert/strict';
import { markDirty, markSynced, isItemDirty } from '../src/utils/syncState.js';

const dirtyItem = markDirty({ id: '1', title: 'demo' });
assert.equal(isItemDirty(dirtyItem), true, 'new item should be treated as dirty');

const syncedItem = markSynced(dirtyItem, '2026-07-01T00:00:00.000Z');
assert.equal(isItemDirty(syncedItem), false, 'synced item should not be treated as dirty');
assert.equal(syncedItem.is_dirty, false, 'snake_case dirty flag should be cleared');
assert.equal(syncedItem.isDirty, false, 'camelCase dirty flag should be cleared');
assert.equal(syncedItem.synced_at, '2026-07-01T00:00:00.000Z', 'snake_case synced timestamp should be set');
assert.equal(syncedItem.syncedAt, '2026-07-01T00:00:00.000Z', 'camelCase synced timestamp should be set');

console.log('syncState regression tests passed');
