#!/usr/bin/env python3
"""
Test Data Seeder for SphereConnect
Creates sample data for testing guild management features
"""

import os
import sys
import uuid
from datetime import datetime

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.core.models import (
    get_db, create_tables, User, Guild, Rank, AccessLevel,
    Squad, AICommander, Objective, Task, ObjectiveCategory
)
from app.api.routes import hash_password, hash_pin

def seed_test_data():
    """Seed the database with test data"""
    db = next(get_db())

    try:
        print("🌱 Seeding test data...")

        # Create test guild (personal guild for user)
        personal_guild_id = uuid.uuid4()
        personal_guild = Guild(
            id=personal_guild_id,
            name="Test User's Personal Guild",
            creator_id=None,  # Will set after user creation
            member_limit=2,
            billing_tier='free',
            is_solo=True,
            is_active=True,  # New field
            is_deletable=False,
            type='game_star_citizen'
        )
        db.add(personal_guild)

        # Create test user
        test_user = User(
            id=uuid.uuid4(),
            guild_id=personal_guild_id,
            name="testuser",
            password=hash_password("testpass123"),
            pin=hash_pin("123456"),
            phonetic="Test User",
            availability="online",
            current_guild_id=personal_guild_id,  # Now UUID instead of string
            max_guilds=3,
            is_system_admin=False
        )
        db.add(test_user)
        db.commit()

        # Update personal guild creator
        personal_guild.creator_id = test_user.id
        db.commit()

        # Create additional test guilds
        extra_guilds = []
        for i in range(2):
            guild_id = uuid.uuid4()
            guild = Guild(
                id=guild_id,
                name=f"Test Guild {i+1}",
                creator_id=test_user.id,
                member_limit=2,
                billing_tier='free',
                is_solo=False,
                is_active=True,  # New field
                is_deletable=True,
                type='game_star_citizen'
            )
            db.add(guild)
            extra_guilds.append(guild)

        db.commit()

        # Create ranks
        admin_rank = Rank(
            id=uuid.uuid4(),
            guild_id=personal_guild_id,
            name="Commander",
            phonetic="Commander",
            access_levels=["manage_users", "manage_ranks", "manage_objectives", "manage_tasks", "manage_squads", "manage_guilds", "view_guilds"]
        )
        db.add(admin_rank)

        member_rank = Rank(
            id=uuid.uuid4(),
            guild_id=personal_guild_id,
            name="Recruit",
            phonetic="Recruit",
            access_levels=["view_users", "view_objectives", "view_tasks"]
        )
        db.add(member_rank)

        # Assign rank to user
        test_user.rank = admin_rank.id
        db.commit()

        # Create access levels
        access_levels = [
            AccessLevel(
                id=uuid.uuid4(),
                guild_id=personal_guild_id,
                name="User Management",
                user_actions=["manage_users", "view_users"]
            ),
            AccessLevel(
                id=uuid.uuid4(),
                guild_id=personal_guild_id,
                name="Objective Management",
                user_actions=["manage_objectives", "view_objectives"]
            ),
            AccessLevel(
                id=uuid.uuid4(),
                guild_id=personal_guild_id,
                name="Task Management",
                user_actions=["manage_tasks", "view_tasks"]
            ),
            AccessLevel(
                id=uuid.uuid4(),
                guild_id=personal_guild_id,
                name="Guild Management",
                user_actions=["manage_guilds", "view_guilds"]
            )
        ]

        for al in access_levels:
            db.add(al)

        # Create AI Commander
        ai_commander = AICommander(
            id=uuid.uuid4(),
            guild_id=personal_guild_id,
            name="UEE Commander",
            phonetic="UEE Commander",
            system_prompt="Act as a UEE Commander, coordinating Star Citizen guild missions with formal, strategic responses.",
            user_prompt=""
        )
        db.add(ai_commander)

        # Create squad
        squad = Squad(
            id=uuid.uuid4(),
            guild_id=personal_guild_id,
            name="Alpha Squad",
            lead_id=test_user.id
        )
        db.add(squad)

        # Create objective categories
        categories = [
            ObjectiveCategory(
                id=uuid.uuid4(),
                guild_id=personal_guild_id,
                name="Economy",
                description="Economic and trade objectives"
            ),
            ObjectiveCategory(
                id=uuid.uuid4(),
                guild_id=personal_guild_id,
                name="Military",
                description="Combat and military objectives"
            ),
            ObjectiveCategory(
                id=uuid.uuid4(),
                guild_id=personal_guild_id,
                name="Exploration",
                description="Exploration and discovery objectives"
            )
        ]

        for cat in categories:
            db.add(cat)

        # Create sample objective
        objective = Objective(
            id=uuid.uuid4(),
            guild_id=personal_guild_id,
            name="Collect 500 SCU Gold",
            description={
                "brief": "Collect 500 SCU of gold for guild treasury",
                "tactical": "Mine gold from designated asteroids",
                "classified": "High-value cargo operation",
                "metrics": {"gold scu": 0}
            },
            categories=["Economy"],
            priority="High",
            applicable_rank="Recruit",
            progress={},
            tasks=[],
            lead_id=test_user.id,
            squad_id=squad.id
        )
        db.add(objective)

        # Create sample task
        task = Task(
            id=uuid.uuid4(),
            objective_id=objective.id,
            guild_id=personal_guild_id,
            name="Mine Gold Asteroid Alpha",
            description="Mine gold from asteroid in sector 7G",
            status="Pending",
            priority="High",
            progress={},
            self_assignment=True,
            max_assignees=3,
            lead_id=test_user.id,
            squad_id=squad.id,
            schedule={
                "flexible": True,
                "timezone": "UTC"
            }
        )
        db.add(task)

        db.commit()

        print("✅ Test data seeded successfully!")
        print(f"   📊 Created 1 user with personal guild")
        print(f"   🏰 Created {len(extra_guilds) + 1} total guilds")
        print(f"   🎖️  Created 2 ranks")
        print(f"   🔐 Created {len(access_levels)} access levels")
        print(f"   🤖 Created 1 AI Commander")
        print(f"   👥 Created 1 squad")
        print(f"   📂 Created {len(categories)} objective categories")
        print(f"   🎯 Created 1 objective")
        print(f"   📋 Created 1 task")
        print()
        print("🔑 Test User Credentials:")
        print("   Username: testuser")
        print("   Password: testpass123")
        print("   PIN: 123456")
        print(f"   Personal Guild ID: {personal_guild_id}")
        print(f"   Current Guild ID: {personal_guild_id}")

    except Exception as e:
        db.rollback()
        print(f"❌ Failed to seed test data: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("🧪 SphereConnect Test Data Seeder")
    print("=" * 40)

    # Create tables if they don't exist
    try:
        print("📋 Ensuring database tables exist...")
        create_tables()
        print("✅ Database tables ready")
    except Exception as e:
        print(f"❌ Failed to create tables: {e}")
        sys.exit(1)

    # Seed test data
    seed_test_data()