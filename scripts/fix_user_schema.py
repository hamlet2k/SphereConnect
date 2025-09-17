#!/usr/bin/env python3
"""
Fix User Schema Migration
Removes username and email columns from users table to match SQLAlchemy model
"""

import os
import sys
from sqlalchemy import create_engine, text

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def fix_user_schema():
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
            # Check if users table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'users'
                );
            """))

            if result.fetchone()[0]:
                print("Checking users table structure...")

                # Check if username column exists
                result = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'users' AND column_name = 'username'
                    );
                """))

                if result.fetchone()[0]:
                    print("Removing username column...")
                    conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS username;"))
                    conn.commit()

                # Check if email column exists
                result = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'users' AND column_name = 'email'
                    );
                """))

                if result.fetchone()[0]:
                    print("Removing email column...")
                    conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS email;"))
                    conn.commit()

                print("Successfully updated users table schema")
            else:
                print("users table doesn't exist - will be created with correct schema")

            print("Schema fix completed successfully!")

    except Exception as e:
        print(f"❌ Schema fix failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True

if __name__ == "__main__":
    print("SphereConnect User Schema Fix")
    print("=" * 40)

    success = fix_user_schema()

    if success:
        print("\nFix applied successfully!")
        print("The users table now matches the SQLAlchemy model.")
        print("Test data seeding should work without column errors.")
    else:
        print("\nFix failed!")
        sys.exit(1)