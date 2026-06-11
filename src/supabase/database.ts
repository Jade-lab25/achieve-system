import { supabase } from './client';
import type { Todo, CheckInProject, CheckInRecord, TimeRecord, AchievementLog, Inspiration, UserStats } from './types';

function camelToSnake(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = obj[key];
  }
  return result;
}

function snakeToCamel(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

export const auth = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

export const todo = {
  getAll: async (userId: string) => {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: data?.map(snakeToCamel), error };
  },

  insert: async (todo: Omit<Todo, 'id' | 'synced_at'>) => {
    const { data, error } = await supabase
      .from('todos')
      .insert({ ...camelToSnake(todo), synced_at: new Date().toISOString() })
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  },

  update: async (id: string, updates: Partial<Todo>) => {
    const { data, error } = await supabase
      .from('todos')
      .update({ ...camelToSnake(updates), synced_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);
    return { error };
  },

  sync: async (userId: string, localTodos: Todo[]) => {
    const { data: remoteTodos, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId);

    if (error) return { error };

    const syncErrors: string[] = [];
    const localIds = new Set(localTodos.map(t => t.id));

    for (const remoteTodo of remoteTodos || []) {
      if (!localIds.has(remoteTodo.id)) {
        const { error: deleteError } = await supabase
          .from('todos')
          .delete()
          .eq('id', remoteTodo.id);
        if (deleteError) syncErrors.push(deleteError.message);
      }
    }

    for (const localTodo of localTodos) {
      const remoteTodo = remoteTodos?.find(t => t.id === localTodo.id);
      const todoData = camelToSnake(localTodo);

      if (!remoteTodo) {
        const { error: insertError } = await supabase
          .from('todos')
          .insert({ ...todoData, user_id: userId, synced_at: new Date().toISOString() });
        if (insertError) syncErrors.push(insertError.message);
      } else if (localTodo.synced_at && remoteTodo.synced_at && 
                 new Date(localTodo.synced_at) > new Date(remoteTodo.synced_at)) {
        const { error: updateError } = await supabase
          .from('todos')
          .update({ ...todoData, synced_at: new Date().toISOString() })
          .eq('id', localTodo.id);
        if (updateError) syncErrors.push(updateError.message);
      }
    }

    return { error: syncErrors.length > 0 ? new Error(syncErrors.join(', ')) : null };
  }
};

export const checkInProject = {
  getAll: async (userId: string) => {
    const { data, error } = await supabase
      .from('check_in_projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: data?.map(snakeToCamel), error };
  },

  insert: async (project: Omit<CheckInProject, 'id' | 'synced_at'>) => {
    const { data, error } = await supabase
      .from('check_in_projects')
      .insert({ ...camelToSnake(project), synced_at: new Date().toISOString() })
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  },

  update: async (id: string, updates: Partial<CheckInProject>) => {
    const { data, error } = await supabase
      .from('check_in_projects')
      .update({ ...camelToSnake(updates), synced_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('check_in_projects')
      .delete()
      .eq('id', id);
    return { error };
  },

  sync: async (userId: string, localProjects: CheckInProject[]) => {
    const { data: remoteProjects, error } = await supabase
      .from('check_in_projects')
      .select('*')
      .eq('user_id', userId);

    if (error) return { error };

    const syncErrors: string[] = [];
    const localIds = new Set(localProjects.map(p => p.id));

    for (const remoteProject of remoteProjects || []) {
      if (!localIds.has(remoteProject.id)) {
        const { error: deleteError } = await supabase
          .from('check_in_projects')
          .delete()
          .eq('id', remoteProject.id);
        if (deleteError) syncErrors.push(deleteError.message);
      }
    }

    for (const localProject of localProjects) {
      const remoteProject = remoteProjects?.find(p => p.id === localProject.id);
      const projectData = camelToSnake(localProject);

      if (!remoteProject) {
        const { error: insertError } = await supabase
          .from('check_in_projects')
          .insert({ ...projectData, user_id: userId, synced_at: new Date().toISOString() });
        if (insertError) syncErrors.push(insertError.message);
      } else if (localProject.synced_at && remoteProject.synced_at && 
                 new Date(localProject.synced_at) > new Date(remoteProject.synced_at)) {
        const { error: updateError } = await supabase
          .from('check_in_projects')
          .update({ ...projectData, synced_at: new Date().toISOString() })
          .eq('id', localProject.id);
        if (updateError) syncErrors.push(updateError.message);
      }
    }

    return { error: syncErrors.length > 0 ? new Error(syncErrors.join(', ')) : null };
  }
};

export const checkInRecord = {
  getAll: async (userId: string) => {
    const { data, error } = await supabase
      .from('check_in_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: data?.map(snakeToCamel), error };
  },

  insert: async (record: Omit<CheckInRecord, 'id' | 'synced_at'>) => {
    const { data, error } = await supabase
      .from('check_in_records')
      .insert({ ...camelToSnake(record), synced_at: new Date().toISOString() })
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  }
};

export const timeRecord = {
  getAll: async (userId: string) => {
    const { data, error } = await supabase
      .from('time_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: data?.map(snakeToCamel), error };
  },

  insert: async (record: Omit<TimeRecord, 'id' | 'synced_at'>) => {
    const { data, error } = await supabase
      .from('time_records')
      .insert({ ...camelToSnake(record), synced_at: new Date().toISOString() })
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  },

  update: async (id: string, updates: Partial<TimeRecord>) => {
    const { data, error } = await supabase
      .from('time_records')
      .update({ ...camelToSnake(updates), synced_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('time_records')
      .delete()
      .eq('id', id);
    return { error };
  }
};

export const achievementLog = {
  getAll: async (userId: string) => {
    const { data, error } = await supabase
      .from('achievement_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: data?.map(snakeToCamel), error };
  },

  insert: async (log: Omit<AchievementLog, 'id' | 'synced_at'>) => {
    const { data, error } = await supabase
      .from('achievement_logs')
      .insert({ ...camelToSnake(log), synced_at: new Date().toISOString() })
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  }
};

export const inspiration = {
  getAll: async (userId: string) => {
    const { data, error } = await supabase
      .from('inspirations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: data?.map(snakeToCamel), error };
  },

  insert: async (inspiration: Omit<Inspiration, 'id' | 'synced_at'>) => {
    const { data, error } = await supabase
      .from('inspirations')
      .insert({ ...camelToSnake(inspiration), synced_at: new Date().toISOString() })
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  },

  update: async (id: string, updates: Partial<Inspiration>) => {
    const { data, error } = await supabase
      .from('inspirations')
      .update({ ...camelToSnake(updates), synced_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('inspirations')
      .delete()
      .eq('id', id);
    return { error };
  },

  sync: async (userId: string, localInspirations: Inspiration[]) => {
    const { data: remoteInspirations, error } = await supabase
      .from('inspirations')
      .select('*')
      .eq('user_id', userId);

    if (error) return { error };

    const syncErrors: string[] = [];
    const localIds = new Set(localInspirations.map(i => i.id));

    for (const remoteInsp of remoteInspirations || []) {
      if (!localIds.has(remoteInsp.id)) {
        const { error: deleteError } = await supabase
          .from('inspirations')
          .delete()
          .eq('id', remoteInsp.id);
        if (deleteError) syncErrors.push(deleteError.message);
      }
    }

    for (const localInsp of localInspirations) {
      const remoteInsp = remoteInspirations?.find(i => i.id === localInsp.id);
      const inspData = camelToSnake(localInsp);

      if (!remoteInsp) {
        const { error: insertError } = await supabase
          .from('inspirations')
          .insert({ ...inspData, user_id: userId, synced_at: new Date().toISOString() });
        if (insertError) syncErrors.push(insertError.message);
      } else if (!localInsp.synced_at || (remoteInsp.synced_at && new Date(localInsp.synced_at) > new Date(remoteInsp.synced_at))) {
        const { error: updateError } = await supabase
          .from('inspirations')
          .update({ ...inspData, synced_at: new Date().toISOString() })
          .eq('id', localInsp.id);
        if (updateError) syncErrors.push(updateError.message);
      }
    }

    return { error: syncErrors.length > 0 ? new Error(syncErrors.join(', ')) : null };
  }
};

export const userStats = {
  get: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.message.includes('No rows')) {
      return { data: null, error: null };
    }
    
    return { data: data ? snakeToCamel(data) : null, error };
  },

  upsert: async (userId: string, stats: Partial<UserStats>) => {
    const { data, error } = await supabase
      .from('user_stats')
      .upsert({
        id: userId,
        user_id: userId,
        ...camelToSnake(stats),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select();
    return { data: data?.[0] ? snakeToCamel(data[0]) : null, error };
  }
};

export const syncAll = async (userId: string, data: {
  todos: any[];
  checkInProjects: any[];
  checkInRecords: any[];
  timeRecords: any[];
  achievementLogs: any[];
  inspirations: any[];
  userStats: Partial<UserStats>;
}) => {
  const errors: string[] = [];

  if (data.todos.length > 0) {
    const { error } = await todo.sync(userId, data.todos);
    if (error) errors.push(`Todos sync error: ${error.message}`);
  }

  if (data.checkInProjects.length > 0) {
    const { error } = await checkInProject.sync(userId, data.checkInProjects);
    if (error) errors.push(`Project sync error: ${error.message}`);
  }

  for (const record of data.checkInRecords) {
    const { error } = await checkInRecord.insert({ ...record, user_id: userId });
    if (error && !error.message.includes('duplicate key')) errors.push(`Check-in record sync error: ${error.message}`);
  }

  for (const record of data.timeRecords) {
    const { error } = await timeRecord.insert({ ...record, user_id: userId });
    if (error && !error.message.includes('duplicate key')) errors.push(`Time record sync error: ${error.message}`);
  }

  for (const log of data.achievementLogs) {
    const { error } = await achievementLog.insert({ ...log, user_id: userId });
    if (error && !error.message.includes('duplicate key')) errors.push(`Achievement log sync error: ${error.message}`);
  }

  if (data.inspirations.length > 0) {
    const { error } = await inspiration.sync(userId, data.inspirations);
    if (error) errors.push(`Inspiration sync error: ${error.message}`);
  }

  if (Object.keys(data.userStats).length > 0) {
    const { error } = await userStats.upsert(userId, data.userStats);
    if (error) errors.push(`User stats sync error: ${error.message}`);
  }

  return { success: errors.length === 0, errors };
};

export const fetchAll = async (userId: string) => {
  const [
    { data: todos, error: todosError },
    { data: checkInProjects, error: projectsError },
    { data: checkInRecords, error: recordsError },
    { data: timeRecords, error: timeError },
    { data: achievementLogs, error: logsError },
    { data: inspirations, error: inspError },
    { data: userStatsData, error: statsError }
  ] = await Promise.all([
    todo.getAll(userId),
    checkInProject.getAll(userId),
    checkInRecord.getAll(userId),
    timeRecord.getAll(userId),
    achievementLog.getAll(userId),
    inspiration.getAll(userId),
    userStats.get(userId)
  ]);

  const errors = [todosError, projectsError, recordsError, timeError, logsError, inspError, statsError]
    .filter(e => e)
    .map(e => e!.message);

  return {
    data: {
      todos: todos || [],
      checkInProjects: checkInProjects || [],
      checkInRecords: checkInRecords || [],
      timeRecords: timeRecords || [],
      achievementLogs: achievementLogs || [],
      inspirations: inspirations || [],
      userStats: userStatsData || null
    },
    errors,
    success: errors.length === 0
  };
};