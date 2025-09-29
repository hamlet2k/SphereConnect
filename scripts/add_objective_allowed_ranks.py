#!/usr/bin/env python3
"""
Migration script to add allowed_ranks column to objectives table.
This column stores an array of rank UUIDs that are allowed to view the objective.
"""

import os
import sys
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Load environment variables
load_dotenv()

def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'sphereconnect'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'ricota12')
    )

def add_allowed_ranks_column():
    """Add allowed_ranks column to objectives table"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if column already exists
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'objectives' AND column_name = 'allowed_ranks'
        """)

        if cursor.fetchone():
            print("allowed_ranks column already exists in objectives table")
            return

        # Add the allowed_ranks column
        print("Adding allowed_ranks column to objectives table...")
        cursor.execute("""
            ALTER TABLE objectives
            ADD COLUMN allowed_ranks UUID[] DEFAULT '{}'
        """)

        conn.commit()
        print("Successfully added allowed_ranks column to objectives table")

    except Exception as e:
        print(f"Error adding allowed_ranks column: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("Starting migration: Add allowed_ranks column to objectives table")
    add_allowed_ranks_column()
    print("Migration completed successfully!")