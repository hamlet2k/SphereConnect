# Copyright 2025 Federico Arce. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Table, DateTime, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import JSONB, ARRAY, UUID as PG_UUID
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.schema import FetchedValue
import os
from datetime import datetime

Base = declarative_base()

# Association table for many-to-many relationship between objectives and categories
objective_categories_association = Table('objective_categories_junction', Base.metadata,
    Column('objective_id', PG_UUID(as_uuid=True), ForeignKey('objectives.id'), primary_key=True),
    Column('category_id', PG_UUID(as_uuid=True), ForeignKey('objective_categories.id'), primary_key=True)
)

# Database setup - Load from .env.local for PostgreSQL
env_local_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env.local')
if os.path.exists(env_local_path):
    try:
        from dotenv import load_dotenv
        load_dotenv(env_local_path)
        print("Loaded .env.local configuration from models.py")
    except ImportError:
        print("Warning: python-dotenv not installed, using environment variables")

# PostgreSQL configuration from environment
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASS = os.getenv('DB_PASS', 'password')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'sphereconnect')

# Create PostgreSQL engine with retry logic
DATABASE_URL = f'postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
import time

max_retries = 5
retry_delay = 2  # seconds

for attempt in range(max_retries):
    try:
        print(f"Connecting to database (attempt {attempt + 1}/{max_retries}): {DATABASE_URL.replace(DB_PASS, '***')}")
        ENGINE = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
        # Test connection
        with ENGINE.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("Database connection successful")
        break
    except Exception as e:
        print(f"Database connection failed (attempt {attempt + 1}): {e}")
        if attempt < max_retries - 1:
            print(f"Retrying in {retry_delay} seconds...")
            time.sleep(retry_delay)
            retry_delay *= 2  # exponential backoff
        else:
            print("Max retries exceeded")
            raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)

class User(Base):
    __tablename__ = 'users'
    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    guild_id = Column(PG_UUID(as_uuid=True), ForeignKey('guilds.id'), nullable=False, index=True)
    name = Column(String, nullable=False)
    phonetic = Column(String)
    availability = Column(String, default='offline')
    rank = Column(PG_UUID(as_uuid=True), ForeignKey('ranks.id'))
    preferences = Column(ARRAY(String), default=[])
    password = Column(String)
    pin = Column(String)
    squad_id = Column(PG_UUID(as_uuid=True), ForeignKey('squads.id'))

    # Security fields
    last_login = Column(DateTime)
    failed_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime)
    totp_secret = Column(String(32))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Guild management fields
    current_guild_id = Column(PG_UUID(as_uuid=True), ForeignKey('guilds.id'), nullable=True)
    max_guilds = Column(Integer, default=3)
    is_system_admin = Column(Boolean, default=False)

class Guild(Base):
    __tablename__ = 'guilds'
    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    name = Column(String, nullable=False)
    creator_id = Column(PG_UUID(as_uuid=True), ForeignKey('users.id'))
    member_limit = Column(Integer, default=2)
    billing_tier = Column(String, default='free')
    is_solo = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    is_deletable = Column(Boolean, default=True)
    type = Column(String, default='game_star_citizen')

    # Relationships
    creator = relationship('User', foreign_keys=[creator_id])

class Squad(Base):
    __tablename__ = 'squads'
    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    guild_id = Column(PG_UUID(as_uuid=True), ForeignKey('guilds.id'), nullable=False)
    name = Column(String, nullable=False)
    lead_id = Column(PG_UUID(as_uuid=True), ForeignKey('users.id'))

class Objective(Base):
    __tablename__ = 'objectives'
    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    guild_id = Column(PG_UUID(as_uuid=True), ForeignKey('guilds.id'), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(JSONB, nullable=False, default={"brief": "", "tactical": "", "classified": "", "metrics": {}})
    preferences = Column(ARRAY(String), default=[])
    categories = relationship('ObjectiveCategory', secondary=objective_categories_association, backref='objectives')
    priority = Column(String, default='Medium')
    applicable_rank = Column(String, default='Recruit')
    progress = Column(JSONB, default={})
    tasks = Column(ARRAY(PG_UUID(as_uuid=True)), default=[])
    lead_id = Column(PG_UUID(as_uuid=True), ForeignKey('users.id'))
    squad_id = Column(PG_UUID(as_uuid=True), ForeignKey('squads.id'))

class Task(Base):
    __tablename__ = 'tasks'
    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    objective_id = Column(PG_UUID(as_uuid=True), ForeignKey('objectives.id'), nullable=False)
    guild_id = Column(PG_UUID(as_uuid=True), ForeignKey('guilds.id'), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    status = Column(String, default='Pending')
    priority = Column(String, default='Medium')
    progress = Column(JSONB, default={})
    self_assignment = Column(Boolean, default=True)
    max_assignees = Column(Integer, default=5)
    lead_id = Column(PG_UUID(as_uuid=True), ForeignKey('users.id'))
    squad_id = Column(PG_UUID(as_uuid=True), ForeignKey('squads.id'))
    schedule = Column(JSONB, default={"flexible": True, "timezone": "UTC"})

class AICommander(Base):
    __tablename__ = 'ai_commanders'
    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    guild_id = Column(PG_UUID(as_uuid=True), ForeignKey('guilds.id'), nullable=False, index=True)
    name = Column(String, nullable=False, default='UEE Commander')
    phonetic = Column(String)
    system_prompt = Column(String, nullable=False, default='Act as a UEE Commander, coordinating Star Citizen guild missions with formal, strategic responses.')
    user_prompt = Column(String, default='')

class Rank(Base):
    __tablename__ = 'ranks'
    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    guild_id = Column(PG_UUID(as_uuid=True), ForeignKey('guilds.id'), nullable=False, index=True)
    name = Column(String, nullable=False)
    phonetic = Column(String)
    access_levels = Column(ARRAY(String), default=[])

class AccessLevel(Base):
    __tablename__ = 'access_levels'
    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    guild_id = Column(PG_UUID(as_uuid=True), ForeignKey('guilds.id'), nullable=False, index=True)
    name = Column(String, nullable=False)
    user_actions = Column(ARRAY(String), default=[])

class ObjectiveCategory(Base):
    __tablename__ = 'objective_categories'
    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    guild_id = Column(PG_UUID(as_uuid=True), ForeignKey('guilds.id'), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String)

class Invite(Base):
    __tablename__ = 'invites'
    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    guild_id = Column(PG_UUID(as_uuid=True), ForeignKey('guilds.id'), nullable=False, index=True)
    code = Column(String, nullable=False, unique=True)
    expires_at = Column(DateTime)
    uses_left = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

class GuildRequest(Base):
    __tablename__ = 'guild_requests'
    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    guild_id = Column(PG_UUID(as_uuid=True), ForeignKey('guilds.id'), nullable=False, index=True)
    status = Column(String, default='pending')  # pending, approved, denied
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserSession(Base):
    __tablename__ = 'user_sessions'
    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(45))  # Support IPv4 and IPv6
    user_agent = Column(String(255))

# Database utility functions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    Base.metadata.create_all(bind=ENGINE)
