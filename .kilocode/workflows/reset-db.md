# Reset Database

Resets the development database to a clean state for testing.

## Steps

1. Stop the running server if active.
2. Drop all existing tables.
3. Recreate schema from models.
4. Run migration scripts if available.
5. Seed default data (e.g., super_admin, default guild).
6. Restart the server.
