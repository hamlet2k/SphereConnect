-- Copyright 2025 Federico Arce. All Rights Reserved.
-- Confidential - Do Not Distribute Without Permission.

CREATE TABLE user_preferences (
    user_id UUID NOT NULL,
    preference_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, preference_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (preference_id) REFERENCES preferences(id) ON DELETE CASCADE
);
