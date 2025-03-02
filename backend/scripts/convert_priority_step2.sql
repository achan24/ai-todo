-- Step 2: Create a new temporary table with the desired schema
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
