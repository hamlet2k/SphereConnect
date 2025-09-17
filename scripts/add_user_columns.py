#!/usr/bin/env python3
"""
Add User Columns Migration
Adds username and email columns to users table to match updated SQLAlchemy model
"""

import os
import sys
from sqlalchemy import create_engine, text

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def add_user_columns():
    """Apply schema migration to add missing columns to existing database"""

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

                if not result.fetchone()[0]:
                    print("Adding username column...")
                    # First add as nullable
                    conn.execute(text("""
                        ALTER TABLE users
                        ADD COLUMN username TEXT;
                    """))
                    conn.commit()

                    # Generate unique usernames for existing users based on their name
                    conn.execute(text("""
                        UPDATE users
                        SET username = LOWER(REPLACE(name, ' ', '')) || '_' || id::text
                        WHERE username IS NULL;
                    """))
                    conn.commit()

                    # Now make it unique and not null
                    conn.execute(text("""
                        ALTER TABLE users
                        ALTER COLUMN username SET NOT NULL,
                        ADD CONSTRAINT users_username_key UNIQUE (username);
                    """))
                    conn.commit()
                    print("Username column added successfully")
                else:
                    print("Username column already exists")

                # Check if email column exists
                result = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'users' AND column_name = 'email'
                    );
                """))

                if not result.fetchone()[0]:
                    print("Adding email column...")
                    conn.execute(text("""
                        ALTER TABLE users
                        ADD COLUMN email TEXT UNIQUE;
                    """))
                    conn.commit()
                    print("Email column added successfully")
                else:
                    print("Email column already exists")

                print("Successfully updated users table schema")
            else:
                print("users table doesn't exist - will be created with correct schema")

            print("Schema migration completed successfully!")

    except Exception as e:
        print(f"Schema migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True

if __name__ == "__main__":
    print("SphereConnect User Schema Migration")
    print("=" * 40)

    success = add_user_columns()

    if success:
        print("\nMigration applied successfully!")
        print("The users table now has username and email columns.")
        print("Authentication should work without column errors.")
    else:
        print("\nMigration failed!")
        sys.exit(1)