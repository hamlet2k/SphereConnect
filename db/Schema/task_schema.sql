-- Copyright 2025 Federico Arce. All Rights Reserved.
-- Confidential - Do Not Distribute Without Permission.

-- Save to F:\Projects\SphereConnect\db\schema\task_schema.sql
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
