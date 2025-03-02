#!/bin/bash

# Export the Supabase DATABASE_URL using the working connection string from test_db_connection.py
export DATABASE_URL="postgresql://postgres:vuwkos-vuxqib-2kUxqy@db.sxxmndojffcuaghbgrxj.supabase.co:5432/postgres?sslmode=require"

# Start the backend server with the environment variable
uvicorn app.main:app --reload --port 3005
