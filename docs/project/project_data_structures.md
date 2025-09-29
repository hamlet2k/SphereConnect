# Sphere Connect – Project Data Structures

This file provides the **detailed entity definitions and data model** used in Sphere Connect. Cross-links are provided to relevant flows in [`project_flows.md`](./project_flows.md).

---

## Table of Contents
1. [Guilds](#1-guilds)
2. [Users](#2-users)
3. [Invites & Requests](#3-invites--requests)
4. [AI Commander](#4-ai-commander)
5. [Squads](#5-squads)
6. [Ranks & Access Levels](#6-ranks--access-levels)
7. [Objectives](#7-objectives)
8. [Tasks](#8-tasks)
9. [Objective Categories](#9-objective-categories)
10. [Notes](#10-notes)

---

## 1. Guilds
**Attributes:**
- `id`: UUID, primary key.
- `name`: Guild name.
- `member_limit`: INTEGER (2 by default in free tier; configurable by plan).
- `billing_tier`: TEXT (free, tier1, tier2, tier3).
- `is_solo`: BOOLEAN, true for persistent personal guilds.
- `is_active`: BOOLEAN, soft-archive toggle.
- `type`: TEXT (default: `game_star_citizen`).
- `creator_id`: UUID, FK to Users.
- `is_deletable`: BOOLEAN (false for personal guilds).

**See also**: [Guild Management Flows](./project_flows.md#3-guild-management).

---

## 2. Users
**Attributes:**
- `id`: UUID, primary key.
- `guild_id`: UUID, FK to guilds.
- `username`: TEXT, unique, required.
- `email`: TEXT, unique, optional.
- `name`: Display name.
- `phonetic`: For voice recognition.
- `availability`: Online/busy status.
- `rank`: Assigned rank (e.g., Recruit, NCO).
- `preferences`: Traits for AI assignment (e.g., mining, combat).
- `password`: Hashed with bcrypt.
- `pin`: 6-digit PIN for voice auth.
- `squad_id`: FK to squads.
- `current_guild_id`: UUID, switching context.
- `max_guilds`: INTEGER (default 3 for free tier).
- `is_system_admin`: BOOLEAN, platform-level flag.

**See also**: [Registration](./project_flows.md#1-registration), [Login](./project_flows.md#2-login).

---

## 3. Invites & Requests
### Invites
- `id`: UUID.
- `guild_id`: FK to guilds.
- `code`: Unique invite code.
- `expires_at`: TIMESTAMP (default: 7 days).
- `uses_left`: INTEGER (default: 1 in free tier).

### GuildRequests
- `id`: UUID.
- `user_id`: FK to users.
- `guild_id`: FK to guilds.
- `status`: TEXT (pending, approved, denied).

**See also**: [Invite & Join](./project_flows.md#invite--join), [Invite Management](./project_flows.md#5-invite-management).

---

## 4. AI Commander
**Attributes:**
- `id`: UUID.
- `guild_id`: FK to guilds.
- `name`: Default: UEE Commander.
- `phonetic`: For voice recognition.
- `system_prompt`: Default: strategic tone.
- `user_prompt`: Custom tone overrides.

**See also**: [Registration](./project_flows.md#1-registration).

---

## 5. Squads
**Attributes:**
- `id`: UUID.
- `guild_id`: FK to guilds.
- `name`: Squad identifier.
- `squad_lead`: FK to users.

**See also**: [Objective & Task Management](./project_flows.md#4-objective--task-management).

---

## 6. Ranks & Access Levels
### Ranks
- `id`: UUID.
- `guild_id`: FK to guilds.
- `name`: e.g., Recruit, NCO, Commander.
- `phonetic`: For voice recognition.
- `access_levels`: UUID[] (references access_levels.id).

### Access Levels
- `id`: UUID.
- `guild_id`: FK to guilds.
- `name`: e.g., Recruiting, Mission Development.
- `user_actions`: VARCHAR[] (permissions like `view_guilds`, `manage_rbac`).
- Special: `super_admin` is non-revocable, creator-only.

Note: Guild owners automatically receive the super_admin access level. This level always has full permissions and must include any new user functions added in the future.

**See also**: [Access Level Management](./project_flows.md#6-access-level-management), [Registration](./project_flows.md#1-registration).

---

## 7. Objectives
**Attributes:**
- `id`: UUID.
- `guild_id`: FK to guilds.
- `name`: Mission name.
- `description`: JSONB (brief, tactical, classified, metrics).
- `preferences`: Traits linked to users.
- `priority`: Urgency level.
- `applicable_rank`: Restricted visibility.
- `progress`: JSONB.
- `tasks`: Array of task UUIDs.
- `lead_id`: FK to users.
- `squad_id`: FK to squads.
- `is_deleted`: BOOLEAN (soft delete flag).
- `categories`: Array of linked category IDs (many-to-many via junction table).
  - Used for filtering objectives by category.
  - Populated when creating or updating objectives.

**Notes:**
- Objectives reference categories by **ID**, not by name.
- Backend accepts IDs (preferred) but maintains backward compatibility with names.
- Objective endpoints always return category IDs; frontend resolves them to names for display.


**See also**: [Objective & Task Management](./project_flows.md#4-objective--task-management).

---

## 8. Tasks
**Attributes:**
- `id`: UUID.
- `objective_id`: FK to objectives.
- `guild_id`: FK to guilds.
- `name`: Task name.
- `description`: TEXT.
- `status`: Pending, In Progress, Completed, Failed.
- `priority`: Urgency.
- `progress`: JSONB.
- `self_assignment`: Boolean, allows signup.
- `lead_id`: FK to users.
- `squad_id`: FK to squads.
- `schedule`: JSONB (start, end, duration, flexible, timezone).

**See also**: [Objective & Task Management](./project_flows.md#4-objective--task-management).

---

## 9. Objective Categories
**Attributes:**
- `id`: UUID.
- `guild_id`: FK to guilds.
- `name`: e.g., Economy, Military.
- `description`: TEXT.

**Notes:**
- Objectives reference categories by **ID**, not by name.
- Backend accepts IDs (preferred) but maintains backward compatibility with names.
- Objective endpoints always return category IDs; frontend resolves them to names for display.


**See also**: [Objective & Task Management](./project_flows.md#4-objective--task-management).

---

## 10. Notes
- All entities are multitenant via `guild_id`.
- JSONB fields used for extensibility (objectives, tasks).
- Security: deny-by-default enforced by access levels and user overrides.

