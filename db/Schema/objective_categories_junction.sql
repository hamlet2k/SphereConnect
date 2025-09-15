-- Copyright 2025 Federico Arce. All Rights Reserved.
-- Confidential - Do Not Distribute Without Permission.

CREATE TABLE objective_categories_junction (
    objective_id UUID NOT NULL,
    category_id UUID NOT NULL,
    PRIMARY KEY (objective_id, category_id),
    FOREIGN KEY (objective_id) REFERENCES objectives(id),
    FOREIGN KEY (category_id) REFERENCES objective_categories(id)
);