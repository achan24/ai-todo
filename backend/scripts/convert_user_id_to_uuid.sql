-- PostgreSQL script to convert user_id column in goals table from String to UUID

-- Create a temporary column
ALTER TABLE goals ADD COLUMN user_id_uuid UUID;

-- Copy data from user_id to user_id_uuid, handling format conversion
UPDATE goals SET user_id_uuid = 
  CASE 
    WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN user_id::UUID  -- Already in UUID format
    WHEN user_id ~ '^[0-9a-f]{32}$' THEN  -- UUID without hyphens
      SUBSTRING(user_id, 1, 8) || '-' || 
      SUBSTRING(user_id, 9, 4) || '-' || 
      SUBSTRING(user_id, 13, 4) || '-' || 
      SUBSTRING(user_id, 17, 4) || '-' || 
      SUBSTRING(user_id, 21)::UUID
    ELSE NULL  -- Handle invalid UUIDs
  END;

-- Drop the old column
ALTER TABLE goals DROP COLUMN user_id;

-- Rename the new column
ALTER TABLE goals RENAME COLUMN user_id_uuid TO user_id;

-- Add NOT NULL constraint
ALTER TABLE goals ALTER COLUMN user_id SET NOT NULL;

-- Add default (optional)
ALTER TABLE goals ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000000';

-- Create an index (optional but recommended for performance)
CREATE INDEX idx_goals_user_id ON goals(user_id);
