-- Copyright 2025 Federico Arce. All Rights Reserved.
-- Confidential - Do Not Distribute Without Permission.

-- Master schema file for SphereConnect database
-- Run this file to create all tables in the correct order

-- Enable UUID extension for auto-generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Guilds
CREATE TABLE guilds (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    creator_id UUID REFERENCES users(id),
    member_limit INTEGER DEFAULT 2,
    billing_tier TEXT DEFAULT 'free',
    is_solo BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    is_deletable BOOLEAN DEFAULT true,
    type TEXT DEFAULT 'game_star_citizen',
    CHECK (NOT (is_solo = true AND is_deletable = true))
);

-- Ranks
CREATE TABLE ranks (
    id UUID PRIMARY KEY,
    guild_id UUID NOT NULL,
    name TEXT NOT NULL,
    phonetic TEXT,
    access_levels TEXT[] DEFAULT '{}',
    FOREIGN KEY (guild_id) REFERENCES guilds(id)
);

-- Access Levels
CREATE TABLE access_levels (
    id UUID PRIMARY KEY,
    guild_id UUID NOT NULL,
    name TEXT NOT NULL,
    user_actions TEXT[] DEFAULT '{}',
    FOREIGN KEY (guild_id) REFERENCES guilds(id)
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY,
    guild_id UUID NOT NULL,
    name TEXT NOT NULL,
    phonetic TEXT,
    availability TEXT DEFAULT 'offline',
    rank UUID,
    preferences TEXT[] DEFAULT '{}',
    password TEXT,
    pin TEXT,
    squad_id UUID,
    last_login TIMESTAMP,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    totp_secret VARCHAR(32),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    current_guild_id UUID,
    max_guilds INTEGER DEFAULT 3,
    is_system_admin BOOLEAN DEFAULT false,
    FOREIGN KEY (guild_id) REFERENCES guilds(id),
    FOREIGN KEY (rank) REFERENCES ranks(id),
    FOREIGN KEY (squad_id) REFERENCES squads(id),
    FOREIGN KEY (current_guild_id) REFERENCES guilds(id)
);

-- User Sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Squads
CREATE TABLE squads (
    id UUID PRIMARY KEY,
    guild_id UUID NOT NULL,
    name TEXT NOT NULL,
    squad_lead UUID,
    FOREIGN KEY (guild_id) REFERENCES guilds(id),
    FOREIGN KEY (squad_lead) REFERENCES users(id)
);

-- AI Commanders
CREATE TABLE ai_commanders (
    id UUID PRIMARY KEY,
    guild_id UUID NOT NULL,
    name TEXT NOT NULL DEFAULT 'UEE Commander',
    phonetic TEXT,
    system_prompt TEXT NOT NULL DEFAULT 'Act as a UEE Commander, coordinating Star Citizen guild missions with formal, strategic responses.',
    user_prompt TEXT DEFAULT '',
    FOREIGN KEY (guild_id) REFERENCES guilds(id)
);

-- Objectives
CREATE TABLE objectives (
    id UUID PRIMARY KEY,
    guild_id UUID NOT NULL,
    name TEXT NOT NULL,
    description JSONB NOT NULL DEFAULT '{"brief": "", "tactical": "", "classified": "", "metrics": {}}',
    preferences TEXT[] DEFAULT '{}',
    priority TEXT DEFAULT 'Medium',
    applicable_rank TEXT DEFAULT 'Recruit',
    progress JSONB DEFAULT '{}',
    tasks UUID[] DEFAULT '{}',
    lead_id UUID,
    squad_id UUID,
    FOREIGN KEY (guild_id) REFERENCES guilds(id),
    FOREIGN KEY (lead_id) REFERENCES users(id),
    FOREIGN KEY (squad_id) REFERENCES squads(id)
);

-- Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    objective_id UUID NOT NULL,
    guild_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Pending',
    priority TEXT DEFAULT 'Medium',
    progress JSONB DEFAULT '{}',
    self_assignment BOOLEAN DEFAULT true,
    max_assignees INTEGER DEFAULT 5,
    lead_id UUID,
    squad_id UUID,
    schedule JSONB DEFAULT '{"flexible": true, "timezone": "UTC"}',
    FOREIGN KEY (objective_id) REFERENCES objectives(id),
    FOREIGN KEY (guild_id) REFERENCES guilds(id),
    FOREIGN KEY (lead_id) REFERENCES users(id),
    FOREIGN KEY (squad_id) REFERENCES squads(id)
);

-- Objective Categories
CREATE TABLE objective_categories (
    id UUID PRIMARY KEY,
    guild_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (guild_id) REFERENCES guilds(id)
);

-- Objective Categories Junction (many-to-many)
CREATE TABLE objective_categories_junction (
    objective_id UUID NOT NULL,
    category_id UUID NOT NULL,
    PRIMARY KEY (objective_id, category_id),
    FOREIGN KEY (objective_id) REFERENCES objectives(id),
    FOREIGN KEY (category_id) REFERENCES objective_categories(id)
);

-- Invites
CREATE TABLE invites (
    id UUID PRIMARY KEY,
    guild_id UUID NOT NULL,
    code TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP,
    uses_left INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (guild_id) REFERENCES guilds(id)
);

-- Guild Requests
CREATE TABLE guild_requests (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    guild_id UUID NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (guild_id) REFERENCES guilds(id)
);