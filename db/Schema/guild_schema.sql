-- Copyright 2025 Federico Arce. All Rights Reserved.
-- Confidential - Do Not Distribute Without Permission.

CREATE TABLE guilds (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    creator_id UUID REFERENCES users(id),
    member_limit INTEGER DEFAULT 2,
    billing_tier TEXT DEFAULT 'free',
    is_solo BOOLEAN DEFAULT true,
    is_deletable BOOLEAN DEFAULT true,
    type TEXT DEFAULT 'game_star_citizen',
    CHECK (NOT (is_solo = true AND is_deletable = true))
);