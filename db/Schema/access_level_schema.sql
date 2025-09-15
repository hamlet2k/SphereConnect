-- Copyright 2025 Federico Arce. All Rights Reserved.
-- Confidential - Do Not Distribute Without Permission.

CREATE TABLE access_levels (
    id UUID PRIMARY KEY,
    guild_id UUID NOT NULL,
    name TEXT NOT NULL,
    user_actions TEXT[] DEFAULT '{}',
    FOREIGN KEY (guild_id) REFERENCES guilds(id)
);