#!/usr/bin/env python3
"""
Script to backup SQLite database to JSON files.
This creates a backup of all data in your database that can be restored later.
"""

import json
import os
import sys
import sqlite3
from datetime import datetime
from pathlib import Path

# Add the parent directory to sys.path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

# Create backup directory
backup_dir = Path(__file__).parent.parent / "data_backup" / datetime.now().strftime("%Y%m%d_%H%M%S")
backup_dir.mkdir(parents=True, exist_ok=True)

# Connect to SQLite database
db_path = Path(__file__).parent.parent / "sql_app.db"
conn = sqlite3.connect(str(db_path))
conn.row_factory = sqlite3.Row

# Get all tables
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [row[0] for row in cursor.fetchall()]

print(f"Found {len(tables)} tables: {', '.join(tables)}")

# Export each table to JSON
for table in tables:
    print(f"Backing up table: {table}")
    cursor.execute(f"SELECT * FROM {table}")
    rows = [dict(row) for row in cursor.fetchall()]
    
    # Save to JSON file
    output_file = backup_dir / f"{table}.json"
    with open(output_file, 'w') as f:
        json.dump(rows, f, indent=2, default=str)
    
    print(f"  Exported {len(rows)} rows to {output_file}")

conn.close()

# Create a metadata file with backup info
metadata = {
    "backup_date": datetime.now().isoformat(),
    "tables": tables,
    "db_path": str(db_path),
    "row_counts": {table: len(json.loads(open(backup_dir / f"{table}.json").read())) for table in tables}
}

with open(backup_dir / "metadata.json", 'w') as f:
    json.dump(metadata, f, indent=2)

print(f"\nBackup completed successfully to {backup_dir}")
print("Summary:")
for table, count in metadata["row_counts"].items():
    print(f"  {table}: {count} rows")
