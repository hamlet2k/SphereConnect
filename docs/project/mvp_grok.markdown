# SphereConnect MVP Specification: Star Citizen Focus (v10)

## Overview
SphereConnect is a multitenant AI-assisted app for Star Citizen guild coordination, enhancing management with users (members), ranks (roles), objectives (missions), tasks, authentication, access control, optional voice interaction (via Wingman-AI as-is), game-specific templates, and notifications. Not a replacement for voice chats; integrable with platforms like Discord (deferred). Designed for extensibility to non-gaming communities (e.g., city farming with production goals as objectives). Prioritizes seamless flows with minimal configuration for adoption.

**Key Principles**:
- **Multitenancy**: Independent, private guild interactions via `guild_id` in a single PostgreSQL schema for MVP, enforced across all entities (Guilds, Users, AICommander, Squads, Ranks, Access Levels, Objectives, Tasks, Objective Categories).
- **AI Immersion**: Single UEE Commander persona via Wingman-AI for voice; AI parses inputs for progress/metrics (e.g., SCU tracking) and outputs responses.
- **Security**: Deny-by-default access; explicit grants required. Use environment variables for database credentials.
- **Seamless Flows**: Voice-driven creation with defaults (e.g., auto ad-hoc squads), AI suggestions for task assignments/scheduling.
- **Bypass**: Full functionality available without voice via webapp (React PWA with TypeScript) or local client (game overlay), connecting directly to SphereConnect API.
- **AI Scope for MVP**: Delegate STT/TTS/LLM (e.g., Whisper/ElevenLabs/OpenAI) to Wingman-AI's as-is client for voice command parsing and feedback. SphereConnect backend handles data only, storing metrics for Wingman-AI to process.
- **Minimum Requirements**: Deliver baseline features; extensions allowed if they add value without complexity.
- **Extensibility**: Modular design (e.g., JSON templates for objectives/tasks) adaptable to non-gaming domains.
- **License**: Apache 2.0 for patent protection and community contributions.
- **Repository**: Sensitive files (`docs/`, `.env`, `.env.local`, `env/`, `__pycache__/`, `.vscode/`) in `.gitignore`; history clean.

## Disclaimers
- Attributes are for guidance, not strict database schemas.
- Docs stored offline in `docs/` (`.gitignore`) to protect IP; share via NDAs with testers.
- All TBDs Resolved: Objective description sections (JSONB), Task scheduling (JSONB), Advanced AI personas (single UEE Commander).
- Deferred: Discord integration (post-MVP).

## System Architecture
### Central System (SphereConnect Backend)
- Multitenant backend using AWS Lambda/RDS Free Tier or local Flask/FastAPI for PoC.
- AI Configuration: Single UEE Commander persona with system/user prompts, managed by Wingman-AI.
- Push Updates: Real-time objective/task/notifications, AI-filtered by preferences/squads to avoid spam.
- Configuration: Web-based UI (React PWA with TypeScript) for settings, restricted by user access.
- Database: PostgreSQL "sphereconnect" with single schema, guild_id filtering for multitenancy.
- API: FastAPI/Flask endpoints (`app/api/routes.py`) for objectives, tasks, progress, scheduling, with guild_id required.

### Local Client (Game Overlay)
- Authentication: Credentials/SSO/PIN, integrating with backend API.
- Voice Interaction: Optional via Wingman-AI as-is (custom skill in `wingman-ai/skills/sphereconnect/main.py` maps voice to API calls).
- Updates: Sends/receives objective/task/notifications via SphereConnect API.
- UI: Transparent, Star Citizen-themed game overlay for in-game display.
- Keybinds: Customizable (e.g., PTT for Wingman-AI voice commands).
- Bypass: Connects directly to SphereConnect API for text-based interactions, bypassing Wingman-AI when unavailable or for non-voice use cases.

### Webapp (React PWA)
- Mobile-friendly Progressive Web App using React with TypeScript (`.tsx` files, `frontend/src/App.tsx`, `tsconfig.json`).
- Full interface for all functionalities: user management, objective/task CRUD, settings.
- Voice is a subset—bypasses Wingman-AI via direct API calls or text inputs.
- Responsive design with Material-UI or Chakra UI.

### Game Overlay UI
- Transparent, Star Citizen-themed display over game.
- Displays (on-demand or pushed):
  - User/Squad information.
  - System time (for scheduled tasks).
  - Applicable objectives/tasks, filtered by priority, preferences, categories, and AI best-fit (based on availability/signup queue).
  - Active/Assigned objectives/tasks with progress and priorities.
  - System/user notifications.

### Wingman-AI Integration
- As-is local client handles all voice processing: STT (e.g., Whisper) for command parsing, LLM (e.g., OpenAI) for intent detection and metric/schedule parsing, TTS (e.g., ElevenLabs) for responses.
- Custom skill in `wingman-ai/skills/sphereconnect/main.py` maps voice commands (e.g., "Create objective: Collect 500 SCU Gold", "Assign task Scout Route to Pilot X", "Delivered 100 SCU Gold", "Schedule task for 20 minutes now") to SphereConnect API endpoints (`app/api/routes.py`).
- Config in `wingman-ai/configs/_SphereConnect/UEE Commander.yaml` sets prompts, API URL (`http://localhost:8000/api`), and voice settings.
- PoC Status: Passed with 90%+ accuracy, <2s latency, seamless UX (FastAPI/Flask endpoints, tests in `tests/`).
- Fallback: Clear TTS feedback for non-SphereConnect commands (e.g., "Not a SphereConnect command, executing in-game action").
- Note: SphereConnect backend (`app/`) contains no STT/TTS/LLM or hardware management—fully standalone.

## Entities
### Guilds
| Attribute | Description |
|-----------|-------------|
| id        | UUID, primary key. |
| name      | Guild name. |

### Users
| Attribute    | Description |
|--------------|-------------|
| id          | UUID, primary key. |
| guild_id    | UUID, foreign key to guilds, non-nullable, indexed. |
| name        | Display name. |
| phonetic    | For voice recognition (via Wingman-AI). |
| availability| Session/online status (voice or text-declarable). |
| rank        | Assigned rank (e.g., Recruit, NCO). |
| preferences | Traits (e.g., mining, combat, transport). |
| password    | For authentication (hashed with bcrypt). |
| pin         | 6-digit code for voice access. |
| squad_id    | UUID, foreign key to squads for group filtering. |

### AI Commander
| Attribute     | Description |
|---------------|-------------|
| id           | UUID, primary key. |
| guild_id     | UUID, foreign key to guilds, non-nullable, indexed. |
| name         | Default: UEE Commander. |
| phonetic     | For voice recognition. |
| system_prompt| Default: 'Act as a UEE Commander, coordinating Star Citizen guild missions with formal, strategic responses.' |
| user_prompt  | Custom tone per user interaction. |

### Squads
| Attribute   | Description |
|-------------|-------------|
| id         | UUID, primary key. |
| guild_id   | UUID, foreign key to guilds, non-nullable, indexed. |
| name       | Squad identifier. |
| squad_lead | UUID, foreign key to users. |

**Structure**: Groups for filtering tasks/notifications; auto ad-hoc creation via voice if undefined.

### Ranks
| Attribute     | Description |
|---------------|-------------|
| id           | UUID, primary key. |
| guild_id     | UUID, foreign key to guilds, non-nullable, indexed. |
| name         | e.g., Recruit, NCO, Commander. |
| phonetic     | For voice recognition. |
| access_levels| Hierarchical permissions with custom overrides (e.g., NCO-specific recruiting). |

**Structure**: Military-style pyramid; higher ranks inherit lower access levels.

### Access Levels
| Attribute    | Description |
|--------------|-------------|
| id          | UUID, primary key. |
| guild_id    | UUID, foreign key to guilds, non-nullable, indexed. |
| name        | e.g., Recruiting, Mission Development. |
| user_actions| Grouped actions permitted. |

**Structure**: Independent groups assigned to ranks/users for flexibility.

### Objectives
| Attribute       | Description |
|-----------------|-------------|
| id             | UUID, primary key. |
| guild_id       | UUID, foreign key to guilds, non-nullable, indexed. |
| name           | e.g., "Collect 500 SCU Gold". |
| description    | JSONB: `{"brief": "", "tactical": "", "classified": "", "metrics": {}}` (e.g., brief: "UEE orders...", classified restricted by rank). |
| preferences    | Linked user traits (e.g., mining, combat). |
| categories     | Outcome groups (e.g., Economy, Military). |
| priority       | Urgency level (e.g., Low, Medium, High). |
| applicable_rank| Visibility restricted to rank or lower (configurable). |
| progress       | JSONB, AI-parsed from voice inputs (e.g., {"gold_scu": 100}). |
| tasks          | Array of UUIDs, foreign keys to tasks. |
| lead_id        | UUID, foreign key to users. |
| squad_id       | UUID, foreign key to squads. |

### Tasks
| Attribute       | Description |
|-----------------|-------------|
| id             | UUID, primary key. |
| objective_id   | UUID, foreign key to objectives, non-nullable. |
| guild_id       | UUID, foreign key to guilds, non-nullable, indexed. |
| name           | e.g., "Scout Route". |
| description    | Details. |
| status         | e.g., Pending, In Progress, Completed, Failed. |
| priority       | Urgency level. |
| progress       | JSONB, AI-generated (e.g., completion metrics). |
| self_assignment| Boolean; allows users to sign up (with limits, e.g., 1-X users). |
| lead_id        | UUID, foreign key to users. |
| squad_id       | UUID, foreign key to squads. |
| schedule       | JSONB: `{"start": "", "end": "", "duration": "", "flexible": true, "timezone": "UTC"}` (e.g., {"start": "2025-09-13T21:00:00Z", "duration": "20m"}). |

**Structure**: Sub-hierarchical under objectives; supports pre-assigned, multiple assignees, AI-suggested signups/scheduling.

### Objective Categories
| Attribute    | Description |
|--------------|-------------|
| id          | UUID, primary key. |
| guild_id    | UUID, foreign key to guilds, non-nullable, indexed. |
| name        | e.g., Economy, Military. |
| description | Details. |

**Structure**: Independent for grouping objectives by outcome.

## Features
### User Authentication
- Credentials (username/password/SSO), PIN for voice access.
- MFA (web/client, e.g., SMS/email code).
- Auto-deactivation after failed attempts (configurable via interface).
- Auto-logoff after inactivity.

### User Authorization
- Actions restricted by rank-based access levels with custom overrides.
- Visibility: Objectives/tasks visible only to applicable ranks (configurable; default rank-or-lower; `classified` section restricted).

### User Actions
#### Administrative
- Manage users, ranks, preferences, objectives, tasks (create/update/delete).
- Assign/remove ranks, preferences, tasks, or squads to users.
- Update priorities/statuses for objectives/tasks.
- Manage access levels and permissions (including overrides, e.g., NCO recruiting).
- Modify AI Commander prompts (system/user).

#### Self-Managed
- Update user profile (e.g., preferences, availability).
- Authenticate/log off.
- Sign up/withdraw from tasks (if self-assignment allowed, with limits).
- Update assigned task statuses.
- Declare online status/availability (voice or text).
- Retrieve filtered lists of objectives/tasks (AI-assisted by preferences/rank).

## User Interfaces
- **Web (React PWA)**: Mobile-friendly, full management of all features (users, objectives, tasks, settings). Bypasses Wingman-AI for text-based interactions. Uses TypeScript (`.tsx` files) with Material-UI/Chakra UI.
- **Game Overlay**: Transparent, Star Citizen-themed, connects to SphereConnect API for in-game display (objectives, tasks, notifications). Bypasses Wingman-AI for non-voice use.
- **Voice**: Wingman-AI skill (`wingman-ai/skills/sphereconnect/`) for seamless commands; subset of webapp functionality.

## Development Sequence
1. **Wingman-AI PoC (Weeks 1-4, Completed)**: Custom skill (`wingman-ai/skills/sphereconnect/main.py`) maps voice commands to API endpoints (/objectives, /tasks/assign, /objectives/progress, /tasks/schedule). Achieved 90%+ accuracy, <2s latency, seamless UX. Removed `app/api/wingman_skill_poc.py` for layer separation.
2. **Auth & Security (Weeks 5-6)**: Implement Cognito/PIN/MFA, access levels with guild_id filtering.
3. **Entities & Database (Weeks 7-8, Completed)**: PostgreSQL "sphereconnect" with single schema, guild_id filtering. Schemas implemented (Guild, Users, Objective, Task, AICommander, Squads, Ranks, Access Levels, Objective Categories in `app/core/models.py`, `db/schema/`).
4. **Admin/Self Actions (Weeks 9-10, In Progress)**: CRUD operations for users, ranks, objectives, tasks via webapp (React PWA with TypeScript).
5. **Overlay UI & Notifications (Weeks 11-12)**: React PWA, game overlay, AWS SNS for notifications.
6. **Analytics (Week 13)**: AI-driven debriefs from stored metrics (post-MVP LLM assessment).

## Repository Notes
- **License**: Apache 2.0 (`LICENSE`).
- **Sensitive Files**: `docs/`, `.env`, `.env.local`, `env/`, `__pycache__/`, `.vscode/` in `.gitignore`; history clean.
- **Credentials**: Use env vars (e.g., DB_PASS in .env.local).
- **Pre-Commit Hook**: Block sensitive files (e.g., via pre-commit package).
- **Current Files**: `app/core/models.py` (SQLAlchemy models), `app/api/routes.py` (PoC endpoints), `db/schema/` (SQL backups), `frontend/src/App.tsx` (React entry), `tsconfig.json` (TypeScript config), `tests/test_admin_crud.py` (unit tests), `wingman-ai/skills/sphereconnect/` (production skill), `wingman-ai/configs/_SphereConnect/` (UEE Commander config).
- **Schema Verification**: All entities include `guild_id` (non-nullable, indexed) for multitenancy; no mismatches in `app/core/models.py` or `db/schema/`.