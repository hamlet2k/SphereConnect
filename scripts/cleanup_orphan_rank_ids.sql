-- One-off SQL cleanup script to remove orphan rank IDs from objectives.allowed_ranks
-- This script removes any rank IDs from objectives that no longer exist in the ranks table

-- Create a temporary table with all existing rank IDs per guild
CREATE TEMP TABLE existing_ranks AS
SELECT DISTINCT guild_id, id as rank_id
FROM ranks;

-- Create an index for performance
CREATE INDEX idx_existing_ranks_guild_id ON existing_ranks(guild_id);

-- Update objectives to remove non-existent rank IDs from allowed_ranks arrays
UPDATE objectives
SET allowed_ranks = (
    SELECT array(
        SELECT unnest(allowed_ranks)
        INTERSECT
        SELECT rank_id::text FROM existing_ranks WHERE guild_id = objectives.guild_id
    )
)
WHERE guild_id IN (SELECT guild_id FROM existing_ranks);

-- Clean up temporary table
DROP TABLE existing_ranks;

-- Verification query (optional - run separately to check results)
-- SELECT o.id, o.name, o.allowed_ranks
-- FROM objectives o
-- WHERE array_length(o.allowed_ranks, 1) > 0
-- AND NOT EXISTS (
--     SELECT 1 FROM ranks r
--     WHERE r.guild_id = o.guild_id
--     AND r.id::text = ANY(o.allowed_ranks)
-- );