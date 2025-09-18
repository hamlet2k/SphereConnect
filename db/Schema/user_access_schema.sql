-- Copyright 2025 Federico Arce. All Rights Reserved.
-- Confidential - Do Not Distribute Without Permission.

CREATE TABLE user_access (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    access_level_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (access_level_id) REFERENCES access_levels(id) ON DELETE CASCADE
);