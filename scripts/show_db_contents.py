#!/usr/bin/env python3
# Copyright 2025 Federico Arce. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

"""
Database Contents Viewer for SphereConnect

This script displays the current contents of the SphereConnect database
in a readable format. Useful for development and debugging.

Usage:
    python scripts/show_db_contents.py              # Show all data
    python scripts/show_db_contents.py --summary    # Show only counts
    python scripts/show_db_contents.py --guild <id> # Show data for specific guild
"""

import sys
import os
import argparse
from typing import Dict, List, Any

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

from sqlalchemy.orm import sessionmaker
from app.core.models import (
    Guild, User, Objective, Task, AICommander, Squad, Rank, AccessLevel,
    ObjectiveCategory, UserSession, Invite, GuildRequest, ENGINE
)

def get_database_session():
    """Create and return database session"""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)
    return SessionLocal()

def get_summary_counts(session) -> Dict[str, int]:
    """Get summary counts for all tables"""
    counts = {
        'guilds': session.query(Guild).count(),
        'users': session.query(User).count(),
        'objectives': session.query(Objective).count(),
        'tasks': session.query(Task).count(),
        'ai_commanders': session.query(AICommander).count(),
        'squads': session.query(Squad).count(),
        'ranks': session.query(Rank).count(),
        'access_levels': session.query(AccessLevel).count(),
        'objective_categories': session.query(ObjectiveCategory).count(),
        'user_sessions': session.query(UserSession).count(),
        'invites': session.query(Invite).count(),
        'guild_requests': session.query(GuildRequest).count(),
    }
    return counts

def display_summary(counts: Dict[str, int]):
    """Display summary of database contents"""
    print("\n" + "="*60)
    print("SPHERECONNECT DATABASE SUMMARY")
    print("="*60)

    total_records = sum(counts.values())
    print(f"Total Records: {total_records}")
    print()

    for table, count in counts.items():
        table_name = table.replace('_', ' ').title()
        status = "[POPULATED]" if count > 0 else "[EMPTY]"
        print(f"{status} {table_name}: {count}")

    print("="*60)

def display_detailed_contents(session, guild_filter: str = None):
    """Display detailed contents of all tables"""
    print("\n" + "="*80)
    print("SPHERECONNECT DATABASE CONTENTS")
    print("="*80)

    # Guilds
    print("\nGUILDS:")
    guilds = session.query(Guild).all()
    if guilds:
        for guild in guilds:
            print(f"  - {guild.name} (ID: {guild.id})")
    else:
        print("  (No guilds found)")

    # Users
    print("\nUSERS:")
    users = session.query(User).all()
    if users:
        for user in users:
            guild_name = "Unknown"
            if user.guild_id:
                guild = session.query(Guild).filter(Guild.id == user.guild_id).first()
                if guild:
                    guild_name = guild.name
            print(f"  - {user.name} ({guild_name}) - {user.availability} (ID: {user.id})")
    else:
        print("  (No users found)")

    # Objectives
    print("\nOBJECTIVES:")
    objectives = session.query(Objective).all()
    if objectives:
        for obj in objectives:
            guild_name = "Unknown"
            if obj.guild_id:
                guild = session.query(Guild).filter(Guild.id == obj.guild_id).first()
                if guild:
                    guild_name = guild.name
            print(f"  - {obj.name} ({guild_name}) - Priority: {obj.priority} (ID: {obj.id})")
            if obj.description and 'brief' in obj.description:
                print(f"    Description: {obj.description['brief']}")
    else:
        print("  (No objectives found)")

    # Tasks
    print("\nTASKS:")
    tasks = session.query(Task).all()
    if tasks:
        for task in tasks:
            guild_name = "Unknown"
            if task.guild_id:
                guild = session.query(Guild).filter(Guild.id == task.guild_id).first()
                if guild:
                    guild_name = guild.name
            print(f"  - {task.name} ({guild_name}) - Status: {task.status}, Priority: {task.priority} (ID: {task.id})")
    else:
        print("  (No tasks found)")

    # AI Commanders
    print("\nAI COMMANDERS:")
    commanders = session.query(AICommander).all()
    if commanders:
        for cmdr in commanders:
            guild_name = "Unknown"
            if cmdr.guild_id:
                guild = session.query(Guild).filter(Guild.id == cmdr.guild_id).first()
                if guild:
                    guild_name = guild.name
            print(f"  - {cmdr.name} ({guild_name}) (ID: {cmdr.id})")
    else:
        print("  (No AI commanders found)")

    # Invites
    print("\nINVITES:")
    invites = session.query(Invite).all()
    if invites:
        for invite in invites:
            guild_name = "Unknown"
            if invite.guild_id:
                guild = session.query(Guild).filter(Guild.id == invite.guild_id).first()
                if guild:
                    guild_name = guild.name
            print(f"  - Code: {invite.code} ({guild_name}) - Uses left: {invite.uses_left} (ID: {invite.id})")
    else:
        print("  (No invites found)")

    # Guild Requests
    print("\nGUILD REQUESTS:")
    requests = session.query(GuildRequest).all()
    if requests:
        for req in requests:
            user_name = "Unknown"
            guild_name = "Unknown"
            if req.user_id:
                user = session.query(User).filter(User.id == req.user_id).first()
                if user:
                    user_name = user.name
            if req.guild_id:
                guild = session.query(Guild).filter(Guild.id == req.guild_id).first()
                if guild:
                    guild_name = guild.name
            print(f"  - {user_name} -> {guild_name} (Status: {req.status}) (ID: {req.id})")
    else:
        print("  (No guild requests found)")

    print("="*80)

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='View SphereConnect database contents')
    parser.add_argument('--summary', action='store_true',
                        help='Show only summary counts')
    parser.add_argument('--guild', type=str,
                        help='Show data only for specific guild ID')

    args = parser.parse_args()

    print("SphereConnect Database Contents Viewer")
    print("=" * 50)

    session = None
    try:
        # Get database session
        session = get_database_session()

        # Get summary counts
        counts = get_summary_counts(session)

        if args.summary:
            # Show only summary
            display_summary(counts)
        else:
            # Show detailed contents
            display_detailed_contents(session, args.guild)

        # Database connection info
        print("\nDatabase: PostgreSQL")
        print(f"   Host: {os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5432')}")
        print(f"   Database: {os.getenv('DB_NAME', 'sphereconnect')}")

    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    finally:
        if session:
            session.close()

if __name__ == "__main__":
    main()