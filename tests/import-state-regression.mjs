import assert from 'node:assert/strict';
import { prepareImportedState } from '../src/utils/importState.ts';

const initialState = {
  todos: [],
  checkInProjects: [],
  checkInRecords: [],
  timeRecords: [],
  achievementLogs: [],
  inspirations: [],
  shopItems: [],
  totalAchievements: 0,
  totalEarned: 0,
  totalSpent: 0,
  userStats: {},
};

const imported = prepareImportedState({
  todos: [{
    id: 'todo-1',
    title: 'Imported todo',
    createdAt: '2026-07-01T08:00:00.000Z',
    completedAt: null,
    isCompleted: false,
    isDelayed: false,
    delayCount: 0,
    totalTime: 0,
    isTiming: false,
    timingStartTime: null,
    timingRecordId: null,
    tag: 'one-time',
    syncedAt: '2026-06-30T00:00:00.000Z',
    synced_at: '2026-06-30T00:00:00.000Z',
    isDirty: false,
    is_dirty: false,
  }],
  timeRecords: [{
    id: 'time-1',
    startTime: '2026-07-01T08:00:00.000Z',
    endTime: '2026-07-01T08:30:00.000Z',
    content: 'Imported work',
    note: '',
    createdAt: '2026-07-01T08:00:00.000Z',
    todoId: 'todo-1',
    startTimestamp: new Date('2026-07-01T08:00:00.000Z').getTime(),
    syncedAt: '2026-06-30T00:00:00.000Z',
    isDirty: false,
  }],
  achievementLogs: [{
    id: 'log-1',
    type: 'todo',
    title: 'Imported todo',
    points: 5,
    createdAt: '2026-07-01T08:30:00.000Z',
    syncedAt: '2026-06-30T00:00:00.000Z',
    isDirty: false,
  }, {
    id: 'log-2',
    type: 'shop_purchase',
    title: 'Coffee',
    points: -3,
    createdAt: '2026-07-01T09:00:00.000Z',
    syncedAt: '2026-06-30T00:00:00.000Z',
    isDirty: false,
  }],
  userStats: {
    total_achievements: 999,
    total_earned: 999,
    total_spent: 0,
  },
}, initialState);

for (const collection of [
  imported.todos,
  imported.timeRecords,
  imported.achievementLogs,
]) {
  for (const item of collection) {
    assert.equal(item.is_dirty, true, 'imported records must be marked dirty for upload');
    assert.equal(item.isDirty, true, 'imported records must set camelCase dirty flag');
    assert.equal(item.synced_at, null, 'imported records must clear snake_case sync timestamp');
    assert.equal(item.syncedAt, null, 'imported records must clear camelCase sync timestamp');
  }
}

assert.equal(imported.todos[0].totalTime, 1800, 'todo total time should be recalculated from imported time records');
assert.equal(imported.totalEarned, 5, 'todo achievement logs should count as earned');
assert.equal(imported.totalSpent, 3, 'shop purchases should count as spent');
assert.equal(imported.totalAchievements, 2, 'achievement balance should be recalculated from logs');
assert.deepEqual(imported.userStats, {}, 'import should not keep stale remote user stats');

console.log('import state regression tests passed');
