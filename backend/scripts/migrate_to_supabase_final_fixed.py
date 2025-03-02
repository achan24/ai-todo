#!/usr/bin/env python3
"""
Final migration script to transfer data from SQLite to Supabase PostgreSQL.
This script:
1. Temporarily disables foreign key constraints
2. Processes tables in the correct order
3. Handles data type conversions
4. Preserves IDs to maintain relationships
5. Checks if tables have user_id before filtering by it
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

# Get all tables from SQLite
sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [row[0] for row in sqlite_cursor.fetchall()]

if not tables:
    print("No tables found in SQLite database.")
    sys.exit(0)

print(f"Found {len(tables)} tables in SQLite: {', '.join(tables)}")

# First, check if the user exists in Supabase
pg_cursor.execute("SELECT id FROM users WHERE id = %s", (supabase_user_id,))
user_exists = pg_cursor.fetchone()

if not user_exists:
    print(f"Creating user record in Supabase with ID: {supabase_user_id}")
    # Get user email from Supabase Auth (if available)
    email = input("Enter your email address for the Supabase user: ")
    full_name = input("Enter your full name for the Supabase user: ")
    
    # Insert user into Supabase
    pg_cursor.execute(
        "INSERT INTO users (id, email, full_name) VALUES (%s, %s, %s)",
        (supabase_user_id, email, full_name)
    )
    pg_conn.commit()
    print("User created successfully")
else:
    print(f"User with ID {supabase_user_id} already exists in Supabase")

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
    },
    "metrics": {
        "target_value": lambda val: float(val) if val is not None else 0.0,
        "current_value": lambda val: float(val) if val is not None else 0.0
    },
    "experiences": {
        "experience_type": lambda val: "reflection"  # Default value for required field
    },
    "strategies": {
        "description": lambda val: "Migrated strategy" if val is None else val
    },
    "conversations": {
        "user_id": lambda val: supabase_user_id  # Replace with Supabase user UUID
    }
}

# Define the order of tables to migrate (to handle foreign key dependencies)
table_order = [
    "goals",           # Goals should be first as they're referenced by other tables
    "strategies",      # Strategies reference goals
    "tasks",           # Tasks might reference goals
    "metrics",         # Metrics reference goals
    "experiences",     # Experiences reference goals
    "conversations",   # Conversations should be before messages
    "conversation_messages"  # Messages reference conversations
]

# Add any tables not explicitly ordered to the end
for table in tables:
    if table not in table_order and table != "alembic_version":
        table_order.append(table)

# Disable foreign key constraints temporarily
print("\nTemporarily disabling foreign key constraints...")
pg_cursor.execute("SET session_replication_role = 'replica';")
pg_conn.commit()

try:
    # Process each table in order
    for table in table_order:
        if table not in tables or table == "alembic_version":
            continue  # Skip if table doesn't exist in SQLite or is alembic_version
            
        print(f"\nMigrating table: {table}")
        
        # Get data from SQLite
        sqlite_cursor.execute(f"SELECT * FROM {table}")
        rows = [dict(row) for row in sqlite_cursor.fetchall()]
        
        if not rows:
            print(f"  No data in table {table}, skipping")
            continue
            
        print(f"  Found {len(rows)} rows to migrate")
        
        # Check if table exists in PostgreSQL
        pg_cursor.execute(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = '{table}'
            );
        """)
        table_exists = pg_cursor.fetchone()['exists']
        
        if not table_exists:
            print(f"  Table {table} does not exist in PostgreSQL, skipping")
            continue
        
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
        
        # Check if table has user_id column before trying to delete by user_id
        has_user_id = 'user_id' in pg_columns
        
        # Clear existing data if needed and if table has user_id
        if has_user_id:
            try:
                pg_cursor.execute(f"DELETE FROM \"{table}\" WHERE user_id = %s", (supabase_user_id,))
                pg_conn.commit()
                print(f"  Cleared existing data for user in {table}")
            except Exception as e:
                pg_conn.rollback()
                print(f"  Error clearing data from {table}: {str(e)}")
        else:
            # For tables without user_id, we'll just truncate if they're empty
            pg_cursor.execute(f"SELECT COUNT(*) as count FROM \"{table}\"")
            count = pg_cursor.fetchone()['count']
            if count == 0:
                try:
                    pg_cursor.execute(f"TRUNCATE TABLE \"{table}\" CASCADE")
                    pg_conn.commit()
                    print(f"  Truncated empty table {table}")
                except Exception as e:
                    pg_conn.rollback()
                    print(f"  Error truncating {table}: {str(e)}")
        
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
            
            # Add required fields that might be missing
            if table == 'experiences' and 'experience_type' not in transformed_row:
                transformed_row['experience_type'] = 'reflection'
            if table == 'strategies' and 'description' not in transformed_row:
                transformed_row['description'] = 'Migrated strategy'
            
            # Add user_id if the table has it but it's not in the row
            if has_user_id and 'user_id' not in transformed_row:
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

    # Update foreign key references
    print("\nUpdating foreign key references...")
    
    # Update goals.current_strategy_id
    try:
        pg_cursor.execute("""
            UPDATE goals g
            SET current_strategy_id = s.id
            FROM strategies s
            WHERE g.id = s.goal_id AND g.user_id = %s
        """, (supabase_user_id,))
        pg_conn.commit()
        print("  Updated goals.current_strategy_id")
    except Exception as e:
        pg_conn.rollback()
        print(f"  Error updating goals.current_strategy_id: {str(e)}")
    
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

print("\nMigration completed!")
print("Please check your Supabase database to verify the data was migrated correctly.")
