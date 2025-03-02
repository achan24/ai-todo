#!/usr/bin/env python3
"""
Check Supabase Tables

This script connects to your Supabase PostgreSQL database and:
1. Lists all tables in the database
2. Shows the row count for each table
3. Displays sample data from each table (first 5 rows)
"""

import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from tabulate import tabulate

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))

# Get DATABASE_URL
database_url = os.getenv("DATABASE_URL")

if not database_url or not database_url.startswith("postgresql"):
    print("Error: DATABASE_URL is not set or is not a PostgreSQL connection string")
    print("Please set DATABASE_URL in your backend/.env file")
    sys.exit(1)

try:
    # Connect to the database
    print(f"Connecting to Supabase PostgreSQL database...")
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # Get all tables in the public schema
    print("\n=== Tables in your Supabase database ===")
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    """)
    tables = [record['table_name'] for record in cursor.fetchall()]
    
    if not tables:
        print("No tables found in the public schema.")
        sys.exit(0)
    
    # Get row counts for each table
    table_stats = []
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) as count FROM \"{table}\"")
        count = cursor.fetchone()['count']
        table_stats.append([table, count])
    
    # Print table statistics
    print(tabulate(table_stats, headers=["Table Name", "Row Count"], tablefmt="grid"))
    
    # Show sample data from each table
    for table in tables:
        print(f"\n=== Sample data from '{table}' table (up to 5 rows) ===")
        try:
            cursor.execute(f"SELECT * FROM \"{table}\" LIMIT 5")
            records = cursor.fetchall()
            
            if not records:
                print(f"No data in table '{table}'")
                continue
                
            # Get column names
            columns = list(records[0].keys())
            
            # Prepare data for tabulate
            data = [[record[col] for col in columns] for record in records]
            
            # Print the data
            print(tabulate(data, headers=columns, tablefmt="grid"))
        except Exception as e:
            print(f"Error fetching data from '{table}': {str(e)}")
    
except Exception as e:
    print(f"Error: {str(e)}")
    sys.exit(1)
finally:
    if 'conn' in locals():
        conn.close()
