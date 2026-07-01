import assert from 'node:assert/strict';
import { getCheckInProjectStats } from '../src/utils/checkInStats.ts';
import { getSyncModeForTable } from '../src/utils/syncModes.ts';
import { splitInsertOnlyRecords } from '../src/utils/insertOnlySync.ts';
import { shouldDropSyncedLocalOnlyRecord } from '../src/utils/remoteDeletionSync.ts';

const project = {
  id: 'device-a-project',
  name: 'Morning review',
  type: 'task',
  points: 5,
  createdAt: '2026-07-01T08:00:00.000Z',
};

const records = [
  {
    id: 'local-record',
    projectId: 'device-a-project',
    projectName: 'Morning review',
    type: 'task',
    points: 5,
    createdAt: '2026-07-01T08:30:00.000Z',
  },
  {
    id: 'cloud-record-from-device-b',
    projectId: 'device-b-project',
    projectName: 'Morning review',
    type: 'task',
    points: 5,
    createdAt: '2026-07-01T09:30:00.000Z',
  },
];

const stats = getCheckInProjectStats(project, records);
assert.equal(stats.count, 2, '同名同类型项目的云端打卡流水应该计入项目统计');
assert.equal(
  stats.lastCheckIn,
  '2026-07-01T09:30:00.000Z',
  '最后打卡时间应该使用云端同步下来的最新流水',
);

assert.equal(
  getSyncModeForTable('time_records'),
  'upsert',
  '时间记录开始后还会更新 endTime/note，不能用 insert-only 同步',
);
assert.equal(
  getSyncModeForTable('check_in_records'),
  'insert',
  '打卡流水是不可变流水，仍然使用 insert-only 同步',
);

const localBatch = [
  { id: 'already-in-cloud', createdAt: '2026-07-01T08:00:00.000Z' },
  { id: 'new-device-record', createdAt: '2026-07-01T08:30:00.000Z' },
];
const existingCloudRecords = [
  { id: 'already-in-cloud', syncedAt: '2026-07-01T08:10:00.000Z' },
];
const split = splitInsertOnlyRecords(localBatch, existingCloudRecords);

assert.deepEqual(
  split.recordsToInsert.map(record => record.id),
  ['new-device-record'],
  'insert-only sync must still insert new records when the same batch contains duplicate ids',
);
assert.deepEqual(
  split.existingRecords.map(record => record.id),
  ['already-in-cloud'],
  'existing records should be returned so local dirty flags can be cleared',
);

assert.equal(
  shouldDropSyncedLocalOnlyRecord({
    id: 'deleted-in-cloud',
    syncedAt: '2026-07-01T08:00:00.000Z',
    isDirty: false,
  }, true),
  true,
  'a clean local record that was previously synced should disappear when it is missing from remote data',
);
assert.equal(
  shouldDropSyncedLocalOnlyRecord({
    id: 'local-unsynced',
    syncedAt: null,
    isDirty: true,
  }, true),
  false,
  'a local unsynced record must be preserved when downloading remote data',
);

console.log('multi-device sync regression tests passed');
