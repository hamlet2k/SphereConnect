# Copyright 2025 Federico Arce. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

"""
Test Data Purge Script for SphereConnect

This script safely removes test data created by test_data.py from the PostgreSQL database.
It respects foreign key constraints by deleting in the correct order.

Usage:
    python scripts/purge_test_data.py              # Interactive mode with confirmation
    python scripts/purge_test_data.py --force      # Skip confirmation prompts
    python scripts/purge_test_data.py --dry-run    # Show what would be deleted without actually deleting
"""

import sys
import os
import argparse
from typing import List, Dict, Any

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv

# Load environment variables from .env.local
env_local_path = os.path.join(os.path.dirname(__file__), '.env.local')
if os.path.exists(env_local_path):
    load_dotenv(env_local_path)
    print("✓ Loaded .env.local configuration")
else:
    print("Warning: .env.local file not found, using default database settings")

from sqlalchemy import create_engine, and_
from sqlalchemy.orm import sessionmaker
from app.core.models import Base, Guild, Objective, Task, AICommander, create_tables

def get_database_session():
    """Create and return database session"""
    # Database configuration from environment
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASS = os.getenv('DB_PASS', 'password')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME', 'sphereconnect')

    # Create PostgreSQL engine
    database_url = f'postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    engine = create_engine(database_url)

    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()

def find_test_data(session) -> Dict[str, List[Any]]:
    """Find all test data created by test_data.py and test_standalone.py"""
    test_data = {
        'guilds': [],
        'users': [],
        'commanders': [],
        'objectives': [],
        'tasks': []
    }

    # Find test guilds (by name patterns from both test scripts)
    test_guild_patterns = ['Test UEE Fleet', 'Test Guild']
    for pattern in test_guild_patterns:
        test_guilds = session.query(Guild).filter(Guild.name == pattern).all()
        test_data['guilds'].extend(test_guilds)

    # Find test users (by name pattern)
    test_users = session.query(User).filter(User.name == 'Test Pilot').all()
    test_data['users'] = test_users

    # Find test AI commanders
    for guild in test_data['guilds']:
        commanders = session.query(AICommander).filter(
            and_(AICommander.guild_id == guild.id, AICommander.name == 'UEE Commander')
        ).all()
        test_data['commanders'].extend(commanders)

    # Find test objectives (by various patterns)
    objective_patterns = ['Collect 500 SCU Gold', 'Mine Platinum Ore', 'Test Mission', 'Mining Operation', 'Patrol Mission']
    for guild in test_data['guilds']:
        for pattern in objective_patterns:
            objectives = session.query(Objective).filter(
                and_(Objective.guild_id == guild.id, Objective.name == pattern)
            ).all()
            test_data['objectives'].extend(objectives)

    # Find test tasks (by various patterns)
    task_patterns = ['Scout Route', 'Scout Location', 'Assigned Task', 'Sector Patrol']
    for objective in test_data['objectives']:
        for pattern in task_patterns:
            tasks = session.query(Task).filter(
                and_(Task.objective_id == objective.id, Task.name == pattern)
            ).all()
            test_data['tasks'].extend(tasks)

    # Remove duplicates
    for key in test_data:
        test_data[key] = list(set(test_data[key]))

    return test_data

def display_test_data(test_data: Dict[str, List[Any]]):
    """Display found test data"""
    print("\n" + "="*60)
    print("FOUND TEST DATA TO PURGE")
    print("="*60)

    for data_type, items in test_data.items():
        if items:
            print(f"\n📁 {data_type.upper()}: {len(items)} items")
            for i, item in enumerate(items, 1):
                if hasattr(item, 'name'):
                    print(f"  {i}. {item.name} (ID: {item.id})")
                else:
                    print(f"  {i}. ID: {item.id}")

    total_items = sum(len(items) for items in test_data.values())
    print(f"\n📊 Total items to delete: {total_items}")
    print("="*60)

def purge_test_data(session, test_data: Dict[str, List[Any]], dry_run: bool = False) -> int:
    """Purge test data in correct order (respecting foreign keys)"""
    deleted_count = 0

    try:
        # Delete in reverse order of creation (respecting foreign keys)
        # 1. Delete tasks first
        for task in test_data['tasks']:
            if not dry_run:
                session.delete(task)
                print(f"✓ Deleted task: {task.name} (ID: {task.id})")
            else:
                print(f"📋 Would delete task: {task.name} (ID: {task.id})")
            deleted_count += 1

        # 2. Delete objectives
        for objective in test_data['objectives']:
            if not dry_run:
                session.delete(objective)
                print(f"✓ Deleted objective: {objective.name} (ID: {objective.id})")
            else:
                print(f"📋 Would delete objective: {objective.name} (ID: {objective.id})")
            deleted_count += 1

        # 3. Delete AI commanders
        for commander in test_data['commanders']:
            if not dry_run:
                session.delete(commander)
                print(f"✓ Deleted AI Commander: {commander.name} (ID: {commander.id})")
            else:
                print(f"📋 Would delete AI Commander: {commander.name} (ID: {commander.id})")
            deleted_count += 1

        # 4. Delete users
        for user in test_data['users']:
            if not dry_run:
                session.delete(user)
                print(f"✓ Deleted user: {user.name} (ID: {user.id})")
            else:
                print(f"📋 Would delete user: {user.name} (ID: {user.id})")
            deleted_count += 1

        # 5. Delete guilds last
        for guild in test_data['guilds']:
            if not dry_run:
                session.delete(guild)
                print(f"✓ Deleted guild: {guild.name} (ID: {guild.id})")
            else:
                print(f"📋 Would delete guild: {guild.name} (ID: {guild.id})")
            deleted_count += 1

        if not dry_run:
            session.commit()
            print(f"\n✅ Successfully deleted {deleted_count} test data items!")
        else:
            print(f"\n📋 Dry run complete. Would delete {deleted_count} test data items.")

        return deleted_count

    except Exception as e:
        if not dry_run:
            session.rollback()
        print(f"❌ Error during purge: {e}")
        raise

def confirm_purge(test_data: Dict[str, List[Any]]) -> bool:
    """Ask user for confirmation before purging"""
    total_items = sum(len(items) for items in test_data.values())

    if total_items == 0:
        print("ℹ️  No test data found to purge.")
        return False

    print(f"\n⚠️  WARNING: This will permanently delete {total_items} test data items!")
    print("This action cannot be undone.")

    while True:
        response = input("\nAre you sure you want to continue? (yes/no): ").strip().lower()
        if response in ['yes', 'y']:
            return True
        elif response in ['no', 'n']:
            print("ℹ️  Purge cancelled by user.")
            return False
        else:
            print("Please enter 'yes' or 'no'.")

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Purge test data created by test_data.py')
    parser.add_argument('--force', action='store_true',
                       help='Skip confirmation prompts')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be deleted without actually deleting')

    args = parser.parse_args()

    print("🧹 SphereConnect Test Data Purge Script")
    print("=" * 50)

    if args.dry_run:
        print("📋 DRY RUN MODE - No data will actually be deleted")
    elif args.force:
        print("⚡ FORCE MODE - Skipping confirmation prompts")
    else:
        print("🔒 SAFE MODE - Will ask for confirmation before deleting")

    session = None
    try:
        # Get database session
        session = get_database_session()

        # Find test data
        test_data = find_test_data(session)

        # Display found data
        display_test_data(test_data)

        # Check if any data found
        total_items = sum(len(items) for items in test_data.values())
        if total_items == 0:
            print("\n🎉 No test data found. Database is clean!")
            return

        # Get user confirmation (unless forced or dry run)
        if not args.force and not args.dry_run:
            if not confirm_purge(test_data):
                return

        # Purge the data
        print(f"\n{'📋 Starting dry run...' if args.dry_run else '🗑️  Starting purge...'}")
        deleted_count = purge_test_data(session, test_data, dry_run=args.dry_run)

        # Final summary
        print("\n" + "="*60)
        if args.dry_run:
            print("DRY RUN SUMMARY")
        else:
            print("PURGE SUMMARY")
        print("="*60)
        print(f"Database: PostgreSQL ({os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5432')})")
        print(f"Items processed: {deleted_count}")
        if not args.dry_run:
            print("✅ Test data purge completed successfully!")
        else:
            print("📋 Dry run completed - no data was actually deleted")
        print("="*60)

    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    finally:
        if session:
            session.close()

if __name__ == "__main__":
    main()
