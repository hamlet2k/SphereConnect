-- Copyright 2025 Federico Arce. All Rights Reserved.
-- Confidential - Do Not Distribute Without Permission.

CREATE TABLE squads (
    id UUID PRIMARY KEY,
    guild_id UUID NOT NULL,
    name TEXT NOT NULL,
    squad_lead UUID,
    FOREIGN KEY (guild_id) REFERENCES guilds(id),
    FOREIGN KEY (squad_lead) REFERENCES users(id)
);