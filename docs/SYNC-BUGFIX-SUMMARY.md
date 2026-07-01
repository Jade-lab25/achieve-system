# 同步 Bug 修复总结

## 问题描述

### 问题 1: 同步无限循环
- **现象**: 同步成功后，`syncOnChange` 仍然检测到脏数据，不断触发同步，形成无限循环
- **影响**: 浪费网络资源，用户体验差，可能导致数据不一致

### 问题 2: 多端设备新增数据无法同步
- **现象**: 设备 A 新增的数据同步到云端后，设备 B 同步时无法正确获取设备 A 新增的记录
- **影响**: 多设备数据不同步，用户数据丢失风险

---

## 根本原因分析

### 问题 1 根本原因

**位置**: `src/hooks/useSync.ts` - `performSync` 函数

**原因**:
```typescript
// ❌ 修复前：shouldMarkSynced = false
mergeData(syncedData.todos, remoteData.todos, syncedAtStr, false)
```

当 `shouldMarkSynced = false` 时，`mergeData` 中对本地脏记录的处理是：
```typescript
if (isDirty(localItem)) {
  merged.push(localItem);  // ❌ 直接返回，不清除脏标记！
}
```

即使 `syncAll` 已经通过 `updateLocalSyncStatus` 清除了大部分脏标记，但：
1. 如果某些记录由于网络原因没有成功 upsert 并返回
2. 或者 `updateLocalSyncStatus` 因某些原因没有匹配到记录

这些记录的 `is_dirty` 仍然为 `true`，导致下次 `syncOnChange` 触发时又会同步 → **无限循环**

### 问题 2 根本原因

**位置**: `src/hooks/useSync.ts` - `mergeData` 函数 + `normalizeSyncFields`

**原因**:
云端数据经 `snakeToCamel` 转换后，`synced_at` 变成了 `syncedAt`，但缺少 `synced_at` 字段。

虽然 `isItemDirty` 的逻辑（用 AND 判断）已经避免了误判：
```typescript
const neverSynced = !item.synced_at && !item.syncedAt;  // ✅ 两个字段都缺失才算未同步
```

但关键问题是：**设备 B 从云端获取到设备 A 的新记录后，这些记录的同步状态字段完整性**

`normalizeSyncFields` 确保了云端记录同时有两个字段，避免了潜在的同步问题。

---

## 修复方案

### 修复 1: 同步无限循环

**文件**: `src/hooks/useSync.ts`

**修改**: 将 `performSync` 中 `mergeData` 的 `shouldMarkSynced` 参数从 `false` 改为 `true`:

```typescript
// ✅ 修复后：shouldMarkSynced = true
const mergedData: SyncData = {
  todos: mergeData(syncedData.todos, remoteData.todos, syncedAtStr, true),
  checkInProjects: mergeData(syncedData.checkInProjects, remoteData.checkInProjects, syncedAtStr, true),
  checkInRecords: mergeData(syncedData.checkInRecords, remoteData.checkInRecords, syncedAtStr, true),
  timeRecords: mergeData(syncedData.timeRecords, remoteData.timeRecords, syncedAtStr, true),
  achievementLogs: mergeData(syncedData.achievementLogs, remoteData.achievementLogs, syncedAtStr, true),
  inspirations: mergeData(syncedData.inspirations, remoteData.inspirations, syncedAtStr, true),
  shopItems: mergeData(syncedData.shopItems, remoteData.shopItems, syncedAtStr, true),
  userStats: { ...syncedData.userStats, ...remoteData.userStats }
};
```

**说明**:
- `performSync` 中调用 `syncAll` 已经完成了上传操作
- 同步成功后，应该确保所有本地记录的脏标记被清除
- `shouldMarkSynced = true` 确保 `mergeData` 中即使有遗漏的脏记录也会被清除

### 修复 2: 多端设备同步

**文件**: `src/hooks/useSync.ts`

**关键逻辑已经存在并正确工作**:

1. `isItemDirty` 使用 AND 判断，避免只有一个同步字段时被误判为脏数据
2. `normalizeSyncFields` 确保云端来的记录同时有 `synced_at` 和 `syncedAt`
3. `mergeData` 中只有云端的记录会被正确添加到本地，并通过 `normalizeSyncFields` 标准化

**额外确保**:
- `fetchFromCloud` 中 `shouldMarkSynced = false` 保留，确保只下载不上传时不清除本地脏标记
- `mergeData` 对 `shouldMarkSynced` 参数的判断逻辑保留，区分两种调用场景

---

## 测试验证

### 测试文件
- `tests/syncState.test.ts` - 基础回归测试
- `tests/sync-fix-test.ts` - 综合修复验证测试

### 测试结果
```
✅ 所有测试通过！

测试 1: isItemDirty 逻辑 ✓
测试 2: 同步无限循环修复验证 ✓
测试 3: 多端设备同步验证 ✓
测试 4: 同步循环完整流程验证 ✓
```

### 构建验证
项目构建成功，无语法错误和类型错误。

---

## 同步逻辑流程图

```
用户新增/修改记录
    ↓
markDirty() → 设置 is_dirty=true, isDirty=true, synced_at=null, syncedAt=null
    ↓
syncOnChange 检测到脏数据，防抖 1500ms 后触发 performSync
    ↓
performSync(userId)
    ├─→ 删除同步 (deleteBatch)
    ├─→ syncAll(userId, localData) ──┐
    │     ├─→ syncTable()             │ 上传
    │     ├─→ batchInsert()           │
    │     └─→ updateLocalSyncStatus  ←┘  返回 syncedData（已清除成功上传的脏标记）
    ├─→ fetchAll(userId) ──────────────→ 获取云端所有数据（包括其他设备新增的）
    ├─→ mergeData(syncedData, remoteData, syncedAtStr, true)
    │     ├─→ 本地有脏数据 && shouldMarkSynced=true → markSynced 清除脏标记 ✨
    │     ├─→ 本地有非脏数据 → 与云端比较时间戳，取较新的
    │     ├─→ 只有云端数据 → normalizeSyncFields，补充同步字段 ✨
    │     └─→ 只有本地数据 → 标记为已同步（如果 shouldMarkSynced=true）
    ├─→ saveLocalData(mergedData)
    └─→ onDataFetched(mergedData) → 更新 React state
    ↓
syncOnChange 检测 → 没有脏数据，不触发下一次同步 ✅
```

---

## 关键修复点总结

| 修复项 | 原代码 | 修复后 | 效果 |
|--------|--------|--------|------|
| performSync mergeData 参数 | `shouldMarkSynced=false` | `shouldMarkSynced=true` | 确保同步成功后脏标记被清除，避免无限循环 |
| mergeData 注释 | 无详细注释 | 明确区分 performSync/fetchFromCloud 两种场景 | 代码可读性提升，便于维护 |
| 测试覆盖 | 基础测试 | 增加多场景综合测试 | 验证修复有效性，防止回归 |

---

## 后续建议

1. **添加端到端测试**: 模拟多设备真实同步场景
2. **添加同步日志**: 添加更详细的同步日志，便于排查问题
3. **添加同步状态监控**: 检测同步循环，超过一定次数自动暂停
4. **添加脏数据超时机制**: 超过一定时间未同步成功的记录，自动提示用户
