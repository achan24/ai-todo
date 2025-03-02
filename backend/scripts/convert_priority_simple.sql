-- Simpler approach to convert priority from text to integer
-- This avoids recreating the entire table

-- 1. First, add a new column for the integer priority
ALTER TABLE tasks ADD COLUMN priority_int INTEGER;

-- 2. Update the new column with values based on the text priority
UPDATE tasks SET priority_int = 
    CASE 
        WHEN priority = 'high' THEN 1 
        WHEN priority = 'medium' THEN 2 
        WHEN priority = 'low' THEN 3 
        ELSE 2 
    END;

-- 3. Drop the old priority column
ALTER TABLE tasks DROP COLUMN priority;

-- 4. Rename the new column to the original name
ALTER TABLE tasks RENAME COLUMN priority_int TO priority;

-- 5. Verify the conversion was successful
-- SELECT id, title, priority FROM tasks LIMIT 10;
