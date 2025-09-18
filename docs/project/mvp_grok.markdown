# SphereConnect MVP Specification: Star Citizen Focus (v20)

## Overview
SphereConnect is a multitenant AI app for community organization and management, initially focused on complementing sandbox MMO games (e.g., Star Citizen) with tools for members, roles, objectives, events, auth, access, voice interaction, game-specific templates, and notifications. It's designed for extensibility to non-gaming communities (e.g., city farming, professional groups). Not a replacement for voice chats; integrable with Discord.

**Key Goals**: Enhance coordination, AI immersion, scalability, security. Architecture facilitates adaptation to non-gaming sectors while starting with video games.

**Functionalities**: Administer members, manage roles/objectives/events, authenticate/access, voice commands, customizable templates, notifications. AI-driven personalization across contexts.

**Challenges**: Modular architecture, web/mobile/voice interfaces, Python/React/AI API stack, freemium model, MVP in 3-6 months.

**Key Principles**:
- Multitenancy: Independent, private guild interactions via `guild_id` in a single PostgreSQL schema for MVP, enforced across all entities.
- AI Immersion: Single UEE Commander persona via Wingman-AI for voice; AI parses inputs for progress/metrics and outputs responses.
- Security: Deny-by-default access; explicit grants required. Use environment variables for database credentials.
- Seamless Flows: Voice-driven creation with defaults, AI suggestions for task assignments/scheduling.
- Bypass: Full functionality without voice via webapp (React PWA with TypeScript) or local client (game overlay).
- AI Scope: Delegate STT/TTS/LLM to Wingman-AI. SphereConnect backend handles data only.
- Minimum Requirements: Deliver baseline features; extensions allowed if low complexity.
- Extensibility: Modular design (JSON templates) adaptable to non-gaming.
- License: Apache 2.0 for patent protection and community contributions.
- Repository: Sensitive files (`docs/`, `.env`, `.env.local`, `env/`, `__pycache__/`, `.vscode/`) in `.gitignore`; history clean.

## Disclaimers
- Attributes for guidance, not strict schemas.
- Docs offline in `docs/` (.gitignore) to protect IP; share via NDAs.
- All TBDs Resolved: JSONB for objectives/tasks, single UEE Commander.
- Deferred: Discord integration (post-MVP).

## System Personas
- **User**: All guild interactions (solo, member, leader). Access via ranks (e.g., CO for admin-like) and overrides (e.g., grant 'create_objective'). Personal guilds: Full access, non-deletable (is_solo=true). Non-personal guilds: Delete only by creator_id.
- **System Administrator**: Platform-level (e.g., guild approvals, billing). Minimal MVP impact (flag in Users table).

## Buyer Personas
- **Guild Leader**: Pays for guild upgrades (e.g., more members). Needs robust management tools, donations offset.
- **Guild Member**: Non-paying; uses leader-upgraded guilds. Needs seamless task/voice UX.
- **Solo Player**: Free tier; personal guild. Hooks to join/lead larger guilds.

## System Architecture
### Central System (SphereConnect Backend)
- Multitenant backend using AWS Lambda/RDS Free Tier or local Flask/FastAPI for PoC.
- AI Configuration: Single UEE Commander persona with system/user prompts, managed by Wingman-AI.
- Push Updates: Real-time objective/task/notifications, AI-filtered by preferences/squads to avoid spam.
- Configuration: Web-based UI (React PWA with TypeScript) for settings, restricted by user access.
- Database: PostgreSQL "sphereconnect" with single schema, guild_id filtering for multitenancy.
- API: FastAPI/Flask endpoints (`app/api/routes.py`, `app/api/admin_routes.py`) for objectives, tasks, progress, scheduling, with guild_id required.

### Local Client (Game Overlay)
- Authentication: Credentials/SSO/PIN, integrating with backend API.
- Voice Interaction: Optional via Wingman-AI as-is (custom skill in `wingman-ai/skills/sphereconnect/main.py` maps voice to API calls).
- Updates: Sends/receives objective/task/notifications via SphereConnect API.
- UI: Transparent, Star Citizen-themed game overlay for in-game display.
- Keybinds: Customizable (e.g., PTT for Wingman-AI voice commands).
- Bypass: Connects directly to SphereConnect API for text-based interactions, bypassing Wingman-AI when unavailable or for non-voice use cases.

### Webapp (React PWA)
- Mobile-friendly Progressive Web App using React with TypeScript (`.tsx` files, `frontend/src/App.tsx`, `tsconfig.json`).
- Full interface for all functionalities: user management, objective/task CRUD, settings, guild switching.
- Voice is a subset—bypasses Wingman-AI via direct API calls or text inputs.
- Responsive design with Material-UI or Chakra UI.

### Game Overlay UI
- Transparent, Star Citizen-themed display over game.
- Displays (on-demand or pushed):
  - User/Squad information.
  - System time (for scheduled tasks).
  - Applicable objectives/tasks, filtered by priority, preferences, categories, and AI best-fit.
  - Active/Assigned objectives/tasks with progress and priorities.
  - System/user notifications.
  - Guild switcher (dropdown for active guild).

### Wingman-AI Integration
- As-is local client handles all voice processing: STT (Whisper), LLM (OpenAI), TTS (ElevenLabs).
- Custom skill in `wingman-ai/skills/sphereconnect/main.py` maps voice commands (e.g., "Create objective: Collect 500 SCU Gold") to SphereConnect API endpoints.
- Config in `wingman-ai/configs/_SphereConnect/UEE Commander.yaml` sets prompts, API URL (`http://localhost:8000/api` or cloud), and voice settings.
- PoC Status: Passed with 90%+ accuracy, <2s latency, seamless UX.
- Fallback: TTS feedback for non-SphereConnect commands.
- Note: SphereConnect backend (`app/`) contains no STT/TTS/LLM or hardware management—standalone.

## Entities
### Guilds
| Attribute | Description |
|-----------|-------------|
| id | UUID, primary key |
| name | Guild name |
| member_limit | INTEGER DEFAULT 2 (free tier; upgradable) |
| billing_tier | TEXT DEFAULT 'free' (e.g., 'tier1' for 10 members) |
| is_solo | BOOLEAN DEFAULT true (personal guilds; persists on join) |
| is_active | BOOLEAN DEFAULT true (archive on inactivity; no deletion) |
| type | TEXT DEFAULT 'game_star_citizen' (for per-industry limits) |
| creator_id | UUID (foreign key to Users; restricts deletion) |
| is_deletable | BOOLEAN DEFAULT true (false for is_solo=true; prevents personal guild deletion) |

### Users
| Attribute | Description |
|-----------|-------------|
| id | UUID, primary key |
| guild_id | UUID, foreign key to guilds, non-nullable, indexed |
| name | Display name |
| username | TEXT, unique, not null (login identifier) |
| email | TEXT, unique (optional, for login) |
| phonetic | For voice recognition |
| availability | Session/online status |
| rank | Assigned rank (e.g., Recruit, NCO) |
| preferences | Traits (e.g., mining, combat) |
| password | Hashed with bcrypt |
| pin | 6-digit code for voice access |
| squad_id | UUID, foreign key to squads |
| current_guild_id | UUID (switching context; defaults to personal) |
| max_guilds | INTEGER DEFAULT 3 (free tier total guilds, including personal) |
| is_system_admin | BOOLEAN DEFAULT false (platform-level access) |

### Invites
| Attribute | Description |
|-----------|-------------|
| id | UUID |
| guild_id | UUID |
| code | TEXT (unique) |
| expires_at | TIMESTAMP |
| uses_left | INTEGER DEFAULT 1 (free tier) |

### GuildRequests
| Attribute | Description |
|-----------|-------------|
| id | UUID |
| user_id | UUID |
| guild_id | UUID |
| status | TEXT (pending/approved/denied) |

### AI Commander
| Attribute | Description |
|-----------|-------------|
| id | UUID, primary key |
| guild_id | UUID, foreign key to guilds, non-nullable, indexed |
| name | Default: UEE Commander |
| phonetic | For voice recognition |
| system_prompt | Default: 'Act as a UEE Commander, coordinating Star Citizen guild missions with formal, strategic responses.' |
| user_prompt | Custom tone per user interaction |

### Squads
| Attribute | Description |
|-----------|-------------|
| id | UUID, primary key |
| guild_id | UUID, foreign key to guilds, non-nullable, indexed |
| name | Squad identifier |
| squad_lead | UUID, foreign key to users |

**Structure**: Groups for filtering tasks/notifications; auto ad-hoc creation via voice if undefined.

### Ranks
| Attribute | Description |
|-----------|-------------|
| id | UUID, primary key |
| guild_id | UUID, foreign key to guilds, non-nullable, indexed |
| name | e.g., Recruit, NCO, Commander |
| phonetic | For voice recognition |
| access_levels | Hierarchical permissions with custom overrides (e.g., NCO-specific recruiting) |
| default_access_levels | TEXT[] DEFAULT '{}' (default actions for rank) |

**Structure**: Military-style pyramid; higher ranks inherit lower access levels.

### Access Levels
| Attribute | Description |
|-----------|-------------|
| id | UUID, primary key |
| guild_id | UUID, foreign key to guilds, non-nullable, indexed |
| name | e.g., Recruiting, Mission Development |
| user_actions | Grouped actions permitted |

**Structure**: Independent groups assigned to ranks/users for flexibility.

### Objectives
| Attribute | Description |
|-----------|-------------|
| id | UUID, primary key |
| guild_id | UUID, foreign key to guilds, non-nullable, indexed |
| name | e.g., "Collect 500 SCU Gold" |
| description | JSONB: `{"brief": "", "tactical": "", "classified": "", "metrics": {}}` |
| preferences | Linked user traits (e.g., mining, combat) |
| categories | Outcome groups (e.g., Economy, Military) |
| priority | Urgency level (e.g., Low, Medium, High) |
| applicable_rank | Visibility restricted to rank or lower |
| progress | JSONB, AI-parsed (e.g., {"gold_scu": 100}) |
| tasks | Array of UUIDs, foreign keys to tasks |
| lead_id | UUID, foreign key to users |
| squad_id | UUID, foreign key to squads |

### Tasks
| Attribute | Description |
|-----------|-------------|
| id | UUID, primary key |
| objective_id | UUID, foreign key to objectives, non-nullable |
| guild_id | UUID, foreign key to guilds, non-nullable, indexed |
| name | e.g., "Scout Route" |
| description | Details |
| status | e.g., Pending, In Progress, Completed, Failed |
| priority | Urgency level |
| progress | JSONB, AI-generated |
| self_assignment | Boolean; allows users to sign up (with limits, e.g., 1-5 users) |
| lead_id | UUID, foreign key to users |
| squad_id | UUID, foreign key to squads |
| schedule | JSONB: `{"start": "", "end": "", "duration": "", "flexible": true, "timezone": "UTC"}` |

**Structure**: Sub-hierarchical under objectives; supports pre-assigned, multiple assignees, AI-suggested signups/scheduling.

### Objective Categories
| Attribute | Description |
|-----------|-------------|
| id | UUID, primary key |
| guild_id | UUID, foreign key to guilds, non-nullable, indexed |
| name | e.g., Economy, Military |
| description | Details |

**Structure**: Independent for grouping objectives by outcome.

## Features
### Revenue Model
Freemium focused on guild upgrades (no player plans):
- **Free Tier**:
  - Self-registration auto-creates persistent personal (solo) guild (full access as leader, non-deletable via is_deletable=false).
  - Unlimited join/create (up to 3 total guilds, including personal).
  - Each guild capped at 2 members (configurable per `type`, e.g., 10 for farming).
  - Invite 1 member per guild.
  - Full persistent access to personal guild; easy switching (UI/session-based).
  - Leave/kicked: Auto-switch to personal guild (always active).
- **Guild Plans (per-guild, leader-subscribed)**:
  - Free: 2 members.
  - Tier 1 ($5/mo): 10 members.
  - Tier 2 ($15/mo): 50 members.
  - Tier 3 ($50/mo): Unlimited members, in-app donations (mock Stripe for MVP), exports/data transfer, post-MVP AI analytics.
- Hooks: Middleware enforces limits (e.g., 402 on exceed); configurable X per `type`.
- Extensibility: Higher free X for non-gaming (e.g., 10 for farming co-ops).

### User Authentication
- Credentials (username or email/password/SSO), PIN for voice access.
- Username and email unique; username required, email optional.
- MFA (web/client, e.g., SMS/email code).
- Auto-deactivation after failed attempts (configurable).
- Auto-logoff after inactivity.

### User Authorization
- Granular RBAC with rank defaults + user overrides.
- Tier checks on join/invite; switching via current_guild_id.
- Guild deletion: Personal guilds non-deletable (403 if is_deletable=false). Non-personal: Restricted to creator_id (403 otherwise).

### User Actions
- **Administrative**: High-rank users manage users/ranks/guilds; overrides allow flexibility. Only creator deletes non-personal guilds; personal guilds never deleted.
- **Self-Managed**: Update profile, authenticate, sign up/withdraw tasks, switch guilds (PATCH /api/users/{id}/switch-guild).
- **System Admin**: Manage guild approvals, billing (post-MVP).

## Development Sequence
1. **Phase 1**: Auth (register, login, PIN, status).
2. **Phase 2**: Guild management (switch, invite/join, leave/kick, delete).
3. **Phase 3**: Objectives/tasks (create, report, notify).
4. **Phase 4**: User access CRUD, invite management UI.

## Repository Notes
- Tests organized by functionality: tests/auth_tests.py, guild_tests.py, objective_tests.py, login_polish_tests.py.
- No eject of Create React App; use react-app-rewired for webpack overrides.
- License: Apache 2.0 (`LICENSE`).
- Sensitive Files: `docs/`, `.env`, `.env.local`, `env/`, `__pycache__/`, `.vscode/` in `.gitignore`; history clean.
- Credentials: Use env vars (e.g., DB_PASS in .env.local).
- Pre-Commit Hook: Block sensitive files.
- Current Files: `app/core/models.py` (SQLAlchemy models), `app/api/routes.py`, `app/api/admin_routes.py` (endpoints), `db/schema/` (SQL backups), `frontend/src/App.tsx` (React entry), `tsconfig.json` (TypeScript config), `tests/test_admin_crud.py` (unit tests), `wingman-ai/skills/sphereconnect/` (production skill), `wingman-ai/configs/_SphereConnect/` (UEE Commander config).
- Schema Verification: All entities include `guild_id` (non-nullable, indexed); no mismatches in `app/core/models.py` or `db/schema/`.
- Voice subset: Switch guild, create objective, report progress; exclude invite/join/leave/kick (web-only, post-MVP).