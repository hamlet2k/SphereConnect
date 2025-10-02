# Purge Test Data

Removes all test or demo data while keeping schema intact.

## Steps

1. Identify test/demo data based on known IDs or markers.
2. Delete objectives, tasks, users, and guilds flagged as test data.
3. Verify no orphaned rows remain in junction tables.
4. Compact or vacuum the database if necessary.
