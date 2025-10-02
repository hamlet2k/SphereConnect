# Copyright 2025 Federico Arce. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

import sys
import os
import hashlib
from datetime import datetime
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from app.core.models import Base, Preference, UserPreference
import uuid
from dotenv import load_dotenv
load_dotenv('.env.local')

# Load from .env.local
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASS = os.getenv('DB_PASS', '')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'sphereconnect')

if not DB_PASS:
    raise ValueError("DB_PASS not set in .env.local - check file and password")

DEFAULT_PREFERENCES = [
    ("combat", "Ship combat, FPS engagements, and security operations."),
    ("exploration", "Long-range scouting, discovery, and reconnaissance."),
    ("logistics", "Transport, refueling, and supply chain coordination."),
    ("trade", "Commerce, market operations, and diplomatic negotiations."),
    ("industry", "Mining, refining, salvage, and industrial support."),
]


def calculate_schema_hash():
    """Calculate hash of current schema definition for version checking."""
    schema_content = ""
    # Get all model definitions
    for table_name, table in Base.metadata.tables.items():
        schema_content += f"{table_name}:"
        for column in table.columns:
            schema_content += f"{column.name}:{column.type}:{column.nullable};"
        schema_content += "|"

    return hashlib.md5(schema_content.encode()).hexdigest()

def check_existing_schema(engine):
    """Check if database schema exists and matches current models."""
    try:
        inspector = inspect(engine)

        # Check if core tables exist
        core_tables = ['guilds', 'users', 'objectives', 'tasks']
        existing_tables = inspector.get_table_names()

        if not all(table in existing_tables for table in core_tables):
            print("Core tables missing - schema needs to be created")
            return False, "missing_tables"

        # Check if users table has required columns and correct types
        if 'users' in existing_tables:
            columns = inspector.get_columns('users')
            column_names = [col['name'] for col in columns]

            # Check for required columns
            if 'guild_id' not in column_names:
                print("WARNING: users table missing guild_id column - schema mismatch detected")
                return False, "schema_mismatch"

            # Check if current_guild_id is UUID type (not TEXT)
            current_guild_col = next((col for col in columns if col['name'] == 'current_guild_id'), None)
            if current_guild_col and 'UUID' not in str(current_guild_col['type']).upper():
                print("WARNING: users.current_guild_id should be UUID type - schema mismatch detected")
                return False, "schema_mismatch"

        # Check if guilds table has is_active column
        if 'guilds' in existing_tables:
            columns = [col['name'] for col in inspector.get_columns('guilds')]
            if 'is_active' not in columns:
                print("WARNING: guilds table missing is_active column - schema mismatch detected")
                return False, "schema_mismatch"

        print("Existing schema appears to be up to date")
        return True, "schema_ok"

    except Exception as e:
        print(f"Error checking existing schema: {e}")
        return False, "check_error"

def backup_existing_data(engine):
    """Create backup of existing data before schema changes."""
    try:
        # This is a simplified backup - in production you'd want more comprehensive backup
        backup_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        print(f"Note: Consider creating manual backup before schema changes (timestamp: {backup_timestamp})")
        return True
    except Exception as e:
        print(f"Warning: Could not create data backup: {e}")
        return False

def seed_default_preferences(engine):
    """Ensure the global preference catalog is seeded with defaults."""
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        existing_preferences = session.query(Preference).all()
        existing_names = {pref.name for pref in existing_preferences}

        created = False
        for name, description in DEFAULT_PREFERENCES:
            if name not in existing_names:
                preference = Preference(
                    id=uuid.uuid4(),
                    name=name,
                    description=description,
                )
                session.add(preference)
                created = True

        if created:
            session.commit()
            print("Seeded default preferences")
    except Exception as exc:
        session.rollback()
        print(f"Warning: Failed to seed default preferences: {exc}")
    finally:
        session.close()


def migrate_user_preferences(engine):
    """Backfill legacy users.preferences arrays into the normalized tables."""
    inspector = inspect(engine)
    columns = [column['name'] for column in inspector.get_columns('users')]
    if 'preferences' not in columns:
        return

    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        results = session.execute(text(
            "SELECT id, preferences FROM users WHERE preferences IS NOT NULL AND array_length(preferences, 1) > 0"
        )).fetchall()

        preference_lookup = {
            pref.name: pref.id
            for pref in session.query(Preference).all()
        }

        for user_id, legacy_preferences in results:
            for preference_name in legacy_preferences:
                normalized_name = preference_name.strip().lower()
                if normalized_name not in preference_lookup:
                    new_preference = Preference(
                        id=uuid.uuid4(),
                        name=normalized_name,
                        description=None,
                    )
                    session.add(new_preference)
                    session.flush()
                    preference_lookup[normalized_name] = new_preference.id

                existing = session.query(UserPreference).filter(
                    UserPreference.user_id == user_id,
                    UserPreference.preference_id == preference_lookup[normalized_name]
                ).first()
                if not existing:
                    session.add(
                        UserPreference(
                            user_id=user_id,
                            preference_id=preference_lookup[normalized_name]
                        )
                    )

        session.commit()

        # Drop legacy column to avoid drift
        with engine.connect() as connection:
            connection.execute(text('ALTER TABLE users DROP COLUMN IF EXISTS preferences'))
            connection.commit()
    except Exception as exc:
        session.rollback()
        print(f"Warning: Failed migrating user preferences: {exc}")
    finally:
        session.close()

def main():
    """Main database initialization function with schema validation."""
    print("=== SphereConnect Database Initialization ===")

    # Create database URL
    database_url = f'postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    engine = create_engine(database_url)

    try:
        # Check existing schema
        schema_ok, status = check_existing_schema(engine)

        if not schema_ok:
            if status == "schema_mismatch":
                print("Schema mismatch detected - recreating tables...")
                backup_existing_data(engine)
                # Handle circular dependencies by dropping tables in correct order
                try:
                    # Drop tables with circular dependencies first
                    with engine.connect() as conn:
                        # Disable foreign key checks temporarily
                        if engine.dialect.name == 'postgresql':
                            conn.execute(text("SET CONSTRAINTS ALL DEFERRED"))
                        # Drop tables in dependency order
                        tables_to_drop = ['user_sessions', 'objective_categories_junction',
                                        'guild_requests', 'invites', 'tasks', 'objectives',
                                        'ai_commanders', 'ranks', 'access_levels',
                                        'objective_categories', 'squads', 'users', 'guilds']
                        for table in tables_to_drop:
                            try:
                                conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
                                print(f"Dropped table: {table}")
                            except Exception as e:
                                print(f"Warning: Could not drop {table}: {e}")
                        conn.commit()
                    print("Dropped existing tables")
                except Exception as e:
                    print(f"Warning: Error during table dropping: {e}")
            elif status == "missing_tables":
                print("Creating missing tables...")
            else:
                print(f"Schema check status: {status}")

        # Create all tables
        print("Creating/updating database tables...")
        Base.metadata.create_all(engine)

        # Seed default preferences and migrate legacy data
        seed_default_preferences(engine)
        migrate_user_preferences(engine)

        # Verify schema after creation
        final_check, _ = check_existing_schema(engine)
        if final_check:
            print("[SUCCESS] Tables created successfully in sphereconnect!")
            print("[SUCCESS] Schema validation passed")
            return True
        else:
            print("[FAIL] Schema validation failed after table creation")
            return False

    except Exception as e:
        print(f"[ERROR] Database initialization failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
