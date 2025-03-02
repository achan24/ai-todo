import psycopg2
import sys

# Connection string - correct format for Supabase
CONNECTION_STRING = "postgresql://postgres:vuwkos-vuxqib-2kUxqy@db.sxxmndojffcuaghbgrxj.supabase.co:5432/postgres?sslmode=require"

print(f"Testing connection to: {CONNECTION_STRING}")

try:
    # Try to establish a connection
    conn = psycopg2.connect(CONNECTION_STRING)
    
    # Create a cursor
    cursor = conn.cursor()
    
    # Execute a simple query
    cursor.execute("SELECT 1 AS connection_test")
    
    # Fetch the result
    result = cursor.fetchone()
    
    # Close cursor and connection
    cursor.close()
    conn.close()
    
    print(f"Connection successful! Result: {result[0]}")
    sys.exit(0)
except Exception as e:
    print(f"Connection failed with error: {e}")
    sys.exit(1)
