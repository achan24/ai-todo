"""
Migration script to convert task priority from enum to integer in PostgreSQL
Run this script after updating the Task model but before running Alembic migrations

Usage:
python -m backend.migrations.convert_priority_to_integer
"""

import os
import sys
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def convert_priority_to_integer():
    """Convert task priority from enum to integer in PostgreSQL"""
    
    # Get database URL from environment variables
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        logger.error("DATABASE_URL environment variable not set")
        sys.exit(1)
        
    if not DATABASE_URL.startswith("postgresql"):
        logger.error("This script is only for PostgreSQL databases")
        sys.exit(1)
    
    # Add SSL mode for PostgreSQL connections if not already present
    if "sslmode=" not in DATABASE_URL:
        DATABASE_URL += "?sslmode=require"
    
    logger.info(f"Connecting to PostgreSQL database")
    
    # Create engine with connection pooling settings
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={"connect_timeout": 10}
    )
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        logger.info("Converting priority field in PostgreSQL database")
        
        # First, check if the table exists
        result = session.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tasks')"
        ))
        table_exists = result.scalar()
        
        if not table_exists:
            logger.error("The 'tasks' table does not exist in the database")
            return
            
        # Check if the priority column exists and its current type
        result = session.execute(text(
            "SELECT data_type FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'priority'"
        ))
        column_type = result.scalar()
        
        if not column_type:
            logger.error("The 'priority' column does not exist in the 'tasks' table")
            return
            
        logger.info(f"Current priority column type: {column_type}")
        
        # If already integer, no need to convert
        if column_type.lower() == 'integer':
            logger.info("Priority column is already an integer type, no conversion needed")
            return
        
        # Using the table recreation pattern to avoid ALTER TABLE timeout issues
        logger.info("Using table recreation pattern to change column type")
        
        # 1. Create a new temporary table with the desired schema
        logger.info("Creating temporary table with integer priority")
        session.execute(text("""
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
        FROM tasks
        """))
        session.commit()
        logger.info("Temporary table created with converted priority values")
        
        # 2. Verify the data was copied correctly
        result = session.execute(text("SELECT COUNT(*) FROM tasks"))
        original_count = result.scalar()
        
        result = session.execute(text("SELECT COUNT(*) FROM tasks_new"))
        new_count = result.scalar()
        
        if original_count != new_count:
            logger.error(f"Data count mismatch: original={original_count}, new={new_count}")
            logger.error("Aborting migration to prevent data loss")
            return
            
        logger.info(f"Data verification passed: {new_count} rows copied successfully")
        
        # 3. Drop the original table
        logger.info("Dropping original tasks table")
        session.execute(text("DROP TABLE tasks"))
        session.commit()
        
        # 4. Rename the new table to the original name
        logger.info("Renaming temporary table to original name")
        session.execute(text("ALTER TABLE tasks_new RENAME TO tasks"))
        session.commit()
        
        # 5. Recreate any indexes, constraints, and foreign keys
        logger.info("Recreating foreign key constraints")
        session.execute(text("""
        ALTER TABLE tasks 
        ADD CONSTRAINT tasks_parent_id_fkey 
        FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
        """))
        
        session.execute(text("""
        ALTER TABLE tasks 
        ADD CONSTRAINT tasks_goal_id_fkey 
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
        """))
        
        session.execute(text("""
        ALTER TABLE tasks 
        ADD CONSTRAINT tasks_metric_id_fkey 
        FOREIGN KEY (metric_id) REFERENCES metrics(id) ON DELETE SET NULL
        """))
        
        session.commit()
        
        logger.info("Successfully converted priority field to integer")
        
    except Exception as e:
        session.rollback()
        logger.error(f"Error converting priority field: {str(e)}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    logger.info("Starting priority field conversion for PostgreSQL")
    convert_priority_to_integer()
    logger.info("Priority field conversion completed")
