# Database Schema Documentation

This document provides a comprehensive overview of the SphereConnect PostgreSQL database schema, including all tables, relationships, indexes, and constraints.

## Overview

SphereConnect uses PostgreSQL as its primary database with a multitenant architecture. All tables include `guild_id` for data isolation between guilds.

## Core Tables

### Guilds

The root table for multitenant data isolation.

```sql
CREATE TABLE guilds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_guilds_name ON guilds(name);
CREATE INDEX idx_guilds_created_at ON guilds(created_at);
```

**Relationships:**
- Parent to: users, ai_commanders, squads, ranks, access_levels, objectives, objective_categories, tasks

### Users

User accounts with authentication and profile information.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL,
    name TEXT NOT NULL,
    phonetic TEXT,
    availability TEXT DEFAULT 'offline' CHECK (availability IN ('online', 'busy', 'offline', 'in_game')),
    rank UUID,
    preferences TEXT[] DEFAULT '{}',
    password TEXT,
    pin TEXT,
    squad_id UUID,
    -- Security fields
    last_login TIMESTAMP WITH TIME ZONE,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    totp_secret VARCHAR(32),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Foreign keys
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (rank) REFERENCES ranks(id),
    FOREIGN KEY (squad_id) REFERENCES squads(id)
);

-- Indexes
CREATE UNIQUE INDEX idx_users_guild_name ON users(guild_id, name);
CREATE INDEX idx_users_guild_id ON users(guild_id);
CREATE INDEX idx_users_rank ON users(rank);
CREATE INDEX idx_users_squad_id ON users(squad_id);
CREATE INDEX idx_users_availability ON users(availability);
CREATE INDEX idx_users_last_login ON users(last_login);
```

### AI Commanders

Customizable AI personalities for voice interaction.

```sql
CREATE TABLE ai_commanders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL,
    name TEXT NOT NULL DEFAULT 'UEE Commander',
    phonetic TEXT,
    system_prompt TEXT NOT NULL,
    user_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Indexes
CREATE UNIQUE INDEX idx_ai_commanders_guild ON ai_commanders(guild_id);
CREATE INDEX idx_ai_commanders_name ON ai_commanders(name);
```

### Squads

Dynamic team formations for coordinated operations.

```sql
CREATE TABLE squads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL,
    name TEXT NOT NULL,
    squad_lead UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (squad_lead) REFERENCES users(id)
);

-- Indexes
CREATE UNIQUE INDEX idx_squads_guild_name ON squads(guild_id, name);
CREATE INDEX idx_squads_guild_id ON squads(guild_id);
CREATE INDEX idx_squads_lead ON squads(squad_lead);
```

### Ranks

Hierarchical role system with access control.

```sql
CREATE TABLE ranks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL,
    name TEXT NOT NULL,
    phonetic TEXT,
    access_levels UUID[] DEFAULT '{}',
    hierarchy_level INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Indexes
CREATE UNIQUE INDEX idx_ranks_guild_name ON ranks(guild_id, name);
CREATE UNIQUE INDEX idx_ranks_guild_hierarchy ON ranks(guild_id, hierarchy_level);
CREATE INDEX idx_ranks_guild_id ON ranks(guild_id);
CREATE INDEX idx_ranks_hierarchy ON ranks(hierarchy_level);
```

### Access Levels

Granular permissions for different operations.

```sql
CREATE TABLE access_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL,
    name TEXT NOT NULL,
    user_actions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Indexes
CREATE UNIQUE INDEX idx_access_levels_guild_name ON access_levels(guild_id, name);
CREATE INDEX idx_access_levels_guild_id ON access_levels(guild_id);
```

## Mission Management Tables

### Objectives

High-level mission definitions with structured descriptions.

```sql
CREATE TABLE objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL,
    name TEXT NOT NULL,
    description JSONB DEFAULT '{}',
    preferences TEXT[] DEFAULT '{}',
    categories UUID[] DEFAULT '{}',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    applicable_rank TEXT,
    progress REAL DEFAULT 0.0 CHECK (progress >= 0.0 AND progress <= 100.0),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
    lead_id UUID,
    squad_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES users(id),
    FOREIGN KEY (squad_id) REFERENCES squads(id)
);

-- Indexes
CREATE INDEX idx_objectives_guild_id ON objectives(guild_id);
CREATE INDEX idx_objectives_status ON objectives(status);
CREATE INDEX idx_objectives_priority ON objectives(priority);
CREATE INDEX idx_objectives_lead_id ON objectives(lead_id);
CREATE INDEX idx_objectives_squad_id ON objectives(squad_id);
CREATE INDEX idx_objectives_categories ON objectives USING GIN(categories);
CREATE INDEX idx_objectives_description ON objectives USING GIN(description);
CREATE INDEX idx_objectives_created_at ON objectives(created_at);
```

### Tasks

Specific actionable items within objectives.

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id UUID NOT NULL,
    guild_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    progress REAL DEFAULT 0.0 CHECK (progress >= 0.0 AND progress <= 100.0),
    self_assignment BOOLEAN DEFAULT true,
    lead_id UUID,
    squad_id UUID,
    schedule JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES users(id),
    FOREIGN KEY (squad_id) REFERENCES squads(id)
);

-- Indexes
CREATE INDEX idx_tasks_objective_id ON tasks(objective_id);
CREATE INDEX idx_tasks_guild_id ON tasks(guild_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_lead_id ON tasks(lead_id);
CREATE INDEX idx_tasks_squad_id ON tasks(squad_id);
CREATE INDEX idx_tasks_schedule ON tasks USING GIN(schedule);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
```

### Objective Categories

Grouping system for objectives.

```sql
CREATE TABLE objective_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Indexes
CREATE UNIQUE INDEX idx_objective_categories_guild_name ON objective_categories(guild_id, name);
CREATE INDEX idx_objective_categories_guild_id ON objective_categories(guild_id);
```

### Objective Categories Junction

Many-to-many relationship between objectives and categories.

```sql
CREATE TABLE objective_categories_junction (
    objective_id UUID NOT NULL,
    category_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (objective_id, category_id),
    FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES objective_categories(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_obj_cat_junction_objective ON objective_categories_junction(objective_id);
CREATE INDEX idx_obj_cat_junction_category ON objective_categories_junction(category_id);
```

## Session Management

### User Sessions

Tracks active user sessions for security and analytics.

```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
```

## JSONB Structure Definitions

### Objective Description Schema

```json
{
  "brief": "High-level objective overview visible to all ranks",
  "tactical": "Detailed execution plan for officers and NCOs",
  "classified": "Sensitive information restricted to officers only",
  "metrics": {
    "custom_metric_1": 0,
    "custom_metric_2": 0,
    "target_value": 100,
    "current_value": 0
  }
}
```

### Task Schedule Schema

```json
{
  "start": "2024-01-15T14:00:00Z",
  "end": "2024-01-15T16:00:00Z",
  "duration": 120,
  "flexible": false,
  "timezone": "UTC"
}
```

## Constraints and Validation

### Check Constraints

```sql
-- User availability
ALTER TABLE users ADD CONSTRAINT chk_users_availability
CHECK (availability IN ('online', 'busy', 'offline', 'in_game'));

-- Objective priority
ALTER TABLE objectives ADD CONSTRAINT chk_objectives_priority
CHECK (priority IN ('critical', 'high', 'medium', 'low'));

-- Objective status
ALTER TABLE objectives ADD CONSTRAINT chk_objectives_status
CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold'));

-- Task status
ALTER TABLE tasks ADD CONSTRAINT chk_tasks_status
CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold'));

-- Progress ranges
ALTER TABLE objectives ADD CONSTRAINT chk_objectives_progress
CHECK (progress >= 0.0 AND progress <= 100.0);

ALTER TABLE tasks ADD CONSTRAINT chk_tasks_progress
CHECK (progress >= 0.0 AND progress <= 100.0);
```

### Unique Constraints

```sql
-- Guild-scoped unique names
ALTER TABLE guilds ADD CONSTRAINT uk_guilds_name UNIQUE (name);
ALTER TABLE users ADD CONSTRAINT uk_users_guild_name UNIQUE (guild_id, name);
ALTER TABLE ai_commanders ADD CONSTRAINT uk_ai_commanders_guild UNIQUE (guild_id);
ALTER TABLE squads ADD CONSTRAINT uk_squads_guild_name UNIQUE (guild_id, name);
ALTER TABLE ranks ADD CONSTRAINT uk_ranks_guild_name UNIQUE (guild_id, name);
ALTER TABLE ranks ADD CONSTRAINT uk_ranks_guild_hierarchy UNIQUE (guild_id, hierarchy_level);
ALTER TABLE access_levels ADD CONSTRAINT uk_access_levels_guild_name UNIQUE (guild_id, name);
ALTER TABLE objective_categories ADD CONSTRAINT uk_objective_categories_guild_name UNIQUE (guild_id, name);
```

## Performance Optimization

### Partitioning Strategy

For high-traffic guilds, consider partitioning large tables:

```sql
-- Partition objectives by guild (if needed for scale)
CREATE TABLE objectives_y2024 PARTITION OF objectives
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Partition tasks by objective
CREATE TABLE tasks_obj_001 PARTITION OF tasks
FOR VALUES FROM ('550e8400-e29b-41d4-a716-446655440001')
TO ('550e8400-e29b-41d4-a716-446655440002');
```

### Index Strategy

- Guild ID indexes on all tables for tenant isolation
- GIN indexes on JSONB columns for efficient querying
- Partial indexes for common filters
- Composite indexes for frequent query patterns

### Query Optimization

Common query patterns and their optimized indexes:

```sql
-- Objectives by guild and status
CREATE INDEX idx_objectives_guild_status ON objectives(guild_id, status);

-- Tasks by objective and status
CREATE INDEX idx_tasks_objective_status ON tasks(objective_id, status);

-- Users by guild and rank
CREATE INDEX idx_users_guild_rank ON users(guild_id, rank);
```

## Backup and Recovery

### Logical Backups

```bash
-- Full database backup
pg_dump -U sphereconnect -h localhost sphereconnect > sphereconnect_backup.sql

-- Schema-only backup
pg_dump -U sphereconnect -h localhost --schema-only sphereconnect > schema_backup.sql

-- Data-only backup
pg_dump -U sphereconnect -h localhost --data-only sphereconnect > data_backup.sql
```

### Point-in-Time Recovery

Enable WAL archiving for PITR:

```sql
-- postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/archive/%f'
```

### Continuous Archiving

```bash
# Base backup
pg_basebackup -U sphereconnect -h localhost -D /backup/base -Ft -z -P

# Restore from backup
pg_restore -U sphereconnect -h localhost -d sphereconnect /backup/base.tar.gz
```

## Migration Strategy

### Schema Migrations

Use tools like Alembic or Flyway for schema versioning:

```python
# Alembic migration example
def upgrade():
    op.create_table('new_table',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('guild_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['guild_id'], ['guilds.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('new_table')
```

### Data Migrations

Handle data transformations during schema changes:

```python
def upgrade():
    # Migrate existing data
    op.execute("""
        UPDATE objectives
        SET description = jsonb_build_object(
            'brief', description->>'brief',
            'tactical', description->>'tactical',
            'metrics', '{}'::jsonb
        )
        WHERE description IS NOT NULL
    """)
```

## Monitoring and Maintenance

### Table Statistics

```sql
-- Update table statistics
ANALYZE VERBOSE;

-- View table bloat
SELECT schemaname, tablename, n_dead_tup, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

### Index Maintenance

```sql
-- Reindex specific index
REINDEX INDEX idx_objectives_guild_id;

-- Reindex all indexes in database
REINDEX DATABASE sphereconnect;
```

### Vacuum Operations

```sql
-- Vacuum specific table
VACUUM (VERBOSE, ANALYZE) objectives;

-- Auto-vacuum settings in postgresql.conf
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 20s
```

This schema provides a solid foundation for the SphereConnect application with proper indexing, constraints, and scalability considerations.