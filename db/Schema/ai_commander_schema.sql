-- Save to F:\Projects\SphereConnect\db\schema\ai_commander_schema.sql
CREATE TABLE ai_commanders (
    id UUID PRIMARY KEY,
    guild_id UUID NOT NULL,
    name TEXT NOT NULL DEFAULT 'UEE Commander',
    phonetic TEXT,
    system_prompt TEXT NOT NULL DEFAULT 'Act as a UEE Commander, coordinating Star Citizen guild missions with formal, strategic responses.',
    user_prompt TEXT DEFAULT '',
    FOREIGN KEY (guild_id) REFERENCES guilds(id)
);