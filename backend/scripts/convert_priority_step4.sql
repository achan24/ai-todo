-- Step 4: Drop the original table and rename the new one
DROP TABLE tasks;
ALTER TABLE tasks_new RENAME TO tasks;
