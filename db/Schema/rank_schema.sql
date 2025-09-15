-- Copyright 2025 Federico Arce. All Rights Reserved.
-- Confidential - Do Not Distribute Without Permission.

CREATE TABLE ranks (
    id UUID PRIMARY KEY,
    guild_id UUID NOT NULL,
    name TEXT NOT NULL,
    phonetic TEXT,
    access_levels TEXT[] DEFAULT '{}',
    FOREIGN KEY (guild_id) REFERENCES guilds(id)
);