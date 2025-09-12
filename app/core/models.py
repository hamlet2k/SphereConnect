# Copyright 2025 Federico Arce. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

from sqlalchemy import Column, String, Boolean, Integer, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import JSONB, ARRAY, UUID as PG_UUID
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

Base = declarative_base()

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///sphereconnect.db")
ENGINE = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)

class User(Base):
    __tablename__ = 'users'
    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String)
    password = Column(String)  # Hash in production

class Guild(Base):
    __tablename__ = 'guilds'
    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    name = Column(String, nullable=False)

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
    categories = Column(ARRAY(String), default=[])
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

# Database utility functions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    Base.metadata.create_all(bind=ENGINE)
