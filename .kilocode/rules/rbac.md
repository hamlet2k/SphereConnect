# RBAC Enforcement

All APIs must enforce role-based access control (RBAC) with deny-by-default.

## Guidelines

- Always scope queries by `guild_id`.
- Respect `super_admin` bypass without loosening other rules.
- Default state is deny unless explicitly permitted by access level or rank.
