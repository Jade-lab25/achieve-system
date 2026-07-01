/**
 * 调试：检查 AppState 和 SyncData 之间的字段兼容性
 */

import { markDirty, markSynced, isItemDirty } from '../src/utils/syncState.js';

// 模拟 loadLocalData 返回的 SyncData 格式
interface SyncData {
  todos: any[];
  checkInProjects: any[];
  checkInRecords: any[];
  timeRecords: any[];
  achievementLogs: any[];
  inspirations: any[];
  shopItems: any[];
  userStats: {
    total_achievements?: number;
    total_earned?: number;
    total_spent?: number;
  };
}

// 模拟 AppState 格式（包含顶层统计字段）
interface AppState extends SyncData {
  totalAchievements?: number;
  totalEarned?: number;
  totalSpent?: number;
}

console.log('========================================');
console.log('🔍 调试：AppState vs SyncData 字段兼容性');
console.log('========================================\n');

// 模拟 saveLocalData 逻辑
function saveLocalData(data: SyncData): AppState {
  const appStateData = data as any;
  const saveData: AppState = {
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
  return saveData;
}

// 模拟 loadLocalData 逻辑
function loadLocalData(saved: AppState): SyncData {
  return {
    todos: saved.todos,
    checkInProjects: saved.checkInProjects,
    checkInRecords: saved.checkInRecords,
    timeRecords: saved.timeRecords,
    achievementLogs: saved.achievementLogs,
    inspirations: saved.inspirations,
    shopItems: saved.shopItems,
    userStats: {
      total_achievements: saved.totalAchievements || 0,
      total_earned: saved.totalEarned || 0,
      total_spent: saved.totalSpent || 0
    }
  };
}

// 模拟 hasDirtyData 检查
function checkHasDirtyData(data: SyncData): boolean {
  return (
    data.todos.some(t => isItemDirty(t)) ||
    data.checkInProjects.some(p => isItemDirty(p)) ||
    data.checkInRecords.some(r => isItemDirty(r)) ||
    data.timeRecords.some(r => isItemDirty(r)) ||
    data.achievementLogs.some(l => isItemDirty(l)) ||
    data.inspirations.some(i => isItemDirty(i)) ||
    data.shopItems.some(s => isItemDirty(s))
  );
}

console.log('场景 1：检查 save -> load 循环是否保持同步字段\n');

// 初始状态：已同步的记录
const syncedRecord = markSynced(
  { id: 'test-1', title: '测试任务' },
  '2024-01-01T00:00:00.000Z'
);
console.log('初始已同步记录：');
console.log(`  is_dirty: ${syncedRecord.is_dirty}`);
console.log(`  isDirty: ${syncedRecord.isDirty}`);
console.log(`  synced_at: ${syncedRecord.synced_at}`);
console.log(`  syncedAt: ${syncedRecord.syncedAt}`);
console.log(`  isItemDirty: ${isItemDirty(syncedRecord)}\n`);

// 模拟保存到 localStorage
const appState: AppState = {
  todos: [syncedRecord],
  checkInProjects: [],
  checkInRecords: [],
  timeRecords: [],
  achievementLogs: [],
  inspirations: [],
  shopItems: [],
  userStats: { total_achievements: 10 },
  totalAchievements: 10,
  totalEarned: 0,
  totalSpent: 0
};

console.log('Step 1: saveLocalData 保存...');
const saved = saveLocalData(appState);
console.log(`  保存后 todos[0] synced_at: ${saved.todos[0].synced_at}`);
console.log(`  保存后 todos[0] syncedAt: ${saved.todos[0].syncedAt}\n`);

console.log('Step 2: loadLocalData 加载...');
const loaded = loadLocalData(saved);
console.log(`  加载后 todos[0] synced_at: ${loaded.todos[0].synced_at}`);
console.log(`  加载后 todos[0] syncedAt: ${loaded.todos[0].syncedAt}\n`);

console.log('Step 3: 检查是否有脏数据...');
const hasDirty = checkHasDirtyData(loaded);
console.log(`  hasDirtyData: ${hasDirty}`);
if (hasDirty) {
  console.log('  ❌ 问题：保存-加载循环后，记录被判定为脏数据！');
  console.log('     这会导致同步无限循环！');
} else {
  console.log('  ✅ 保存-加载循环后，没有脏数据');
}
console.log();

// ========== 场景 2：检查云端返回数据经过 mergeData 后的字段 ==========
console.log('----------------------------------------');
console.log('场景 2：检查云端返回数据的同步字段完整性\n');

// 模拟云端返回的数据（只有 syncedAt，没有 synced_at）
const cloudData = [
  { id: 'cloud-1', title: '云端任务', syncedAt: '2024-01-01T00:00:01.000Z' }
];
console.log('云端数据（snakeToCamel 后）：');
console.log(`  syncedAt: ${cloudData[0].syncedAt}`);
console.log(`  synced_at: ${(cloudData[0] as any).synced_at}`);  // 应该是 undefined
console.log(`  isItemDirty: ${isItemDirty(cloudData[0])}\n`);

// 检查 normalizeSyncFields 后的字段
function normalizeSyncFields(item: any) {
  if (item.syncedAt && !item.synced_at) {
    return { ...item, synced_at: item.syncedAt };
  }
  if (item.synced_at && !item.syncedAt) {
    return { ...item, syncedAt: item.synced_at };
  }
  return item;
}

const normalized = normalizeSyncFields(cloudData[0]);
console.log('normalizeSyncFields 后：');
console.log(`  syncedAt: ${normalized.syncedAt}`);
console.log(`  synced_at: ${normalized.synced_at}`);
console.log(`  isItemDirty: ${isItemDirty(normalized)}\n`);

// ========== 场景 3：检查 mergeData 的 winner 分支 ==========
console.log('----------------------------------------');
console.log('场景 3：检查 mergeData 中 winner 分支的字段\n');

function getSyncedAt(item: any): number {
  const val = item.synced_at || item.syncedAt;
  return val ? new Date(val).getTime() : 0;
}

function mergeData(local: any[], remote: any[], syncedAtStr: string, shouldMarkSynced: boolean): any[] {
  const merged: any[] = [];
  const seen = new Set<string>();

  [...remote, ...local].forEach(item => {
    if (seen.has(item.id)) return;
    seen.add(item.id);

    const remoteItem = remote.find(r => r.id === item.id);
    const localItem = local.find(l => l.id === item.id);

    if (remoteItem && localItem) {
      if (isItemDirty(localItem)) {
        merged.push(shouldMarkSynced ? markSynced(localItem, syncedAtStr) : localItem);
      } else {
        const remoteTime = getSyncedAt(remoteItem);
        const localTime = getSyncedAt(localItem);
        const winner = localTime > remoteTime ? localItem : remoteItem;
        // ❗ 关键问题：winner 可能是 remoteItem，只有 syncedAt，没有 synced_at
        merged.push(normalizeSyncFields(winner));
      }
    } else if (remoteItem) {
      merged.push(normalizeSyncFields(remoteItem));
    } else if (localItem) {
      merged.push(shouldMarkSynced ? markSynced(localItem, syncedAtStr) : localItem);
    }
  });

  return merged;
}

// 测试：本地和云端都有同一条记录，云端更新
const localRecord = markSynced({ id: 'test-2', title: '本地记录' }, '2024-01-01T00:00:00.000Z');
const remoteRecord = { id: 'test-2', title: '云端更新的记录', syncedAt: '2024-01-01T00:00:02.000Z' };

console.log('本地记录（已同步）：');
console.log(`  syncedAt: ${localRecord.syncedAt}`);
console.log(`  synced_at: ${localRecord.synced_at}`);
console.log(`  isItemDirty: ${isItemDirty(localRecord)}\n`);

console.log('云端记录（更新）：');
console.log(`  syncedAt: ${remoteRecord.syncedAt}`);
console.log(`  synced_at: ${(remoteRecord as any).synced_at}`);  // undefined
console.log(`  isItemDirty: ${isItemDirty(remoteRecord)}\n`);

const mergedResult = mergeData([localRecord], [remoteRecord], '2024-01-01T00:00:03.000Z', true);
console.log('mergeData 结果：');
console.log(`  syncedAt: ${mergedResult[0].syncedAt}`);
console.log(`  synced_at: ${mergedResult[0].synced_at}`);
console.log(`  is_dirty: ${mergedResult[0].is_dirty}`);
console.log(`  isDirty: ${mergedResult[0].isDirty}`);
console.log(`  isItemDirty: ${isItemDirty(mergedResult[0])}\n`);

if (isItemDirty(mergedResult[0])) {
  console.log('❌ 问题：云端数据 winner 分支后，记录被判定为脏数据！');
  console.log('   这会导致无限循环！');
} else {
  console.log('✅ 云端数据 winner 分支后，没有脏数据');
}
console.log();

// ========== 场景 4：JSON.stringify 是否会丢失字段？ ==========
console.log('----------------------------------------');
console.log('场景 4：JSON 序列化/反序列化是否会丢失字段？\n');

const original = markSynced({ id: 'test-3', title: '测试序列化' }, '2024-01-01T00:00:00.000Z');
console.log('原始：');
console.log(`  is_dirty: ${original.is_dirty}, isDirty: ${original.isDirty}`);
console.log(`  synced_at: ${original.synced_at}, syncedAt: ${original.syncedAt}\n`);

const stringified = JSON.stringify(original);
const parsed = JSON.parse(stringified);
console.log('JSON 序列化/反序列化后：');
console.log(`  is_dirty: ${parsed.is_dirty}, isDirty: ${parsed.isDirty}`);
console.log(`  synced_at: ${parsed.synced_at}, syncedAt: ${parsed.syncedAt}`);
console.log(`  isItemDirty: ${isItemDirty(parsed)}\n`);

if (isItemDirty(parsed)) {
  console.log('❌ 问题：JSON 序列化后脏标记被重置！');
} else {
  console.log('✅ JSON 序列化后字段保持完整');
}

console.log('\n========================================');
console.log('调试结束');
console.log('========================================');
