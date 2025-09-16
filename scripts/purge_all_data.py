#!/usr/bin/env python3
# Copyright 2025 Federico Arce. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

"""
Complete Database Purge Script for SphereConnect
DANGER: This script removes ALL data from the database!

This script completely wipes the database clean by dropping all tables
and recreating them. Use with extreme caution!

Usage:
    python scripts/purge_all_data.py              # Interactive mode with confirmation
    python scripts/purge_all_data.py --force      # Skip confirmation prompts
    python scripts/purge_all_data.py --dry-run    # Show what would be done without actually doing it

WARNING: This will permanently delete ALL data in the database!
"""

import sys
import os
import argparse
from typing import List

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

from sqlalchemy import create_engine, MetaData, Table
from app.core.models import Base, create_tables

def get_database_engine():
    """Create and return database engine"""
    # Database configuration from environment
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASS = os.getenv('DB_PASS', 'password')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME', 'sphereconnect')

    # Create PostgreSQL engine
    database_url = f'postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    engine = create_engine(database_url)
    return engine

def get_all_table_names(engine) -> List[str]:
    """Get all table names from the database"""
    metadata = MetaData()
    metadata.reflect(bind=engine)
    return list(metadata.tables.keys())

def purge_all_data(engine, dry_run: bool = False) -> int:
    """Purge all data by dropping and recreating all tables"""
    try:
        # Get all table names
        table_names = get_all_table_names(engine)

        if not table_names:
            print("ℹ️  Database is already empty.")
            return 0

        print(f"📋 Found {len(table_names)} tables: {', '.join(table_names)}")

        if dry_run:
            print("📋 DRY RUN: Would drop and recreate all tables")
            return len(table_names)

        # Drop all tables
        print("🗑️  Dropping all tables...")
        metadata = MetaData()
        metadata.reflect(bind=engine)

        # Drop tables in reverse dependency order
        for table_name in reversed(table_names):
            if table_name in metadata.tables:
                table = metadata.tables[table_name]
                table.drop(engine, checkfirst=True)
                print(f"✓ Dropped table: {table_name}")

        # Recreate all tables
        print("🔄 Recreating all tables...")
        create_tables()

        print("✅ Database purge completed successfully!")
        return len(table_names)

    except Exception as e:
        print(f"❌ Error during purge: {e}")
        raise

def confirm_purge() -> bool:
    """Ask user for confirmation before purging everything"""
    print("\n" + "🚨" * 60)
    print("🚨              DANGER ZONE!")
    print("🚨")
    print("🚨  This will PERMANENTLY DELETE ALL DATA in the database!")
    print("🚨  This includes:")
    print("🚨  - All guilds and their configurations")
    print("🚨  - All users and their accounts")
    print("🚨  - All objectives and tasks")
    print("🚨  - All progress and mission data")
    print("🚨  - All AI commander configurations")
    print("🚨  - All invites and guild requests")
    print("🚨  - All access levels and ranks")
    print("🚨  - All squads and categories")
    print("🚨")
    print("🚨  This action CANNOT be undone!")
    print("🚨" * 60)

    while True:
        response = input("\nAre you ABSOLUTELY sure you want to continue? (type 'yes' to confirm): ").strip().lower()
        if response == 'yes':
            # Double confirmation
            response2 = input("Type 'I understand this will delete everything' to confirm: ").strip()
            if response2 == 'I understand this will delete everything':
                return True
            else:
                print("❌ Confirmation failed.")
                return False
        elif response in ['no', 'n', 'cancel', 'quit', 'exit']:
            print("ℹ️  Operation cancelled by user.")
            return False
        else:
            print("Please type 'yes' to confirm or 'no' to cancel.")

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Complete database purge - DANGER: Deletes ALL data!')
    parser.add_argument('--force', action='store_true',
                        help='Skip confirmation prompts (EXTREMELY DANGEROUS)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be done without actually doing it')

    args = parser.parse_args()

    print("💀 SphereConnect COMPLETE DATABASE PURGE")
    print("=" * 50)
    print("⚠️  WARNING: This will delete ALL data permanently!")

    if args.dry_run:
        print("📋 DRY RUN MODE - No data will actually be deleted")
    elif args.force:
        print("⚡ FORCE MODE - Skipping all confirmation prompts")
        print("💀 This is extremely dangerous!")
    else:
        print("🔒 SAFE MODE - Will ask for multiple confirmations")

    engine = None
    try:
        # Get database engine
        engine = get_database_engine()

        # Get table count for display
        table_names = get_all_table_names(engine)
        print(f"\n📊 Database contains {len(table_names)} tables")

        # Get user confirmation (unless forced or dry run)
        if not args.force and not args.dry_run:
            if not confirm_purge():
                return

        # Purge all data
        print(f"\n{'📋 Starting dry run...' if args.dry_run else '💀 Starting complete purge...'}")
        affected_count = purge_all_data(engine, dry_run=args.dry_run)

        # Final summary
        print("\n" + "="*60)
        if args.dry_run:
            print("DRY RUN SUMMARY")
        else:
            print("PURGE SUMMARY")
        print("="*60)
        print(f"Database: PostgreSQL ({os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5432')})")
        print(f"Tables affected: {affected_count}")
        if not args.dry_run:
            print("✅ Complete database purge completed successfully!")
            print("🔄 All tables have been dropped and recreated (empty)")
        else:
            print("📋 Dry run completed - no data was actually deleted")
        print("="*60)

    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()