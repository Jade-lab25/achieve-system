/**
 * 验证同步无限循环修复
 */

import { markDirty, markSynced, isItemDirty } from '../src/utils/syncState.js';

console.log('========================================');
console.log('✅ 验证：同步无限循环修复');
console.log('========================================\n');

// 模拟 useRef
const refs: Record<string, any> = {
  isSyncingRef: { current: false },
  syncTimeoutRef: { current: null },
};

// 模拟 state
let appState = {
  todos: [] as any[],
};

// 模拟 mergeData 函数
function mergeData(local: any[], remote: any[], syncedAtStr: string, shouldMarkSynced: boolean): any[] {
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

// 模拟 updateLocalSyncStatus
function updateLocalSyncStatus(localItems: any[], syncedItems: any[]): any[] {
  const syncedMap = new Map(syncedItems.map(item => [item.id, item]));
  return localItems.map(item => {
    const syncedItem = syncedMap.get(item.id);
    if (syncedItem) {
      const syncedAt = syncedItem.synced_at || syncedItem.syncedAt;
      return markSynced(item, syncedAt);
    }
    return item;
  });
}

// 模拟 syncAll
function syncAll(localData: any[]) {
  const dirtyItems = localData.filter(item => isItemDirty(item));
  const syncedItems = dirtyItems.map(item => ({ ...item, syncedAt: '2024-01-01T00:00:01.000Z' }));
  const syncedData = updateLocalSyncStatus(localData, syncedItems);
  return { success: true, errors: [], stats: { synced: syncedItems.length }, syncedData };
}

// 模拟 fetchAll
function fetchAll() {
  return {
    data: {
      todos: appState.todos.map(t => ({ ...t, syncedAt: '2024-01-01T00:00:00.000Z' })),
    },
  };
}

// 模拟 saveLocalData
function saveLocalData(data: any) {
  console.log('  💾 saveLocalData: 数据已保存到 localStorage');
}

// 模拟 hydrateState
function hydrateState(newState: any) {
  appState = { ...appState, ...newState };
  console.log('  💧 hydrateState: React state 已更新');
  onStateChange();
}

// ✅ 修复后的 performSync
function performSync() {
  if (refs.isSyncingRef.current) {
    console.log('  ⏭️ performSync: 已在同步中，跳过');
    return;
  }

  // ✅ 关键修复：清除待处理的定时器
  if (refs.syncTimeoutRef.current) {
    clearTimeout(refs.syncTimeoutRef.current);
    refs.syncTimeoutRef.current = null;
    console.log('  🧹 清除待处理的同步定时器');
  }

  console.log('  🚀 performSync: 开始同步');
  refs.isSyncingRef.current = true;

  const localData = JSON.parse(JSON.stringify(appState));

  const { success, syncedData } = syncAll(localData.todos);

  if (success) {
    const { data: remoteData } = fetchAll();

    const syncedAtStr = new Date().toISOString();
    const mergedTodos = mergeData(syncedData, remoteData.todos, syncedAtStr, true);

    console.log(`  📊 mergeData 完成：${mergedTodos.length} 条记录，${mergedTodos.filter(t => isItemDirty(t)).length} 条脏数据`);

    saveLocalData({ todos: mergedTodos });
    hydrateState({ todos: mergedTodos });

    refs.isSyncingRef.current = false;
    console.log('  ✅ performSync: 同步完成，isSyncingRef.current = false');

    return mergedTodos;
  }

  refs.isSyncingRef.current = false;
  return localData.todos;
}

// 模拟 syncOnChange
function syncOnChange(data: any) {
  console.log('\n🔄 syncOnChange 被调用');

  saveLocalData(data);

  const hasDirtyData = data.todos.some((t: any) => isItemDirty(t));
  console.log(`  hasDirtyData: ${hasDirtyData}`);
  console.log(`  isSyncingRef.current: ${refs.isSyncingRef.current}`);

  if (!refs.isSyncingRef.current && hasDirtyData) {
    console.log('  ⏰ 设置同步定时器（1500ms后执行）');

    if (refs.syncTimeoutRef.current) {
      clearTimeout(refs.syncTimeoutRef.current);
    }

    refs.syncTimeoutRef.current = setTimeout(() => {
      console.log('  ⏰ 定时器触发，调用 performSync');
      performSync();
    }, 1500);
  } else if (refs.isSyncingRef.current) {
    console.log('  ⏳ 正在同步中，不设置新定时器');
  } else {
    console.log('  ✅ 没有脏数据，不设置新定时器');
  }
}

function onStateChange() {
  console.log('  🎯 state 变化，触发 syncOnChange');
  syncOnChange(appState);
}

// ========== 测试修复 ==========
console.log('场景：用户新增一条记录，验证同步后没有遗留的定时器\n');

// Step 1: 用户新增记录
console.log('Step 1: 用户新增 todo 记录');
const newTodo = markDirty({ id: 'todo-1', title: '测试任务' });
appState.todos = [newTodo];
console.log(`  新增记录 isItemDirty: ${isItemDirty(newTodo)}`);

// Step 2: state 变化触发 syncOnChange
console.log('\nStep 2: state 变化触发 syncOnChange');
onStateChange();

// Step 3: 模拟定时器触发
console.log('\nStep 3: 1500ms 后定时器触发，调用 performSync...');
// 检查定时器是否已设置
console.log(`  定时器设置状态: ${refs.syncTimeoutRef.current ? '已设置' : '未设置'}`);

// 手动触发 performSync（模拟定时器触发）
console.log('\nStep 4: 执行 performSync（模拟定时器触发）');
performSync();

// Step 5: 检查同步后状态
console.log('\nStep 5: 检查同步后状态');
const dirtyCount = appState.todos.filter(t => isItemDirty(t)).length;
console.log(`  脏数据数量: ${dirtyCount}`);
console.log(`  isSyncingRef.current: ${refs.isSyncingRef.current}`);
console.log(`  syncTimeoutRef.current: ${refs.syncTimeoutRef.current ? '已设置' : '未设置'}`);

if (dirtyCount === 0 && refs.syncTimeoutRef.current === null && !refs.isSyncingRef.current) {
  console.log('\n  ✅ 修复验证成功！');
  console.log('     - 没有脏数据');
  console.log('     - 没有遗留的定时器');
  console.log('     - 同步状态已重置');
  console.log('     🎉 不会发生无限循环！');
} else {
  console.log('\n  ❌ 修复验证失败！');
  if (dirtyCount > 0) console.log('     - 仍有脏数据');
  if (refs.syncTimeoutRef.current) console.log('     - 仍有遗留的定时器');
  if (refs.isSyncingRef.current) console.log('     - 同步状态未重置');
}

console.log('\n========================================');
console.log('修复验证完成');
console.log('========================================');
