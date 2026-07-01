import assert from 'node:assert/strict';
import { markDirty, markSynced, isItemDirty } from '../src/utils/syncState.ts';
import { sanitizeForSync } from '../src/utils/syncPayload.ts';

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

const shopPayload = sanitizeForSync({
  id: 'shop-1',
  name: 'Coffee',
  isPurchased: true,
  purchasedAt: '2026-07-02T08:00:00.000Z',
}, 'user-1', '2026-07-02T08:01:00.000Z', 'shop_items');
assert.equal(shopPayload.is_purchased, true, 'camelCase fields should be converted to snake_case');
assert.equal(shopPayload.purchased_at, undefined, 'shop payload should omit purchased_at for old Supabase schemas');

const purchaseLogPayload = sanitizeForSync({
  id: 'log-1',
  type: 'shop_purchase',
  title: 'Buy coffee',
  points: -10,
  createdAt: '2026-07-02T08:00:00.000Z',
  shopItemId: 'shop-1',
}, 'user-1', '2026-07-02T08:01:00.000Z', 'achievement_logs');
assert.equal(purchaseLogPayload.type, 'commodity', 'shop purchases should sync as commodity for old achievement log constraints');
assert.equal(purchaseLogPayload.shop_item_id, undefined, 'achievement log payload should omit shop_item_id for old Supabase schemas');
assert.equal(purchaseLogPayload.created_at, '2026-07-02T08:00:00.000Z', 'createdAt should still be synced');

console.log('syncState regression tests passed');
