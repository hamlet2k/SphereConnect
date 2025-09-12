# Save to F:\Projects\SphereConnect\app\core\models.py
from sqlalchemy import Column, UUID, String, JSONB, ARRAY, Boolean, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

Base = declarative_base()

class Guild(Base):
    __tablename__ = 'guilds'
    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    name = Column(String, nullable=False)

class Objective(Base):
    __tablename__ = 'objectives'
    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    guild_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(JSONB, nullable=False, default={"brief": "", "tactical": "", "classified": "", "metrics": {}})
    preferences = Column(ARRAY(String), default=[])
    categories = Column(ARRAY(String), default=[])
    priority = Column(String, default='Medium')
    applicable_rank = Column(String, default='Recruit')
    progress = Column(JSONB, default={})
    tasks = Column(ARRAY(PG_UUID(as_uuid=True)), default=[])
    lead_id = Column(PG_UUID(as_uuid=True))
    squad_id = Column(PG_UUID(as_uuid=True))

class Task(Base):
    __tablename__ = 'tasks'
    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    objective_id = Column(PG_UUID(as_uuid=True), nullable=False)
    guild_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    status = Column(String, default='Pending')
    priority = Column(String, default='Medium')
    progress = Column(JSONB, default={})
    self_assignment = Column(Boolean, default=True)
    max_assignees = Column(Integer, default=5)
    lead_id = Column(PG_UUID(as_uuid=True))
    squad_id = Column(PG_UUID(as_uuid=True))
    schedule = Column(JSONB, default={"flexible": True, "timezone": "UTC"})

class AICommander(Base):
    __tablename__ = 'ai_commanders'
    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    guild_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    name = Column(String, nullable=False, default='UEE Commander')
    phonetic = Column(String)
    system_prompt = Column(String, nullable=False, default='Act as a UEE Commander...')
    user_prompt = Column(String, default='')