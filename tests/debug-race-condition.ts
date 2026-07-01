/**
 * 调试：同步无限循环的竞态条件
 *
 * 可能的问题来源：
 * 1. isSyncingRef.current 设置为 false 的时机
 * 2. mergeData 后 saveLocalData + onDataFetched 触发多次 state 更新
 * 3. 防抖定时器没有被正确清除
 */

import { markDirty, markSynced, isItemDirty } from '../src/utils/syncState.js';

console.log('========================================');
console.log('🔍 调试：同步无限循环的竞态条件');
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

// 模拟 localStorage
let localStorageData = JSON.stringify(appState);

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
  // 模拟：所有脏数据都成功同步，返回 syncedItems
  const syncedItems = dirtyItems.map(item => ({ ...item, syncedAt: '2024-01-01T00:00:01.000Z' }));
  const syncedData = updateLocalSyncStatus(localData, syncedItems);
  return { success: true, errors: [], stats: { synced: syncedItems.length }, syncedData };
}

// 模拟 fetchAll
function fetchAll() {
  // 模拟：云端返回本地的所有数据
  return {
    data: {
      todos: appState.todos.map(t => ({ ...t, syncedAt: '2024-01-01T00:00:00.000Z' })),
    },
  };
}

// 模拟 saveLocalData
function saveLocalData(data: any) {
  localStorageData = JSON.stringify(data);
  console.log('  💾 saveLocalData: 数据已保存到 localStorage');
}

// 模拟 hydrateState
function hydrateState(newState: any) {
  appState = { ...appState, ...newState };
  console.log('  💧 hydrateState: React state 已更新');
  // 触发 state 更新后的逻辑（模拟 useEffect）
  onStateChange();
}

// 模拟 performSync
function performSync() {
  if (refs.isSyncingRef.current) {
    console.log('  ⏭️ performSync: 已在同步中，跳过');
    return;
  }

  console.log('  🚀 performSync: 开始同步');
  refs.isSyncingRef.current = true;

  // 模拟加载本地数据
  const localData = JSON.parse(localStorageData);

  // 模拟 syncAll
  const { success, syncedData } = syncAll(localData.todos);

  if (success) {
    // 模拟 fetchAll
    const { data: remoteData } = fetchAll();

    const syncedAtStr = new Date().toISOString();
    const mergedTodos = mergeData(syncedData, remoteData.todos, syncedAtStr, true);

    console.log(`  📊 mergeData 完成：${mergedTodos.length} 条记录，${mergedTodos.filter(t => isItemDirty(t)).length} 条脏数据`);

    saveLocalData({ todos: mergedTodos });

    // ⚠️ 关键问题：onDataFetched（hydrateState）在 isSyncingRef.current = false 之前被调用！
    // 这会触发 state 更新，syncOnChange 被调用，但 isSyncingRef.current 仍然是 true
    console.log('  📡 调用 onDataFetched (hydrateState)...');
    hydrateState({ todos: mergedTodos });

    // ⚠️ 这里才设置 isSyncingRef.current = false
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

// 模拟 state 变化
function onStateChange() {
  console.log('  🎯 state 变化，触发 syncOnChange');
  syncOnChange(appState);
}

// ========== 场景 1：用户新增一条记录 ==========
console.log('场景 1：用户新增一条记录，模拟完整同步流程\n');

// Step 1: 用户新增记录
console.log('Step 1: 用户新增 todo 记录');
const newTodo = markDirty({ id: 'todo-1', title: '测试任务' });
appState.todos = [newTodo];
console.log(`  新增记录 isItemDirty: ${isItemDirty(newTodo)}`);

// Step 2: state 变化触发 syncOnChange
console.log('\nStep 2: state 变化触发 syncOnChange');
onStateChange();

// Step 3: 模拟 1500ms 后定时器触发
console.log('\nStep 3: 1500ms 后定时器触发...');
// 需要手动触发定时器（在 Node.js 中）
setTimeout(() => {
  // 此时定时器应该已经被触发了
}, 1600);

// 为了测试，我们直接调用 performSync
console.log('  (手动调用 performSync 模拟定时器触发)');
performSync();

// Step 4: 检查同步后是否还有脏数据
console.log('\nStep 4: 检查同步后状态');
const dirtyCount = appState.todos.filter(t => isItemDirty(t)).length;
console.log(`  脏数据数量: ${dirtyCount}`);
console.log(`  isSyncingRef.current: ${refs.isSyncingRef.current}`);
console.log(`  syncTimeoutRef.current: ${refs.syncTimeoutRef.current ? '已设置' : '未设置'}`);

if (dirtyCount > 0) {
  console.log('\n  ❌ 问题：同步完成后仍有脏数据！');
  console.log('     这会导致下次 state 变化时触发新的同步！');
} else if (refs.syncTimeoutRef.current) {
  console.log('\n  ❌ 问题：同步完成后仍有未执行的定时器！');
  console.log('     这会导致无限循环！');
} else {
  console.log('\n  ✅ 同步完成后没有脏数据，也没有未执行的定时器');
}

// ========== 场景 2：模拟同步过程中再次触发 syncOnChange ==========
console.log('\n\n----------------------------------------');
console.log('场景 2：同步过程中再次触发 syncOnChange\n');

// 重置状态
refs.isSyncingRef.current = false;
refs.syncTimeoutRef.current = null;
appState.todos = [markDirty({ id: 'todo-2', title: '测试任务 2' })];

console.log('初始状态：1 条脏数据，isSyncingRef.current = false');

// Step 1: 第一次 syncOnChange，设置定时器
console.log('\nStep 1: 第一次 syncOnChange');
syncOnChange(appState);

// Step 2: 在定时器触发前，模拟另一个 state 变化
console.log('\nStep 2: 定时器触发前，再次触发 syncOnChange');
syncOnChange(appState);

// Step 3: 模拟定时器触发
console.log('\nStep 3: 定时器触发，调用 performSync');
performSync();

// Step 4: 检查同步过程中是否会设置新的定时器
console.log('\nStep 4: 检查同步过程中是否设置了新的定时器');
if (refs.syncTimeoutRef.current) {
  console.log('  ❌ 问题：同步过程中仍设置了新的定时器！');
  console.log('     这会导致无限循环！');
} else {
  console.log('  ✅ 同步过程中没有设置新的定时器');
}

// ========== 场景 3：检查 isSyncingRef 的设置时机 ==========
console.log('\n\n----------------------------------------');
console.log('场景 3：检查 isSyncingRef.current 设置时机\n');

console.log('关键问题：');
console.log('  performSync 中，isSyncingRef.current = false 是在 hydrateState 之后设置的！');
console.log('  这意味着在 hydrateState 触发的 syncOnChange 调用中：');
console.log('    isSyncingRef.current 仍然是 true → 不会设置新定时器 ✓');
console.log('\n  但是！如果在 isSyncingRef.current = false 之后，syncOnChange 被再次调用...');
console.log('  （例如由于某个 state 更新），而数据中仍有脏数据，就会设置新的定时器！');

console.log('\n验证流程：');
console.log('1. performSync 开始 → isSyncingRef.current = true');
console.log('2. syncAll → updateLocalSyncStatus → 清除脏标记');
console.log('3. fetchAll 获取云端数据');
console.log('4. mergeData 合并数据');
console.log('5. saveLocalData 保存到 localStorage');
console.log('6. onDataFetched → hydrateState → state 更新 → syncOnChange 被调用');
console.log('   此时 isSyncingRef.current 仍然是 true → 不设置新定时器 ✓');
console.log('7. isSyncingRef.current = false');
console.log('8. 如果此时还有其他 state 更新触发 syncOnChange...');
console.log('   需要确保数据中没有脏数据！');

console.log('\n========================================');
console.log('调试结束');
console.log('========================================');
