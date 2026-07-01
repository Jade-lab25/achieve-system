-- Migration: Add shop_purchase type to achievement_logs
-- Run this in your Supabase SQL Editor to fix the sync error

-- First drop the old constraint
ALTER TABLE achievement_logs
DROP CONSTRAINT IF EXISTS achievement_logs_type_check;

-- Add the new constraint with shop_purchase type
ALTER TABLE achievement_logs
ADD CONSTRAINT achievement_logs_type_check
CHECK (type IN ('todo', 'task', 'commodity', 'shop_purchase'));

-- Verify the constraint was added correctly
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'achievement_logs'::regclass
AND conname = 'achievement_logs_type_check';

-- Optional: Check existing data to ensure no invalid types
-- SELECT DISTINCT type FROM achievement_logs;
