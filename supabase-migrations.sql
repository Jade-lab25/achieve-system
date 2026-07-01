-- 创建待办表
CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_delayed BOOLEAN NOT NULL DEFAULT FALSE,
  delay_count INTEGER NOT NULL DEFAULT 0,
  total_time DOUBLE PRECISION NOT NULL DEFAULT 0,
  is_timing BOOLEAN NOT NULL DEFAULT FALSE,
  timing_start_time TIMESTAMP WITH TIME ZONE,
  timing_record_id TEXT,
  synced_at TIMESTAMP WITH TIME ZONE
);

-- 创建打卡项目表
CREATE TABLE IF NOT EXISTS check_in_projects (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('task', 'commodity')),
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE
);

-- 创建打卡记录表
CREATE TABLE IF NOT EXISTS check_in_records (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  project_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('task', 'commodity')),
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE
);

-- 创建时间记录表
CREATE TABLE IF NOT EXISTS time_records (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  content TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,
  start_timestamp BIGINT
);

-- 创建成就流水表
CREATE TABLE IF NOT EXISTS achievement_logs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('todo', 'task', 'commodity', 'shop_purchase')),
  title TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,
  shop_item_id TEXT  -- 关联商店商品ID
);

-- 创建成就商店表
CREATE TABLE IF NOT EXISTS shop_items (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 100,
  category TEXT NOT NULL CHECK (category IN ('life', 'study', 'work', 'entertainment', 'other')) DEFAULT 'other',
  is_purchased BOOLEAN NOT NULL DEFAULT FALSE,
  purchased_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,
  is_dirty BOOLEAN NOT NULL DEFAULT FALSE
);

-- 创建灵感记录表
CREATE TABLE IF NOT EXISTS inspirations (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE
);

-- 创建用户统计表
CREATE TABLE IF NOT EXISTS user_stats (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  total_achievements INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);
CREATE INDEX IF NOT EXISTS idx_check_in_projects_user_id ON check_in_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_check_in_records_user_id ON check_in_records(user_id);
CREATE INDEX IF NOT EXISTS idx_time_records_user_id ON time_records(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_logs_user_id ON achievement_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_inspirations_user_id ON inspirations(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_items_user_id ON shop_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_items_purchased ON shop_items(is_purchased);

-- 启用 RLS
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspirations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "Users can view their own todos" ON todos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own todos" ON todos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own todos" ON todos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own todos" ON todos
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own projects" ON check_in_projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" ON check_in_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON check_in_projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON check_in_projects
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own check-in records" ON check_in_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own check-in records" ON check_in_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own time records" ON time_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own time records" ON time_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time records" ON time_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time records" ON time_records
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own achievement logs" ON achievement_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievement logs" ON achievement_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own inspirations" ON inspirations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inspirations" ON inspirations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inspirations" ON inspirations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inspirations" ON inspirations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own stats" ON user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats" ON user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" ON user_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- 商店商品 RLS 策略
CREATE POLICY "Users can view their own shop items" ON shop_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shop items" ON shop_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shop items" ON shop_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shop items" ON shop_items
  FOR DELETE USING (auth.uid() = user_id);

-- Compatibility upgrades for existing Supabase projects.
ALTER TABLE achievement_logs
  DROP CONSTRAINT IF EXISTS achievement_logs_type_check;

ALTER TABLE achievement_logs
  ADD CONSTRAINT achievement_logs_type_check
  CHECK (type IN ('todo', 'task', 'commodity', 'shop_purchase'));

ALTER TABLE achievement_logs
  ADD COLUMN IF NOT EXISTS shop_item_id TEXT;

ALTER TABLE shop_items
  ADD COLUMN IF NOT EXISTS is_purchased BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE shop_items
  ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_shop_items_purchased ON shop_items(is_purchased);
