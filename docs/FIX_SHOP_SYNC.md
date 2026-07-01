# 成就商店同步问题修复

## 问题描述

1. **同步报错**：`Achievement log sync error: new row for relation "achievement_logs" violates check constraint "achievement_logs_type_check"`
2. **成就值未扣减**：多端同步后，商品显示已购买，但成就值没有相应扣减

## 根本原因

购买商品时创建的成就流水记录 `type` 是 `'shop_purchase'`，但 Supabase 数据库的 `achievement_logs` 表约束中没有包含这个类型。

**导致的结果：**
- ✅ `shop_items` 表更新成功（商品显示为已购买）
- ❌ `achievement_logs` 表插入失败（约束检查不通过）
- ❌ 其他设备从云端拉取数据后，缺少这笔消费记录，导致成就值计算错误

## 修复步骤

### 步骤 1：在 Supabase 控制台运行 SQL 迁移

1. 登录 [Supabase 控制台](https://supabase.com/dashboard)
2. 进入你的项目
3. 点击左侧菜单的 **SQL Editor**
4. 点击 **New query**
5. 复制并粘贴 `migrations/001_add_shop_purchase_type.sql` 中的 SQL 内容：

```sql
-- First drop the old constraint
ALTER TABLE achievement_logs
DROP CONSTRAINT IF EXISTS achievement_logs_type_check;

-- Add the new constraint with shop_purchase type
ALTER TABLE achievement_logs
ADD CONSTRAINT achievement_logs_type_check
CHECK (type IN ('todo', 'task', 'commodity', 'shop_purchase'));
```

6. 点击 **Run** 执行 SQL

### 步骤 2：验证约束更新成功

执行以下 SQL 验证约束是否正确更新：

```sql
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'achievement_logs'::regclass
AND conname = 'achievement_logs_type_check';
```

应该显示：
```
constraint_name            | constraint_definition
---------------------------+-------------------------------------------------------
achievement_logs_type_check | CHECK (type = ANY (ARRAY['todo'::text, 'task'::text, 'commodity'::text, 'shop_purchase'::text]))
```

### 步骤 3：重新同步数据

1. 在每个设备上点击「上传到云端」确保所有本地数据上传
2. 然后点击「从云端下载」拉取最新数据
3. 检查成就值是否正确扣减

## 代码验证

本地代码中已经正确处理了 `shop_purchase` 类型：

### 1. 类型定义 (`src/types/index.ts`)
```typescript
export interface AchievementLog extends Syncable {
  // ...
  type: 'todo' | 'task' | 'commodity' | 'shop_purchase';  // ✅ shop_purchase 已包含
  // ...
}
```

### 2. 成就值计算 (`src/store/index.ts`)
```typescript
const totalEarned = logs
  .filter((log: any) => log.type === 'task' || log.type === 'todo')  // ✅ 赚取
  .reduce((sum: number, log: any) => sum + (log.points || 0), 0);

const totalSpent = logs
  .filter((log: any) => log.type === 'commodity' || log.type === 'shop_purchase')  // ✅ 消费
  .reduce((sum: number, log: any) => sum + Math.abs(log.points || 0), 0);
```

### 3. 购买商品逻辑 (`src/store/index.ts`)
```typescript
const log: AchievementLog = markDirty({
  id: Date.now().toString(),
  type: 'shop_purchase',  // ✅ 使用正确的类型
  title: `购买：${item.name}`,
  points: -item.price,
  createdAt: now,
  shopItemId: item.id,
});
```

## 验证修复成功

修复后，你应该看到：
1. ✅ 点击「上传到云端」不再报错
2. ✅ 设备 A 购买商品后，设备 B 同步时成就值正确扣减
3. ✅ 成就流水显示购买记录
4. ✅ 所有设备的成就值保持一致

## 故障排查

如果仍然有问题：

1. **检查数据库约束**：运行验证 SQL，确保 `shop_purchase` 在约束中
2. **清除本地数据**：如果本地有脏数据，可以导出备份后，清除 localStorage 重新同步
3. **查看控制台日志**：F12 打开开发者工具，查看 Console 中的同步日志

## 迁移历史

- `supabase-migrations.sql` - 初始 schema，已包含 `shop_purchase`
- `migrations/001_add_shop_purchase_type.sql` - 增量迁移，用于旧项目更新
