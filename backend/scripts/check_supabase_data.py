#!/usr/bin/env python3
"""
Script to check data in Supabase PostgreSQL database.
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from pathlib import Path
from dotenv import load_dotenv
from tabulate import tabulate

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

# Get Supabase user ID
supabase_user_id = os.getenv("SUPABASE_USER_ID")
if not supabase_user_id:
    print("Error: SUPABASE_USER_ID is not set")
    print("Please set SUPABASE_USER_ID in your .env file")
    sys.exit(1)

# Connect to Supabase PostgreSQL database
try:
    print(f"Connecting to Supabase PostgreSQL database...")
    pg_conn = psycopg2.connect(database_url)
    pg_cursor = pg_conn.cursor(cursor_factory=RealDictCursor)
except Exception as e:
    print(f"Error connecting to PostgreSQL: {str(e)}")
    sys.exit(1)

# Tables to check
tables = ["goals", "tasks", "strategies", "metrics", "experiences", "conversations", "conversation_messages"]

# Check each table
for table in tables:
    print(f"\nChecking table: {table}")
    
    # Check if table has user_id column
    pg_cursor.execute(f"""
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = '{table}'
        AND column_name = 'user_id';
    """)
    has_user_id = pg_cursor.fetchone() is not None
    
    # Query data
    if has_user_id:
        pg_cursor.execute(f"SELECT COUNT(*) as count FROM \"{table}\" WHERE user_id = %s", (supabase_user_id,))
        count = pg_cursor.fetchone()['count']
        print(f"  Records for your user: {count}")
        
        if count > 0:
            # Show a sample of records
            pg_cursor.execute(f"SELECT * FROM \"{table}\" WHERE user_id = %s LIMIT 3", (supabase_user_id,))
            rows = pg_cursor.fetchall()
            if rows:
                # Get column names
                columns = rows[0].keys()
                # Convert rows to list of lists
                data = [[row[col] for col in columns] for row in rows]
                print("\n  Sample data:")
                print(tabulate(data, headers=columns, tablefmt="grid"))
    else:
        pg_cursor.execute(f"SELECT COUNT(*) as count FROM \"{table}\"")
        count = pg_cursor.fetchone()['count']
        print(f"  Total records: {count}")
        
        if count > 0:
            # Show a sample of records
            pg_cursor.execute(f"SELECT * FROM \"{table}\" LIMIT 3")
            rows = pg_cursor.fetchall()
            if rows:
                # Get column names
                columns = rows[0].keys()
                # Convert rows to list of lists
                data = [[row[col] for col in columns] for row in rows]
                print("\n  Sample data:")
                print(tabulate(data, headers=columns, tablefmt="grid"))

# Close connection
pg_conn.close()

print("\nData check completed!")
