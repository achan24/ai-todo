#!/usr/bin/env python3
"""
Check Database Configuration

This script checks which database your application is configured to use.
It prints the current DATABASE_URL and whether it's using Supabase or SQLite.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))

# Get DATABASE_URL
database_url = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")

print("Current DATABASE_URL:", database_url)

if database_url.startswith("postgresql"):
    print("✅ Your application is configured to use Supabase PostgreSQL")
else:
    print("⚠️ Your application is configured to use SQLite")
    print("To use Supabase, set DATABASE_URL to your Supabase PostgreSQL connection string")
    print("Example: postgresql://postgres:password@db.example.supabase.co:5432/postgres")

# Check if other Supabase environment variables are set
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase_jwt = os.getenv("SUPABASE_JWT_SECRET")

print("\nOther Supabase configuration:")
print(f"SUPABASE_URL: {'✅ Set' if supabase_url else '❌ Not set'}")
print(f"SUPABASE_SERVICE_KEY: {'✅ Set' if supabase_key else '❌ Not set'}")
print(f"SUPABASE_JWT_SECRET: {'✅ Set' if supabase_jwt else '❌ Not set'}")

print("\nFor deployment, make sure to set these environment variables in your deployment platform.")
