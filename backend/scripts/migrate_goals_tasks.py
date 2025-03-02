#!/usr/bin/env python3
"""
Script to migrate only goals and tasks from SQLite to Supabase PostgreSQL.
This script will not affect any other tables.
"""

import os
import sys
import json
import sqlite3
import psycopg2
import uuid
from psycopg2.extras import RealDictCursor
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime

# Add the parent directory to sys.path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

# Get DATABASE_URL for Supabase
database_url = os.getenv("DATABASE_URL")
if not database_url or not database_url.startswith("postgresql"):
    print("Error: DATABASE_URL is not set or is not a PostgreSQL connection string")
    print("Please set DATABASE_URL in your .env file")
    sys.exit(1)

# Get Supabase user ID (needed for migration)
supabase_user_id = os.getenv("SUPABASE_USER_ID")
if not supabase_user_id:
    print("Error: SUPABASE_USER_ID is not set")
    print("Please set SUPABASE_USER_ID in your .env file to your Supabase Auth user UUID")
    sys.exit(1)

try:
    # Validate that SUPABASE_USER_ID is a valid UUID
    uuid.UUID(supabase_user_id)
except ValueError:
    print(f"Error: SUPABASE_USER_ID '{supabase_user_id}' is not a valid UUID")
    print("Please set SUPABASE_USER_ID to your Supabase Auth user UUID")
    sys.exit(1)

# Connect to SQLite database
sqlite_db_path = Path(__file__).parent.parent / "sql_app.db"
if not sqlite_db_path.exists():
    print(f"Error: SQLite database not found at {sqlite_db_path}")
    sys.exit(1)

sqlite_conn = sqlite3.connect(str(sqlite_db_path))
sqlite_conn.row_factory = sqlite3.Row
sqlite_cursor = sqlite_conn.cursor()

# Connect to Supabase PostgreSQL database
try:
    print(f"Connecting to Supabase PostgreSQL database...")
    pg_conn = psycopg2.connect(database_url)
    pg_cursor = pg_conn.cursor(cursor_factory=RealDictCursor)
except Exception as e:
    print(f"Error connecting to PostgreSQL: {str(e)}")
    sys.exit(1)

# Define data transformations for each table
transformations = {
    "goals": {
        "user_id": lambda val: supabase_user_id,  # Replace with Supabase user UUID
        "priority": lambda val: {"high": 3, "medium": 2, "low": 1}.get(val, 2) if isinstance(val, str) else val,
        "tags": lambda val: json.dumps([]) if val is None else json.dumps(val.split(",") if val else []),
        "current_strategy_id": lambda val: None  # Set to NULL to avoid foreign key issues
    },
    "tasks": {
        "user_id": lambda val: supabase_user_id,  # Replace with Supabase user UUID
        "completed": lambda val: val == 1 or val is True,  # Convert 0/1 to boolean
        "priority": lambda val: {"high": 3, "medium": 2, "low": 1}.get(val, 2) if isinstance(val, str) else val,
        "tags": lambda val: json.dumps([]) if val is None else json.dumps(val.split(",") if val else []),
        "parent_id": lambda val: None  # Set to NULL to avoid foreign key issues
    }
}

# Disable foreign key constraints temporarily
print("\nTemporarily disabling foreign key constraints...")
pg_cursor.execute("SET session_replication_role = 'replica';")
pg_conn.commit()

try:
    # Process goals and tasks
    for table in ["goals", "tasks"]:
        print(f"\nMigrating table: {table}")
        
        # Get data from SQLite
        sqlite_cursor.execute(f"SELECT * FROM {table}")
        rows = [dict(row) for row in sqlite_cursor.fetchall()]
        
        if not rows:
            print(f"  No data in table {table}, skipping")
            continue
            
        print(f"  Found {len(rows)} rows to migrate")
        
        # Get PostgreSQL table columns and their types
        pg_cursor.execute(f"""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = '{table}';
        """)
        pg_columns = {row['column_name']: {
            'type': row['data_type'],
            'nullable': row['is_nullable'] == 'YES'
        } for row in pg_cursor.fetchall()}
        
        # Transform data for each row
        transformed_rows = []
        for row in rows:
            transformed_row = {}
            for col, val in row.items():
                # Skip columns that don't exist in PostgreSQL
                if col.lower() not in [c.lower() for c in pg_columns.keys()]:
                    continue
                    
                pg_col = next(c for c in pg_columns.keys() if c.lower() == col.lower())
                
                # Apply transformations if defined
                if table in transformations and col in transformations[table]:
                    val = transformations[table][col](val)
                
                # Handle type conversions based on PostgreSQL column type
                col_type = pg_columns[pg_col]['type']
                nullable = pg_columns[pg_col]['nullable']
                
                # Skip NULL values for non-nullable columns
                if val is None and not nullable:
                    continue
                    
                # Type conversions
                if val is not None:
                    if col_type == 'boolean':
                        val = val == 1 or val is True
                    elif col_type in ('integer', 'bigint'):
                        try:
                            val = int(val)
                        except (ValueError, TypeError):
                            val = 0
                    elif col_type in ('double precision', 'numeric'):
                        try:
                            val = float(val)
                        except (ValueError, TypeError):
                            val = 0.0
                    elif col_type == 'jsonb' and not isinstance(val, str):
                        val = json.dumps(val if val is not None else [])
                
                transformed_row[pg_col] = val
                
            # Add user_id if not present
            if 'user_id' not in transformed_row:
                transformed_row['user_id'] = supabase_user_id
                
            transformed_rows.append(transformed_row)
        
        # Insert data into PostgreSQL
        try:
            for row in transformed_rows:
                columns = list(row.keys())
                values = [row[col] for col in columns]
                
                # Build the INSERT query
                columns_str = ', '.join([f'"{col}"' for col in columns])
                placeholders = ', '.join(['%s' for _ in columns])
                
                query = f'INSERT INTO "{table}" ({columns_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'
                pg_cursor.execute(query, values)
            
            pg_conn.commit()
            print(f"  Successfully migrated {len(transformed_rows)} rows to {table}")
        except Exception as e:
            pg_conn.rollback()
            print(f"  Error inserting data into {table}: {str(e)}")
            print(f"  Query: {query}")
            print(f"  Values: {values}")

    # Re-enable foreign key constraints
    print("\nRe-enabling foreign key constraints...")
    pg_cursor.execute("SET session_replication_role = 'origin';")
    pg_conn.commit()

    # Update tasks.parent_id
    try:
        pg_cursor.execute("""
            UPDATE tasks t1
            SET parent_id = t2.id
            FROM (
                SELECT id, title FROM tasks WHERE user_id = %s
            ) t2
            WHERE t1.parent_id IS NOT NULL AND t1.user_id = %s
            AND t2.title = (
                SELECT title FROM tasks WHERE id = t1.parent_id AND user_id = %s LIMIT 1
            )
        """, (supabase_user_id, supabase_user_id, supabase_user_id))
        pg_conn.commit()
        print("  Updated tasks.parent_id")
    except Exception as e:
        pg_conn.rollback()
        print(f"  Error updating tasks.parent_id: {str(e)}")

except Exception as e:
    print(f"Error during migration: {str(e)}")
finally:
    # Make sure to re-enable foreign key constraints even if there's an error
    try:
        pg_cursor.execute("SET session_replication_role = 'origin';")
        pg_conn.commit()
    except:
        pass
    
    # Close connections
    sqlite_conn.close()
    pg_conn.close()

print("\nMigration of goals and tasks completed!")
print("Please check your Supabase database to verify the data was migrated correctly.")
