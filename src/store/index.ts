import { useState, useEffect, useCallback } from 'react';
import type { Todo, CheckInProject, CheckInRecord, TimeRecord, AchievementLog, AppState, CheckInType, Inspiration } from '../types';

const STORAGE_KEY = 'work-status-app-data';

const initialState: AppState = {
  todos: [],
  checkInProjects: [],
  checkInRecords: [],
  timeRecords: [],
  achievementLogs: [],
  inspirations: [],
  totalAchievements: 0,
  totalEarned: 0,
  totalSpent: 0,
};

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const state = { ...initialState, ...parsed };
      
      if (parsed.userStats) {
        state.totalAchievements = parsed.userStats.total_achievements || state.totalAchievements;
        state.totalEarned = parsed.userStats.total_earned || state.totalEarned;
        state.totalSpent = parsed.userStats.total_spent || state.totalSpent;
      }
      
      return state;
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return initialState;
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const addTodo = useCallback((title: string, tag: 'long-term' | 'one-time' = 'one-time') => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      title,
      createdAt: new Date().toISOString(),
      completedAt: null,
      isCompleted: false,
      isDelayed: false,
      delayCount: 0,
      totalTime: 0,
      isTiming: false,
      timingStartTime: null,
      timingRecordId: null,
      tag,
    };
    setState(prev => ({ ...prev, todos: [...prev.todos, newTodo] }));
  }, []);

  const completeTodo = useCallback((id: string) => {
    setState(prev => {
      const todo = prev.todos.find(t => t.id === id);
      if (!todo) return prev;

      if (todo.isCompleted) {
        const uncompletedTodo: Todo = {
          ...todo,
          isCompleted: false,
          completedAt: null,
        };

        const log: AchievementLog = {
          id: Date.now().toString(),
          type: 'todo',
          title: todo.title,
          points: -5,
          createdAt: new Date().toISOString(),
        };

        return {
          ...prev,
          todos: prev.todos.map(t => t.id === id ? uncompletedTodo : t),
          achievementLogs: [log, ...prev.achievementLogs],
          totalAchievements: Math.max(0, prev.totalAchievements - 5),
          totalEarned: Math.max(0, prev.totalEarned - 5),
        };
      } else {
        const completedAt = new Date().toISOString();
        const completedTodo: Todo = {
          ...todo,
          isCompleted: true,
          completedAt,
          isTiming: false,
          timingStartTime: null,
        };

        const log: AchievementLog = {
          id: Date.now().toString(),
          type: 'todo',
          title: todo.title,
          points: 5,
          createdAt: completedAt,
        };

        return {
          ...prev,
          todos: prev.todos.map(t => t.id === id ? completedTodo : t),
          achievementLogs: [log, ...prev.achievementLogs],
          totalAchievements: prev.totalAchievements + 5,
          totalEarned: prev.totalEarned + 5,
        };
      }
    });
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setState(prev => ({ ...prev, todos: prev.todos.filter(t => t.id !== id) }));
  }, []);

  const clearCompletedTodos = useCallback(() => {
    setState(prev => ({ ...prev, todos: prev.todos.filter(t => !t.isCompleted) }));
  }, []);

  const toggleDelayTodo = useCallback((id: string) => {
    setState(prev => {
      const todo = prev.todos.find(t => t.id === id);
      if (!todo) return prev;

      const now = new Date().toISOString();
      const log: AchievementLog = {
        id: Date.now().toString(),
        type: 'task',
        title: `${todo.title} - 标记拖延`,
        points: -2,
        createdAt: now,
      };

      return {
        ...prev,
        todos: prev.todos.map(t => t.id === id ? {
          ...t,
          isDelayed: true,
          delayCount: t.delayCount + 1,
        } : t),
        achievementLogs: [log, ...prev.achievementLogs],
        totalAchievements: Math.max(0, prev.totalAchievements - 2),
        totalSpent: prev.totalSpent + 2,
      };
    });
  }, []);

  const updateTodo = useCallback((id: string, title: string) => {
    setState(prev => ({
      ...prev,
      todos: prev.todos.map(t => t.id === id ? { ...t, title } : t),
    }));
  }, []);

  const pinTodo = useCallback((id: string) => {
    setState(prev => {
      const todo = prev.todos.find(t => t.id === id);
      if (!todo) return prev;
      return {
        ...prev,
        todos: [todo, ...prev.todos.filter(t => t.id !== id)],
      };
    });
  }, []);

  const startTodoTiming = useCallback((id: string) => {
    setState(prev => {
      const todo = prev.todos.find(t => t.id === id);
      if (!todo || todo.isCompleted || todo.isTiming) return prev;

      const now = new Date();
      const startTime = now.toISOString();
      const startTimestamp = now.getTime();

      const timeRecord: TimeRecord = {
        id: Date.now().toString(),
        startTime,
        endTime: '',
        content: todo.title,
        note: '',
        createdAt: now.toISOString(),
        todoId: todo.id,
        startTimestamp,
      };

      return {
        ...prev,
        todos: prev.todos.map(t => t.id === id ? { ...t, isTiming: true, timingStartTime: startTime, timingRecordId: timeRecord.id } : t),
        timeRecords: [timeRecord, ...prev.timeRecords],
      };
    });
  }, []);

  const endTodoTiming = useCallback((id: string) => {
    setState(prev => {
      const todo = prev.todos.find(t => t.id === id);
      if (!todo || !todo.isTiming || !todo.timingStartTime) return prev;

      const now = new Date();
      const endTime = now.toISOString();

      const record = prev.timeRecords.find(r => r.id === todo.timingRecordId);
      const durationSeconds = record ? (now.getTime() - record.startTimestamp) / 1000 : 0;
      const durationMinutes = durationSeconds / 60;

      return {
        ...prev,
        todos: prev.todos.map(t => t.id === id ? {
          ...t,
          isTiming: false,
          timingStartTime: null,
          timingRecordId: null,
          totalTime: t.totalTime + durationMinutes,
        } : t),
        timeRecords: prev.timeRecords.map(r => 
          r.id === todo.timingRecordId ? { ...r, endTime } : r
        ),
      };
    });
  }, []);

  const addCheckInProject = useCallback((name: string, type: CheckInType, points: number) => {
    const project: CheckInProject = {
      id: Date.now().toString(),
      name,
      type,
      points,
      createdAt: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, checkInProjects: [...prev.checkInProjects, project] }));
  }, []);

  const deleteCheckInProject = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      checkInProjects: prev.checkInProjects.filter(p => p.id !== id),
      checkInRecords: prev.checkInRecords.filter(r => r.projectId !== id),
    }));
  }, []);

  const checkIn = useCallback((projectId: string) => {
    setState(prev => {
      const project = prev.checkInProjects.find(p => p.id === projectId);
      if (!project) return prev;

      const record: CheckInRecord = {
        id: Date.now().toString(),
        projectId: project.id,
        projectName: project.name,
        type: project.type,
        points: project.points,
        createdAt: new Date().toISOString(),
      };

      const log: AchievementLog = {
        id: Date.now().toString(),
        type: project.type,
        title: project.name,
        points: project.type === 'task' ? project.points : -project.points,
        createdAt: record.createdAt,
      };

      const pointsChange = project.type === 'task' ? project.points : -project.points;

      return {
        ...prev,
        checkInRecords: [record, ...prev.checkInRecords],
        achievementLogs: [log, ...prev.achievementLogs],
        totalAchievements: prev.totalAchievements + pointsChange,
        totalEarned: project.type === 'task' ? prev.totalEarned + project.points : prev.totalEarned,
        totalSpent: project.type === 'commodity' ? prev.totalSpent + project.points : prev.totalSpent,
      };
    });
  }, []);

  const addTimeRecord = useCallback((startTime: string, endTime: string, content: string) => {
    const record: TimeRecord = {
      id: Date.now().toString(),
      startTime,
      endTime,
      content,
      note: '',
      createdAt: new Date().toISOString(),
      todoId: null,
      startTimestamp: new Date().getTime(),
    };
    setState(prev => ({ ...prev, timeRecords: [record, ...prev.timeRecords] }));
  }, []);

  const deleteTimeRecord = useCallback((id: string) => {
    setState(prev => ({ ...prev, timeRecords: prev.timeRecords.filter(r => r.id !== id) }));
  }, []);

  const updateTimeRecordNote = useCallback((id: string, note: string) => {
    setState(prev => ({
      ...prev,
      timeRecords: prev.timeRecords.map(r => r.id === id ? { ...r, note } : r),
    }));
  }, []);

  const startTimer = useCallback((content: string) => {
    const now = new Date();
    const startTime = now.toISOString();
    const startTimestamp = now.getTime();

    const record: TimeRecord = {
      id: Date.now().toString(),
      startTime,
      endTime: '',
      content,
      note: '',
      createdAt: now.toISOString(),
      todoId: null,
      startTimestamp,
    };

    setState(prev => ({ ...prev, timeRecords: [record, ...prev.timeRecords] }));
    return record.id;
  }, []);

  const endTimer = useCallback((recordId: string) => {
    setState(prev => {
      const record = prev.timeRecords.find(r => r.id === recordId);
      if (!record) return prev;

      const now = new Date();
      const endTime = now.toISOString();

      return {
        ...prev,
        timeRecords: prev.timeRecords.map(r => r.id === recordId ? { ...r, endTime } : r),
      };
    });
  }, []);

  const addInspiration = useCallback((content: string) => {
    const inspiration: Inspiration = {
      id: Date.now().toString(),
      content,
      createdAt: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, inspirations: [inspiration, ...prev.inspirations] }));
  }, []);

  const deleteInspiration = useCallback((id: string) => {
    setState(prev => ({ ...prev, inspirations: prev.inspirations.filter(i => i.id !== id) }));
  }, []);

  const updateInspiration = useCallback((id: string, content: string) => {
    setState(prev => ({
      ...prev,
      inspirations: prev.inspirations.map(i => i.id === id ? { ...i, content } : i),
    }));
  }, []);

  const moveInspirationToTodo = useCallback((id: string) => {
    setState(prev => {
      const inspiration = prev.inspirations.find(i => i.id === id);
      if (!inspiration) return prev;

      const newTodo: Todo = {
        id: Date.now().toString(),
        title: inspiration.content,
        createdAt: new Date().toISOString(),
        completedAt: null,
        isCompleted: false,
        isDelayed: false,
        delayCount: 0,
        totalTime: 0,
        isTiming: false,
        timingStartTime: null,
        timingRecordId: null,
        tag: 'one-time',
      };

      return {
        ...prev,
        inspirations: prev.inspirations.filter(i => i.id !== id),
        todos: [newTodo, ...prev.todos],
      };
    });
  }, []);

  const pinInspiration = useCallback((id: string) => {
    setState(prev => {
      const inspiration = prev.inspirations.find(i => i.id === id);
      if (!inspiration) return prev;
      return {
        ...prev,
        inspirations: [inspiration, ...prev.inspirations.filter(i => i.id !== id)],
      };
    });
  }, []);

  const exportData = useCallback(() => {
    return JSON.stringify(state, null, 2);
  }, [state]);

  const importData = useCallback((data: string) => {
    try {
      const parsed = JSON.parse(data);
      const logs = parsed.achievementLogs || [];
      
      const totalEarned = logs
        .filter((log: AchievementLog) => log.type === 'task')
        .reduce((sum: number, log: AchievementLog) => sum + (log.points || 0), 0);
      
      const totalSpent = logs
        .filter((log: AchievementLog) => log.type === 'commodity')
        .reduce((sum: number, log: AchievementLog) => sum + (log.points || 0), 0);
      
      const totalAchievements = totalEarned - totalSpent;
      
      setState({ 
        ...initialState, 
        ...parsed,
        totalAchievements,
        totalEarned,
        totalSpent
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const getDailyStats = useCallback((date: string): { totalAchievements: number; checkInCount: number } => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dayLogs = state.achievementLogs.filter(log => {
      const logDate = new Date(log.createdAt);
      return logDate >= dayStart && logDate <= dayEnd;
    });

    const taskCheckIns = state.checkInRecords.filter(record => {
      const recordDate = new Date(record.createdAt);
      return recordDate >= dayStart && recordDate <= dayEnd && record.type === 'task';
    });

    return {
      totalAchievements: dayLogs.reduce((sum, log) => sum + log.points, 0),
      checkInCount: taskCheckIns.length,
    };
  }, [state.achievementLogs, state.checkInRecords]);

  const getRecordsByDate = useCallback((date: string) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return {
      checkInRecords: state.checkInRecords.filter(record => {
        const recordDate = new Date(record.createdAt);
        return recordDate >= dayStart && recordDate <= dayEnd;
      }),
      timeRecords: state.timeRecords.filter(record => {
        const recordDate = new Date(record.createdAt);
        return recordDate >= dayStart && recordDate <= dayEnd;
      }),
      achievementLogs: state.achievementLogs.filter(log => {
        const logDate = new Date(log.createdAt);
        return logDate >= dayStart && logDate <= dayEnd;
      }),
    };
  }, [state.checkInRecords, state.timeRecords, state.achievementLogs]);

  const getMonthlyStats = useCallback((date: string): { totalAchievements: number; checkInCount: number; todoCount: number; timeRecordCount: number } => {
    const dateObj = new Date(date);
    const monthStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
    const monthEnd = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthLogs = state.achievementLogs.filter(log => {
      const logDate = new Date(log.createdAt);
      return logDate >= monthStart && logDate <= monthEnd;
    });

    const taskCheckIns = state.checkInRecords.filter(record => {
      const recordDate = new Date(record.createdAt);
      return recordDate >= monthStart && recordDate <= monthEnd && record.type === 'task';
    });

    const monthTodos = state.todos.filter(todo => {
      const todoDate = new Date(todo.createdAt);
      return todoDate >= monthStart && todoDate <= monthEnd;
    });

    const monthTimeRecords = state.timeRecords.filter(record => {
      const recordDate = new Date(record.createdAt);
      return recordDate >= monthStart && recordDate <= monthEnd && record.endTime;
    });

    return {
      totalAchievements: monthLogs.reduce((sum, log) => sum + log.points, 0),
      checkInCount: taskCheckIns.length,
      todoCount: monthTodos.length,
      timeRecordCount: monthTimeRecords.length,
    };
  }, [state.achievementLogs, state.checkInRecords, state.timeRecords, state.todos]);

  const getYearlyStats = useCallback((date: string): { totalAchievements: number; checkInCount: number; todoCount: number; timeRecordCount: number } => {
    const dateObj = new Date(date);
    const yearStart = new Date(dateObj.getFullYear(), 0, 1);
    const yearEnd = new Date(dateObj.getFullYear(), 11, 31, 23, 59, 59, 999);

    const yearLogs = state.achievementLogs.filter(log => {
      const logDate = new Date(log.createdAt);
      return logDate >= yearStart && logDate <= yearEnd;
    });

    const taskCheckIns = state.checkInRecords.filter(record => {
      const recordDate = new Date(record.createdAt);
      return recordDate >= yearStart && recordDate <= yearEnd && record.type === 'task';
    });

    const yearTodos = state.todos.filter(todo => {
      const todoDate = new Date(todo.createdAt);
      return todoDate >= yearStart && todoDate <= yearEnd;
    });

    const yearTimeRecords = state.timeRecords.filter(record => {
      const recordDate = new Date(record.createdAt);
      return recordDate >= yearStart && recordDate <= yearEnd && record.endTime;
    });

    return {
      totalAchievements: yearLogs.reduce((sum, log) => sum + log.points, 0),
      checkInCount: taskCheckIns.length,
      todoCount: yearTodos.length,
      timeRecordCount: yearTimeRecords.length,
    };
  }, [state.achievementLogs, state.checkInRecords, state.timeRecords, state.todos]);

  return {
    state,
    addTodo,
    completeTodo,
    deleteTodo,
    clearCompletedTodos,
    toggleDelayTodo,
    updateTodo,
    pinTodo,
    startTodoTiming,
    endTodoTiming,
    addCheckInProject,
    deleteCheckInProject,
    checkIn,
    addTimeRecord,
    deleteTimeRecord,
    updateTimeRecordNote,
    startTimer,
    endTimer,
    addInspiration,
    deleteInspiration,
    updateInspiration,
    moveInspirationToTodo,
    pinInspiration,
    exportData,
    importData,
    getDailyStats,
    getRecordsByDate,
    getMonthlyStats,
    getYearlyStats,
  };
}