-- Copyright 2025 Federico Arce. All Rights Reserved.
-- Confidential - Do Not Distribute Without Permission.

-- Save to F:\Projects\SphereConnect\db\schema\objective_schema.sql
CREATE TABLE objectives (
    id UUID PRIMARY KEY,
    guild_id UUID NOT NULL,
    name TEXT NOT NULL,
    description JSONB NOT NULL DEFAULT '{"brief": "", "tactical": "", "classified": "", "metrics": {}}',
    preferences TEXT[] DEFAULT '{}',
    categories TEXT[] DEFAULT '{}',
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
