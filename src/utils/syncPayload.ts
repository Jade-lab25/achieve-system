function camelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = obj[key];
  }
  return result;
}

export function sanitizeForSync<T extends Record<string, unknown>>(
  record: T,
  userId: string,
  syncedAt: string,
  tableName?: string,
) {
  const { is_dirty, isDirty, synced_at, syncedAt: _syncedAt, ...rest } = record;
  const payload = camelToSnake(rest);

  // Optional local fields may not exist in older Supabase projects.
  if (tableName === 'shop_items') {
    delete payload.purchased_at;
    delete payload.icon;
  }

  if (tableName === 'achievement_logs') {
    delete payload.shop_item_id;
    // Supabase check constraint only allows 'task' and 'commodity'
    if (payload.type === 'shop_purchase' || payload.type === 'todo') {
      payload.type = payload.type === 'shop_purchase' ? 'commodity' : 'task';
    }
  }

  return {
    ...payload,
    user_id: userId,
    synced_at: syncedAt,
  };
}
