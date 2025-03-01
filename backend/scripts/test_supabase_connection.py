#!/usr/bin/env python3
"""
Script to test the connection to Supabase PostgreSQL database.
"""

import os
import sys
import psycopg2
from pathlib import Path
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

# Get Supabase user ID
supabase_user_id = os.getenv("SUPABASE_USER_ID")
if not supabase_user_id:
    print("Error: SUPABASE_USER_ID environment variable not set")
    print("Please set this to your Supabase user ID (UUID format)")
    print("You can find this in the Supabase dashboard under Authentication > Users")
    sys.exit(1)

print(f"Testing connection to Supabase PostgreSQL database...")
print(f"Supabase User ID: {supabase_user_id}")

try:
    # Connect to PostgreSQL
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    print("✅ Connected to PostgreSQL database successfully")
    
    # List tables
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    """)
    tables = [row[0] for row in cursor.fetchall()]
    print(f"Tables in database: {', '.join(tables)}")
    
    # Check if user exists
    cursor.execute("SELECT * FROM users WHERE id = %s", (supabase_user_id,))
    user = cursor.fetchone()
    if user:
        print(f"✅ User found with ID: {supabase_user_id}")
    else:
        print(f"❌ No user found with ID: {supabase_user_id}")
        print("You may need to create a user record in the database.")
        
        # Ask if user wants to create a user record
        create_user = input("Would you like to create a user record? (y/n): ")
        if create_user.lower() == 'y':
            email = input("Enter email address: ")
            full_name = input("Enter full name: ")
            
            cursor.execute(
                "INSERT INTO users (id, email, full_name) VALUES (%s, %s, %s)",
                (supabase_user_id, email, full_name)
            )
            conn.commit()
            print(f"✅ User created with ID: {supabase_user_id}")
    
    # Close connection
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error connecting to PostgreSQL: {e}")
    sys.exit(1)
