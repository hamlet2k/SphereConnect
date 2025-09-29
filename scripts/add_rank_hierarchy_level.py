#!/usr/bin/env python3
"""
Add Rank Hierarchy Level Column Migration
Adds hierarchy_level column to ranks table to support rank hierarchy functionality
"""

import os
import sys
from sqlalchemy import create_engine, text

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def add_rank_hierarchy_level():
    """Apply schema migration to add hierarchy_level column to ranks table"""

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
            # Check if ranks table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'ranks'
                );
            """))

            if result.fetchone()[0]:
                print("Checking ranks table structure...")

                # Check if hierarchy_level column exists
                result = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'ranks' AND column_name = 'hierarchy_level'
                    );
                """))

                if not result.fetchone()[0]:
                    print("Adding hierarchy_level column...")
                    # Add hierarchy_level column as nullable first
                    conn.execute(text("""
                        ALTER TABLE ranks
                        ADD COLUMN hierarchy_level INTEGER;
                    """))
                    conn.commit()

                    # Set default hierarchy_level for existing ranks (CO = 1, others = 2)
                    conn.execute(text("""
                        UPDATE ranks
                        SET hierarchy_level = CASE
                            WHEN name = 'CO' THEN 1
                            ELSE 2
                        END
                        WHERE hierarchy_level IS NULL;
                    """))
                    conn.commit()

                    # Now make it not null
                    conn.execute(text("""
                        ALTER TABLE ranks
                        ALTER COLUMN hierarchy_level SET NOT NULL;
                    """))
                    conn.commit()
                    print("Hierarchy level column added successfully")
                else:
                    print("Hierarchy level column already exists")

                print("Successfully updated ranks table schema")
            else:
                print("ranks table doesn't exist - will be created with correct schema")

            print("Schema migration completed successfully!")

    except Exception as e:
        print(f"Schema migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True

if __name__ == "__main__":
    print("SphereConnect Rank Hierarchy Level Migration")
    print("=" * 50)

    success = add_rank_hierarchy_level()

    if success:
        print("\nMigration applied successfully!")
        print("The ranks table now has hierarchy_level column.")
        print("Rank hierarchy functionality should work without column errors.")
    else:
        print("\nMigration failed!")
        sys.exit(1)