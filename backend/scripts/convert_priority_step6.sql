-- Step 6: Recreate indexes
CREATE INDEX IF NOT EXISTS tasks_title_idx ON tasks(title);
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_goal_id_idx ON tasks(goal_id);
CREATE INDEX IF NOT EXISTS tasks_parent_id_idx ON tasks(parent_id);
