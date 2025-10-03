-- Copyright 2025 Federico Arce. All Rights Reserved.
-- Confidential - Do Not Distribute Without Permission.

CREATE TABLE preferences (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
