# SphereConnect MVP Specification: Star Citizen Focus (v6)

## Overview
SphereConnect is a multitenant AI-assisted app for Star Citizen guild coordination, enhancing management with users (members), ranks (roles), objectives (missions), tasks, authentication, access, voice interaction (via Wingman-AI as-is), templates, and notifications. Not a voice chat replacement; designed for extensibility to non-gaming (e.g., city farming). Prioritizes seamless voice-driven flows with minimal config for adoption.

**Key Principles**:
- Multitenancy: Independent, private guild interactions via `guild_id` (single schema for MVP).
- AI Immersion: Single UEE Commander persona; AI parses voice for progress/metrics (e.g., SCU tracking).
- Security: Deny-by-default; explicit grants. Use env vars for DB creds.
- Seamless Flows: Voice-driven creation, defaults (e.g., auto ad-hoc squads), AI suggestions.
- Minimum Requirements: Baselines; extensions OK if value > complexity.
- Extensibility: Modular (e.g., JSON templates).
- License: Apache 2.0 for patent protection and contributions.
- Repository: Sensitive files (`docs/`, `.env`, `.env.local`, `env/`, `__pycache__/`, `.vscode/`) in `.gitignore`; history clean.

## Disclaimers
- Attributes for guidance, not schemas.
- Docs Offline: Store in `docs/` (`.gitignore`) to protect IP; share via NDAs.
- All TBDs Resolved: Objective description sections (JSONB), Task scheduling (JSONB), Advanced AI personas (single UEE Commander).
- Deferred: Discord integration (post-MVP).

## System Architecture
### Central System
- Multitenant backend (AWS Lambda/RDS Free Tier or local Flask/FastAPI for PoC).
- AI Config: Single UEE Commander persona with system/user prompts.
- Push Updates: Real-time objective/task/notifications (AI-filtered by preferences/squads).
- Config: Web UI (access-based).
- Database: PostgreSQL "sphereconnect" with single schema and guild_id filtering.

### Local Client
- Auth: Credentials/SSO/PIN.
- Voice: Wingman-AI as-is (custom skill for APIs; fallback to defaults).
- Updates: Receive/send objective/task/notifications.
- UI: Game overlay; profile/settings.
- Keybinds: Custom (PTT via Wingman-AI).
- Fallback: Web links for extended functions.

### Game Overlay UI
- Transparent, Star Citizen-themed.
- Displays (on-demand/pushed):
  - User/Squad info.
  - System time.
  - Applicable objectives/tasks (filtered by priority, preferences, categories, AI best-fit).
  - Active/Assigned objectives/tasks (progress/priorities).
  - Notifications.

### Wingman-AI Integration
- As-is client; custom skill for APIs (create objectives, assign tasks, report progress, schedule tasks).
- STT/TTS/LLM (e.g., Whisper/ElevenLabs/OpenAI).
- PoC: Validate skill with 90%+ accuracy, <2s latency, seamless UX (FastAPI/Flask endpoints, tests included).
- Fallback: Clear feedback for non-SphereConnect commands.

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
| guild_id    | UUID, foreign key. |
| name        | Display name. |
| phonetic    | Voice recognition. |
| availability| Session/online status (voice-declarable). |
| rank        | Assigned. |
| preferences | Traits (e.g., mining, combat). |
| password    | Auth. |
| pin         | 6-digit voice access. |
| squad_id    | Group for filtering. |

### AI Commander
| Attribute     | Description |
|---------------|-------------|
| id           | UUID, primary key. |
| guild_id     | UUID, foreign key. |
| name         | Default: UEE Commander. |
| phonetic     | Voice recognition. |
| system_prompt| Default: 'Act as a UEE Commander, coordinating Star Citizen guild missions with formal, strategic responses.' |
| user_prompt  | Custom tone. |

### Squads
| Attribute   | Description |
|-------------|-------------|
| id         | UUID, primary key. |
| guild_id   | UUID, foreign key. |
| name       | Identifier. |
| squad_lead | Assigned user. |

**Structure**: Groups for filtering; auto ad-hoc via voice if undefined.

### Ranks
| Attribute    | Description |
|--------------|-------------|
| id          | UUID, primary key. |
| guild_id    | UUID, foreign key. |
| name        | e.g., Recruit, NCO. |
| phonetic    | Voice. |
| access_levels| Hierarchical + custom overrides. |

**Structure**: Military pyramid; overrides for flexibility (e.g., NCO recruiting).

### Access Levels
| Attribute    | Description |
|--------------|-------------|
| id          | UUID, primary key. |
| guild_id    | UUID, foreign key. |
| name        | e.g., Recruiting. |
| user_actions| Grouped. |

**Structure**: Independent; assigned to ranks/users.

### Objectives
| Attribute      | Description |
|----------------|-------------|
| id            | UUID, primary key. |
| guild_id      | UUID, foreign key. |
| name          | e.g., "Collect 500 SCU Gold". |
| description   | JSONB: `{"brief": "", "tactical": "", "classified": "", "metrics": {}}`. |
| preferences   | Linked traits. |
| categories    | Outcome groups (e.g., Economy). |
| priority      | Urgency. |
| applicable_rank | Visibility (default rank-or-lower). |
| progress      | AI-parsed (e.g., SCU from voice). |
| tasks         | Sub-components. |
| lead_id       | User. |
| squad_id      | Group. |

### Tasks
| Attribute      | Description |
|----------------|-------------|
| id            | UUID, primary key. |
| objective_id  | UUID, foreign key. |
| guild_id      | UUID, foreign key. |
| name          | e.g., "Scout Route". |
| description   | Details. |
| status        | e.g., In Progress. |
| priority      | Urgency. |
| progress      | AI-generated. |
| self_assignment | Yes/No; limits (1-X users). |
| lead_id       | User. |
| squad_id      | Group. |
| schedule      | JSONB: `{"start": "", "end": "", "duration": "", "flexible": true, "timezone": "UTC"}`. |

**Structure**: Sub-hierarchical; supports pre-assign, multiples, AI-suggested signup/scheduling.

### Objective Categories
| Attribute    | Description |
|--------------|-------------|
| id          | UUID, primary key. |
| guild_id    | UUID, foreign key. |
| name        | e.g., Economy. |
| description | Details. |

**Structure**: Independent for outcome grouping.

## Features
### User Authentication
- Credentials/Password/SSO; PIN for voice.
- MFA (web/client).
- Auto-Deactivation: Failed attempts.
- Auto-Logoff: Inactivity.

### User Authorization
- Limited by rank + overrides.
- Visibility: Configurable (default rank-or-lower; `classified` section restricted).

### User Actions
#### Administrative
- Admin users/ranks/preferences/objectives/tasks.
- Assign/remove: Ranks, preferences, tasks/squads.
- Update priorities/statuses.
- Manage access levels/permissions.
- AI prompt mods.

#### Self-Managed
- Profile updates.
- Auth/logoff.
- Signup/withdraw tasks (limits).
- Update task statuses.
- Declare availability/online.
- Retrieve filtered lists (AI-assisted).

## User Interfaces
- **Web**: Mobile-friendly PWA (React).
- **Client Overlay**: Transparent for game.
- **Voice**: Wingman-AI skill (seamless).

## Development Sequence
1. **Wingman-AI PoC (Weeks 1-4)**: Skill for objectives/tasks/progress/scheduling; test with community (generated code ready).
2. **Auth & Security (Weeks 5-6)**: Cognito/PIN/MFA, access levels.
3. **Entities & Database (Weeks 7-8)**: PostgreSQL "sphereconnect", single schema with guild_id.
4. **Admin/Self Actions (Weeks 9-10)**: CRUD with defaults.
5. **Overlay UI & Notifications (Weeks 11-12)**: React PWA, AWS SNS.
6. **Analytics (Week 13)**: AI debriefs.

## Repository Notes
- License: Apache 2.0 (`LICENSE`).
- Sensitive Files: Keep `docs/`, `.env`, `.env.local`, `env/`, `__pycache__/`, `.vscode/` in `.gitignore`; history clean.
- Credentials: Use env vars (e.g., DB_PASS in .env.local).
- Pre-Commit Hook: Block sensitive files.