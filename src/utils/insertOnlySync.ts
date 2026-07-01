export function splitInsertOnlyRecords<T extends { id: string }, U extends { id: string }>(
  records: T[],
  existingRecords: U[] | null | undefined,
): { existingRecords: U[]; recordsToInsert: T[] } {
  const existing = existingRecords || [];
  const existingIds = new Set(existing.map(record => record.id));

  return {
    existingRecords: existing,
    recordsToInsert: records.filter(record => !existingIds.has(record.id)),
  };
}
