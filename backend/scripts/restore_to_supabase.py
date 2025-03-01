#!/usr/bin/env python3
"""
Script to restore data from JSON backup to Supabase PostgreSQL database.
This transforms the data to match the Supabase schema and imports it.
"""

import json
import os
import sys
import uuid
import psycopg2
import psycopg2.extras
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Add the parent directory to sys.path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

# Get database connection details from environment
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("Error: DATABASE_URL environment variable not set")
    sys.exit(1)

# Get Supabase user ID (this will be the owner of all data)
supabase_user_id = os.getenv("SUPABASE_USER_ID")
if not supabase_user_id:
    print("Error: SUPABASE_USER_ID environment variable not set")
    print("Please set this to your Supabase user ID (UUID format)")
    print("You can find this in the Supabase dashboard under Authentication > Users")
    sys.exit(1)

# Parse the backup directory from command line or use the most recent one
if len(sys.argv) > 1:
    backup_dir = Path(sys.argv[1])
else:
    # Find the most recent backup
    backup_base = Path(__file__).parent.parent / "data_backup"
    if not backup_base.exists():
        print(f"Error: Backup directory {backup_base} does not exist")
        sys.exit(1)
    
    backup_dirs = sorted(backup_base.glob("*"), key=os.path.getmtime, reverse=True)
    if not backup_dirs:
        print(f"Error: No backups found in {backup_base}")
        sys.exit(1)
    
    backup_dir = backup_dirs[0]

print(f"Using backup from: {backup_dir}")

# Load metadata
try:
    with open(backup_dir / "metadata.json") as f:
        metadata = json.load(f)
    print(f"Backup from: {metadata['backup_date']}")
    print(f"Tables: {', '.join(metadata['tables'])}")
except (FileNotFoundError, json.JSONDecodeError) as e:
    print(f"Error loading metadata: {e}")
    sys.exit(1)

# Connect to PostgreSQL
try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = False
    cursor = conn.cursor()
    print("Connected to PostgreSQL database")
except Exception as e:
    print(f"Error connecting to PostgreSQL: {e}")
    sys.exit(1)

# Function to transform data for Supabase
def transform_data(table_name, rows):
    """Transform data to match Supabase schema"""
    transformed = []
    
    for row in rows:
        # Make a copy of the row to modify
        new_row = dict(row)
        
        # Handle user_id fields (replace with Supabase user ID)
        if "user_id" in new_row:
            new_row["user_id"] = supabase_user_id
        
        # Handle date fields (ensure proper format for PostgreSQL)
        date_fields = ["created_at", "updated_at", "due_date", "completion_time"]
        for field in date_fields:
            if field in new_row and new_row[field] is not None:
                # Try to parse the date if it's a string
                if isinstance(new_row[field], str):
                    try:
                        # Keep ISO format as is
                        if 'T' in new_row[field] and ('+' in new_row[field] or 'Z' in new_row[field]):
                            pass
                        else:
                            # Convert to ISO format
                            dt = datetime.fromisoformat(new_row[field].replace('Z', '+00:00'))
                            new_row[field] = dt.isoformat()
                    except ValueError:
                        # If parsing fails, use current time
                        new_row[field] = datetime.now().isoformat()
        
        # Handle JSON fields
        json_fields = ["tags", "contributions_list"]
        for field in json_fields:
            if field in new_row and new_row[field] is not None:
                if isinstance(new_row[field], str):
                    try:
                        # Try to parse JSON string
                        new_row[field] = json.loads(new_row[field])
                    except json.JSONDecodeError:
                        # If parsing fails, use empty list
                        new_row[field] = []
        
        transformed.append(new_row)
    
    return transformed

# Define table dependencies for proper order
table_dependencies = {
    "goals": ["strategies"],
    "tasks": ["goals", "metrics"],
    "metrics": ["goals"],
    "strategies": [],
    "experiences": ["goals", "tasks"],
    "conversations": [],
    "conversation_messages": ["conversations"],
}

# Skip these tables
skip_tables = ["alembic_version", "users"]

# Process tables in dependency order
processed_tables = set(skip_tables)
all_tables = set(metadata["tables"]) - set(skip_tables)

# Check which tables exist in the database
cursor.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
""")
existing_tables = {row[0] for row in cursor.fetchall()}
print(f"Existing tables in database: {', '.join(existing_tables)}")

# Filter tables to only include those that exist in the database
all_tables = all_tables.intersection(existing_tables)
print(f"Tables to process: {', '.join(all_tables)}")

# Process tables until all are processed
while all_tables - processed_tables:
    for table in all_tables - processed_tables:
        # Check if all dependencies are processed
        if all(dep in processed_tables for dep in table_dependencies.get(table, [])):
            try:
                print(f"Processing table: {table}")
                
                # Load data
                with open(backup_dir / f"{table}.json") as f:
                    rows = json.load(f)
                
                if not rows:
                    print(f"  No data in table {table}, skipping")
                    processed_tables.add(table)
                    continue
                
                # Transform data
                transformed = transform_data(table, rows)
                
                # Clear existing data
                cursor.execute(f"DELETE FROM {table}")
                
                # Get columns dynamically
                cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}' AND table_schema = 'public'")
                db_columns = [row[0] for row in cursor.fetchall()]
                
                # Filter row data to only include columns that exist in the database
                for row in transformed:
                    row_columns = list(row.keys())
                    for col in row_columns:
                        if col not in db_columns:
                            del row[col]
                
                if not transformed:
                    print(f"  No valid data for table {table}, skipping")
                    processed_tables.add(table)
                    continue
                
                # Insert data
                columns = transformed[0].keys()
                placeholders = ", ".join(["%s"] * len(columns))
                insert_query = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders})"
                
                for row in transformed:
                    values = [row[col] for col in columns]
                    try:
                        cursor.execute(insert_query, values)
                    except Exception as e:
                        print(f"  Error inserting row: {e}")
                        print(f"  Row data: {row}")
                        conn.rollback()
                        break
                
                # Reset sequence to max id + 1
                cursor.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM {table}")
                
                print(f"  Inserted {len(transformed)} rows into {table}")
                processed_tables.add(table)
            
            except Exception as e:
                print(f"Error processing table {table}: {e}")
                conn.rollback()
                sys.exit(1)
    
    # Check if we're stuck in a loop
    if not all_tables - processed_tables:
        break
    
    remaining = all_tables - processed_tables
    if remaining == all_tables:
        print(f"Error: Could not process remaining tables due to circular dependencies: {remaining}")
        sys.exit(1)

# Commit the transaction
conn.commit()
print("Data migration completed successfully")
cursor.close()
conn.close()
