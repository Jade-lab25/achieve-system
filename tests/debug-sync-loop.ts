/**
 * 调试同步无限循环 - 追踪完整数据流
 */

import { markDirty, markSynced, isItemDirty } from '../src/utils/syncState.js';

// 模拟 mergeData 函数（从 useSync.ts 复制）
function mergeData(
  local: any[],
  remote: any[],
  syncedAtStr: string,
  shouldMarkSynced: boolean = true
): any[] {
  const merged: any[] = [];
  const seen = new Set<string>();

  const getSyncedAt = (item: any): number => {
    const val = item.synced_at || item.syncedAt;
    return val ? new Date(val).getTime() : 0;
  };

  const normalizeSyncFields = (item: any) => {
    if (item.syncedAt && !item.synced_at) {
      return { ...item, synced_at: item.syncedAt };
    }
    if (item.synced_at && !item.syncedAt) {
      return { ...item, syncedAt: item.synced_at };
    }
    return item;
  };

  console.log(`  [mergeData] shouldMarkSynced=${shouldMarkSynced}`);
  console.log(`  [mergeData] local items=${local.length}, remote items=${remote.length}`);

  [...remote, ...local].forEach(item => {
    if (seen.has(item.id)) return;
    seen.add(item.id);

    const remoteItem = remote.find(r => r.id === item.id);
    const localItem = local.find(l => l.id === item.id);

    if (remoteItem && localItem) {
      if (isItemDirty(localItem)) {
        console.log(`  [mergeData] Item ${item.id}: isDirty=true, shouldMarkSynced=${shouldMarkSynced}`);
        const result = shouldMarkSynced ? markSynced(localItem, syncedAtStr) : localItem;
        console.log(`  [mergeData]   → isDirty after merge: ${isItemDirty(result)}`);
        merged.push(result);
      } else {
        const remoteTime = getSyncedAt(remoteItem);
        const localTime = getSyncedAt(localItem);
        const winner = localTime > remoteTime ? localItem : remoteItem;
        const result = normalizeSyncFields(winner);
        console.log(`  [mergeData] Item ${item.id}: isDirty=false, winner=${localTime > remoteTime ? 'local' : 'remote'}`);
        console.log(`  [mergeData]   → isDirty after merge: ${isItemDirty(result)}`);
        merged.push(result);
      }
    } else if (remoteItem) {
      const result = normalizeSyncFields(remoteItem);
      console.log(`  [mergeData] Item ${item.id}: remote only`);
      console.log(`  [mergeData]   → isDirty after merge: ${isItemDirty(result)}`);
      merged.push(result);
    } else if (localItem) {
      const result = shouldMarkSynced ? markSynced(localItem, syncedAtStr) : localItem;
      console.log(`  [mergeData] Item ${item.id}: local only, shouldMarkSynced=${shouldMarkSynced}`);
      console.log(`  [mergeData]   → isDirty after merge: ${isItemDirty(result)}`);
      merged.push(result);
    }
  });

  const dirtyCount = merged.filter(m => isItemDirty(m)).length;
  console.log(`  [mergeData] Result: ${merged.length} items, ${dirtyCount} dirty`);

  return merged;
}

// 模拟 updateLocalSyncStatus（从 database.ts 复制）
function updateLocalSyncStatus(localItems: any[], syncedItems: any[]): any[] {
  const syncedMap = new Map(syncedItems.map(item => [item.id, item]));
  return localItems.map(item => {
    const syncedItem = syncedMap.get(item.id);
    if (syncedItem) {
      const syncedAt = syncedItem.synced_at || syncedItem.syncedAt;
      const result = markSynced(item, syncedAt);
      console.log(`  [updateLocalSyncStatus] Item ${item.id}: marked synced at ${syncedAt}`);
      console.log(`  [updateLocalSyncStatus]   → isDirty after update: ${isItemDirty(result)}`);
      return result;
    }
    console.log(`  [updateLocalSyncStatus] Item ${item.id}: NOT in syncedItems, isDirty remains ${isItemDirty(item)}`);
    return item;
  });
}

console.log('========================================');
console.log('🔍 调试：同步无限循环的完整流程');
console.log('========================================\n');

// ========== 场景 1：单个设备新增记录 ==========
console.log('场景 1：单个设备新增记录，同步成功后检查是否仍有脏数据\n');

// Step 1: 用户新增记录
console.log('Step 1: 用户新增记录');
const localTodo = markDirty({ id: 'todo-1', title: '测试任务', createdAt: '2024-01-01T00:00:00.000Z' });
console.log(`  新增记录 isDirty: ${isItemDirty(localTodo)}`);
console.log(`  is_dirty: ${localTodo.is_dirty}, isDirty: ${localTodo.isDirty}`);
console.log(`  synced_at: ${localTodo.synced_at}, syncedAt: ${localTodo.syncedAt}\n`);

// Step 2: syncAll 上传成功，updateLocalSyncStatus 清除脏标记
console.log('Step 2: syncAll 上传成功，updateLocalSyncStatus 清除脏标记');
const syncedRecordsFromServer = [
  { id: 'todo-1', syncedAt: '2024-01-01T00:00:01.000Z' }  // snakeToCamel 后只有 syncedAt
];
const afterUpdateSync = updateLocalSyncStatus([localTodo], syncedRecordsFromServer);
console.log(`  updateLocalSyncStatus 后，脏数据数量: ${afterUpdateSync.filter(t => isItemDirty(t)).length}`);
console.log();

// Step 3: fetchAll 获取云端数据（模拟）
console.log('Step 3: fetchAll 获取云端数据');
const remoteData = [
  { id: 'todo-1', title: '测试任务', syncedAt: '2024-01-01T00:00:01.000Z', createdAt: '2024-01-01T00:00:00.000Z' }
];
console.log(`  云端数据数量: ${remoteData.length}`);
console.log();

// Step 4: performSync 中调用 mergeData (shouldMarkSynced = true)
console.log('Step 4: performSync 中调用 mergeData (shouldMarkSynced = true)');
const mergedResult = mergeData(afterUpdateSync, remoteData, '2024-01-01T00:00:02.000Z', true);
console.log();

// Step 5: 检查最终结果
console.log('Step 5: 检查最终结果');
const finalDirtyCount = mergedResult.filter(m => isItemDirty(m)).length;
console.log(`  最终脏数据数量: ${finalDirtyCount}`);
if (finalDirtyCount > 0) {
  console.log('  ❌ 问题：仍然有脏数据！这会导致无限循环！');
  mergedResult.filter(m => isItemDirty(m)).forEach(m => {
    console.log(`    - ${m.id}: is_dirty=${m.is_dirty}, isDirty=${m.isDirty}, synced_at=${m.synced_at}, syncedAt=${m.syncedAt}`);
  });
} else {
  console.log('  ✅ 没有脏数据，不会触发下一次同步');
}
console.log();

// ========== 场景 2：检查 updateLocalSyncStatus 的匹配问题 ==========
console.log('----------------------------------------');
console.log('场景 2：检查 updateLocalSyncStatus 的匹配问题\n');

// 关键问题：如果 syncedItems 中没有匹配的 ID，脏标记不会被清除！
console.log('测试：syncedItems 中缺少某些记录的 ID');
const localRecords = [
  markDirty({ id: 'record-1', content: '记录 1' }),
  markDirty({ id: 'record-2', content: '记录 2' }),  // 这个 ID 在 syncedItems 中不存在
  markDirty({ id: 'record-3', content: '记录 3' }),
];
const syncedRecords = [
  { id: 'record-1', syncedAt: '2024-01-01T00:00:01.000Z' },
  // 注意：缺少 record-2！
  { id: 'record-3', syncedAt: '2024-01-01T00:00:01.000Z' },
];

console.log(`  本地记录数量: ${localRecords.length}`);
console.log(`  同步成功返回数量: ${syncedRecords.length}`);
const result = updateLocalSyncStatus(localRecords, syncedRecords);
const dirtyCount = result.filter(r => isItemDirty(r)).length;
console.log(`  结果脏数据数量: ${dirtyCount}`);
if (dirtyCount > 0) {
  console.log('  ❌ 问题：部分记录未被匹配，脏标记未被清除！');
  result.filter(r => isItemDirty(r)).forEach(r => {
    console.log(`    - ${r.id}: 未在 syncedItems 中找到匹配`);
  });
}
console.log();

// ========== 场景 3：检查 mergeData 中 remoteOnly 记录的处理 ==========
console.log('----------------------------------------');
console.log('场景 3：检查 mergeData 中 remoteOnly 记录的处理\n');

console.log('测试：云端有本地没有的记录（其他设备新增的）');
const localOnly = [
  markSynced({ id: 'local-1', content: '本地已同步记录' }, '2024-01-01T00:00:00.000Z'),
];
const remoteWithNew = [
  { id: 'local-1', content: '本地已同步记录', syncedAt: '2024-01-01T00:00:00.000Z' },
  { id: 'remote-new-1', content: '其他设备新增的记录', syncedAt: '2024-01-01T00:00:02.000Z' },  // 云端新记录
];

const merged = mergeData(localOnly, remoteWithNew, '2024-01-01T00:00:03.000Z', true);
console.log(`  合并后脏数据数量: ${merged.filter(m => isItemDirty(m)).length}`);
const remoteNewItem = merged.find(m => m.id === 'remote-new-1');
if (remoteNewItem) {
  console.log(`  云端新记录 isDirty: ${isItemDirty(remoteNewItem)}`);
  console.log(`    is_dirty: ${remoteNewItem.is_dirty}, isDirty: ${remoteNewItem.isDirty}`);
  console.log(`    synced_at: ${remoteNewItem.synced_at}, syncedAt: ${remoteNewItem.syncedAt}`);
}
console.log();

// ========== 场景 4：完整同步流程模拟 ==========
console.log('----------------------------------------');
console.log('场景 4：完整同步流程模拟 - 检查每个步骤的脏数据\n');

console.log('初始状态：本地有 1 条脏数据');
let currentState = [markDirty({ id: 'flow-1', content: '测试流程' })];
console.log(`  脏数据数量: ${currentState.filter(c => isItemDirty(c)).length}\n`);

for (let i = 1; i <= 3; i++) {
  console.log(`--- 第 ${i} 次同步 ---`);

  // 1. syncAll 上传，updateLocalSyncStatus 清除脏标记
  const serverSynced = currentState.filter(c => isItemDirty(c)).map(c => ({ id: c.id, syncedAt: '2024-01-01T00:00:00.000Z' }));
  const afterSync = updateLocalSyncStatus(currentState, serverSynced);
  console.log(`  after updateLocalSyncStatus: ${afterSync.filter(c => isItemDirty(c)).length} dirty`);

  // 2. fetchAll 获取云端数据（包含本地所有记录）
  const remote = afterSync.map(c => ({ id: c.id, content: c.content, syncedAt: '2024-01-01T00:00:00.000Z' }));

  // 3. mergeData
  currentState = mergeData(afterSync, remote, '2024-01-01T00:00:00.000Z', true);

  const dirty = currentState.filter(c => isItemDirty(c)).length;
  console.log(`  本次同步结束后脏数据数量: ${dirty}`);

  if (dirty === 0) {
    console.log('  ✅ 没有脏数据，同步循环停止');
    break;
  } else if (i === 3) {
    console.log('  ❌ 无限循环！3 次同步后仍有脏数据！');
  }
  console.log();
}

console.log('\n========================================');
console.log('调试结束');
console.log('========================================');
