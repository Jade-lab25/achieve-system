import type { CheckInProject, CheckInRecord } from '../types';

export interface CheckInProjectStats {
  count: number;
  lastCheckIn: string | null;
}

export function getCheckInProjectStats(
  project: Pick<CheckInProject, 'id' | 'name' | 'type'>,
  records: CheckInRecord[],
): CheckInProjectStats {
  const projectRecords = records
    .filter(record =>
      record.projectId === project.id ||
      (record.projectName === project.name && record.type === project.type)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    count: projectRecords.length,
    lastCheckIn: projectRecords[0]?.createdAt || null,
  };
}
