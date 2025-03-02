#!/usr/bin/env python3
"""
Script to migrate data from SQLite to Supabase PostgreSQL.
This script:
1. Reads data from the local SQLite database
2. Inserts it into the Supabase PostgreSQL database
3. Handles table relationships and foreign keys
"""

import os
import sys
import json
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
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

# Define the order of tables to migrate (to handle foreign key dependencies)
# This is a simplified approach - adjust based on your actual table dependencies
table_order = [
    "users",           # Users should be first as they're referenced by other tables
    "goals",           # Goals might reference users
    "tasks",           # Tasks might reference users and goals
    "task_categories", # Categories might reference users
    "task_tags",       # Tags might reference users
    "task_tag_associations", # Associations reference tasks and tags
    "notes",           # Notes might reference tasks
    "reminders",       # Reminders might reference tasks
    "activity_logs",   # Logs might reference users and tasks
]

# Add any tables not explicitly ordered to the end
for table in tables:
    if table not in table_order:
        table_order.append(table)

# Process each table in order
for table in table_order:
    if table not in tables:
        continue  # Skip if table doesn't exist in SQLite
        
    print(f"\nMigrating table: {table}")
    
    # Get data from SQLite
    sqlite_cursor.execute(f"SELECT * FROM {table}")
    rows = [dict(row) for row in sqlite_cursor.fetchall()]
    
    if not rows:
        print(f"  No data in table {table}, skipping")
        continue
        
    print(f"  Found {len(rows)} rows to migrate")
    
    # Get column names from the first row
    columns = list(rows[0].keys())
    
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
    
    # Get PostgreSQL table columns
    pg_cursor.execute(f"""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = '{table}';
    """)
    pg_columns = [row['column_name'] for row in pg_cursor.fetchall()]
    
    # Filter columns to only include those that exist in PostgreSQL
    valid_columns = [col for col in columns if col.lower() in [c.lower() for c in pg_columns]]
    
    if not valid_columns:
        print(f"  No matching columns found for table {table}, skipping")
        continue
        
    print(f"  Using columns: {', '.join(valid_columns)}")
    
    # Prepare data for insertion
    values = [[row[col] for col in valid_columns] for row in rows]
    
    # Insert data into PostgreSQL
    try:
        # First, check if there's already data in the table
        pg_cursor.execute(f"SELECT COUNT(*) as count FROM \"{table}\"")
        existing_count = pg_cursor.fetchone()['count']
        
        if existing_count > 0:
            print(f"  Warning: Table {table} already has {existing_count} rows")
            confirm = input(f"  Do you want to proceed with inserting data into {table}? (y/n): ")
            if confirm.lower() != 'y':
                print(f"  Skipping table {table}")
                continue
        
        # Build the INSERT query
        columns_str = ', '.join([f'"{col}"' for col in valid_columns])
        placeholders = ', '.join(['%s' for _ in valid_columns])
        
        # Use execute_values for better performance
        query = f'INSERT INTO "{table}" ({columns_str}) VALUES %s'
        execute_values(pg_cursor, query, values, template=None, page_size=100)
        
        pg_conn.commit()
        print(f"  Successfully migrated {len(rows)} rows to {table}")
    except Exception as e:
        pg_conn.rollback()
        print(f"  Error inserting data into {table}: {str(e)}")

# Close connections
sqlite_conn.close()
pg_conn.close()

print("\nMigration completed!")
print("Please check your Supabase database to verify the data was migrated correctly.")
