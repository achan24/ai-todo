-- Step 5: Recreate constraints and primary key
ALTER TABLE tasks 
ADD CONSTRAINT tasks_parent_id_fkey 
FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_goal_id_fkey 
FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_metric_id_fkey 
FOREIGN KEY (metric_id) REFERENCES metrics(id) ON DELETE SET NULL;

-- Recreate primary key constraint
ALTER TABLE tasks ADD PRIMARY KEY (id);
