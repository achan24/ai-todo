-- Script to convert task priority from text to integer in Supabase
-- Run this in the Supabase SQL Editor

-- 1. Create a new temporary table with the desired schema
CREATE TABLE tasks_new AS 
SELECT 
    id, 
    title, 
    description, 
    completed, 
    CASE 
        WHEN priority = 'high' THEN 1 
        WHEN priority = 'medium' THEN 2 
        WHEN priority = 'low' THEN 3 
        ELSE 2 
    END AS priority,
    due_date, 
    created_at, 
    updated_at, 
    user_id, 
    parent_id, 
    estimated_minutes, 
    goal_id, 
    metric_id, 
    contribution_value, 
    completion_time, 
    completion_order, 
    tags
FROM tasks;

-- 2. Verify the data was copied correctly (run this separately to check)
-- SELECT COUNT(*) FROM tasks;
-- SELECT COUNT(*) FROM tasks_new;

-- 3. Drop the original table
DROP TABLE tasks;

-- 4. Rename the new table to the original name
ALTER TABLE tasks_new RENAME TO tasks;

-- 5. Recreate primary key constraint
ALTER TABLE tasks ADD PRIMARY KEY (id);

-- 6. Recreate any indexes, constraints, and foreign keys
ALTER TABLE tasks 
ADD CONSTRAINT tasks_parent_id_fkey 
FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_goal_id_fkey 
FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_metric_id_fkey 
FOREIGN KEY (metric_id) REFERENCES metrics(id) ON DELETE SET NULL;

-- 7. Recreate indexes (if any)
CREATE INDEX IF NOT EXISTS tasks_title_idx ON tasks(title);
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_goal_id_idx ON tasks(goal_id);
CREATE INDEX IF NOT EXISTS tasks_parent_id_idx ON tasks(parent_id);

-- 8. Verify the conversion was successful
-- SELECT id, title, priority FROM tasks LIMIT 10;
