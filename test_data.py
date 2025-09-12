# Copyright 2025 Federico Arce. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv

# Load environment variables from .env.local
env_local_path = os.path.join(os.path.dirname(__file__), '.env.local')
if os.path.exists(env_local_path):
    load_dotenv(env_local_path)
    print("✓ Loaded .env.local configuration")
else:
    print("Warning: .env.local file not found, using default database settings")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, sessionmaker
from app.core.models import Base, Guild, Objective, Task, AICommander, create_tables
from uuid import uuid4

def create_test_data():
    """Create test data for SphereConnect"""

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
    session = SessionLocal()

    try:
        # Generate IDs upfront to avoid DetachedInstanceError
        guild_id = uuid4()
        commander_id = uuid4()
        objective_id = uuid4()
        task_id = uuid4()

        # Create test guild
        test_guild = Guild(id=guild_id, name='Test UEE Fleet')
        session.add(test_guild)
        session.commit()

        print(f"✓ Created guild: {guild_id}")

        # Create AI Commander
        commander = AICommander(
            id=commander_id,
            guild_id=guild_id,
            name='UEE Commander',
            system_prompt='Act as a UEE Commander, coordinating Star Citizen guild missions with formal, strategic responses.',
            phonetic='Uniform Echo Echo Commander'
        )
        session.add(commander)
        session.commit()

        print(f"✓ Created AI Commander: {commander_id}")

        # Create test objective
        objective = Objective(
            id=objective_id,
            guild_id=guild_id,
            name='Collect 500 SCU Gold',
            description={
                "brief": "UEE orders to collect 500 SCU Gold in Pyro system",
                "tactical": "Avoid asteroid field, use stealth approach",
                "classified": "Enemy intel: Vanduul scouts nearby (Officers only)",
                "metrics": {"gold_scu": 0}
            },
            categories=["Economy"],
            priority="High",
            applicable_rank="Recruit"
        )
        session.add(objective)
        session.commit()

        print(f"✓ Created objective: {objective_id}")

        # Create test task
        task = Task(
            id=task_id,
            objective_id=objective_id,
            guild_id=guild_id,
            name='Scout Route',
            description='Scout safe route through Pyro system asteroid field',
            schedule={
                "start": "2025-09-13T21:00:00Z",
                "duration": "20m",
                "flexible": True,
                "timezone": "UTC"
            },
            priority="Medium",
            status="Pending"
        )
        session.add(task)
        session.commit()

        print(f"✓ Created task: {task_id}")

        # Print summary with all IDs accessed before session close
        print("\n" + "="*60)
        print("TEST DATA CREATION SUMMARY")
        print("="*60)
        print(f"Guild ID:      {guild_id}")
        print(f"Commander ID:  {commander_id}")
        print(f"Objective ID:  {objective_id}")
        print(f"Task ID:       {task_id}")
        print("="*60)
        print("✅ All test data created successfully!")
        print("PostgreSQL database connection verified.")
        print("="*60)

        return {
            'guild_id': str(guild_id),
            'commander_id': str(commander_id),
            'objective_id': str(objective_id),
            'task_id': str(task_id)
        }

    except Exception as e:
        session.rollback()
        print(f"❌ Error creating test data: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    try:
        result = create_test_data()
        print(f"\n🎉 Test data creation completed successfully!")
        print(f"Database: PostgreSQL ({os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5432')})")
        print(f"Guild: {result['guild_id']}")
    except Exception as e:
        print(f"❌ Failed to create test data: {e}")
        sys.exit(1)