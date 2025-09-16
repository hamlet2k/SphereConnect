-- Copyright 2025 Federico Arce. All Rights Reserved.
-- Confidential - Do Not Distribute Without Permission.

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