#!/usr/bin/env python3
"""
Fix User Sessions Schema Migration
Updates the user_sessions table to auto-generate UUIDs for the id column
"""

import os
import sys
from sqlalchemy import create_engine, text

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def fix_user_sessions_schema():
    """Apply schema fix to existing database"""

    # Database configuration
    env_local_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    if os.path.exists(env_local_path):
        try:
            from dotenv import load_dotenv
            load_dotenv(env_local_path)
        except ImportError:
            pass

    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASS = os.getenv('DB_PASS', 'password')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME', 'sphereconnect')

    DATABASE_URL = f'postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}'

    try:
        print("Connecting to database...")
        engine = create_engine(DATABASE_URL)

        with engine.connect() as conn:
            # Enable UUID extension
            print("Enabling uuid-ossp extension...")
            conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
            conn.commit()

            # Check if user_sessions table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'user_sessions'
                );
            """))

            if result.fetchone()[0]:
                print("Checking user_sessions table structure...")

                # Check current column definition
                result = conn.execute(text("""
                    SELECT column_default
                    FROM information_schema.columns
                    WHERE table_name = 'user_sessions' AND column_name = 'id';
                """))

                current_default = result.fetchone()[0]

                if current_default is None:
                    print("id column missing DEFAULT - applying fix...")

                    # Add default to existing table
                    conn.execute(text("""
                        ALTER TABLE user_sessions
                        ALTER COLUMN id SET DEFAULT gen_random_uuid();
                    """))
                    conn.commit()
                    print("Successfully added DEFAULT gen_random_uuid() to id column")
                else:
                    print("id column already has DEFAULT set correctly")
            else:
                print("user_sessions table doesn't exist - will be created with new schema")

            print("Schema fix completed successfully!")

    except Exception as e:
        print(f"❌ Schema fix failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True

if __name__ == "__main__":
    print("SphereConnect User Sessions Schema Fix")
    print("=" * 50)

    success = fix_user_sessions_schema()

    if success:
        print("\nFix applied successfully!")
        print("The user_sessions table now auto-generates UUIDs for the id column.")
        print("Login functionality should work without NotNullViolation errors.")
    else:
        print("\nFix failed!")
        sys.exit(1)