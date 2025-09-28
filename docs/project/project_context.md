# Sphere Connect – Project Context

This file provides a concise **functional and technical overview** of Sphere Connect. It is intended for IDE agents (Copilot, Kilocode, Codex, etc.) to give them a frame of reference when generating or completing code.

---

## Table of Contents
1. [Overview & Vision](#1-overview--vision)
2. [Functional Goals](#2-functional-goals)
3. [Personas](#3-personas)
4. [Architecture](#4-architecture)
5. [Entities (Summary)](#5-entities-summary)
6. [Features](#6-features)
7. [Development Sequence](#7-development-sequence)
8. [Repository Notes](#8-repository-notes)
9. [References](#references)

---

## 1. Overview & Vision
Sphere Connect is a **multitenant AI-powered app** for community organization and management. Initial focus is sandbox MMO games (e.g., *Star Citizen*), but the architecture is designed to extend to non-gaming collectives (e.g., farming co-ops, professional groups).

**Core goals:**
- Enhance coordination among members.
- Provide immersive AI support via Wingman-AI persona.
- Ensure scalability and secure multitenancy.
- Maintain modular extensibility for future use cases.

---

## 2. Functional Goals
- Member and guild management (registration, invites, approvals).
- Roles and permissions with RBAC.
- Objectives and tasks with priorities and progress tracking.
- Real-time events and notifications.
- Voice integration via Wingman-AI (optional).
- JSON-based templates for extensibility.
- Secure defaults: deny-by-default, explicit grants.
- Access across web, game overlay, and optionally mobile.

---

## 4. Architecture
### Central Backend
- **Stack**: FastAPI (Python), PostgreSQL, containerized (AWS Lambda/RDS for scale or local PoC).
- **Multitenancy**: Single schema filtered by `guild_id`.
- **Endpoints**: Objectives, tasks, progress, scheduling, user management.
- **AI Delegation**: STT/TTS/LLM handled by Wingman-AI; backend manages structured data only.

### Local Client (Game Overlay)
- Transparent UI overlay themed for *Star Citizen*.
- Auth via credentials/SSO/PIN.
- Optional Wingman-AI integration for voice.
- Supports text-based fallback.

### Webapp (React PWA)
- React + TypeScript with Chakra UI.
- Full CRUD on guilds, users, tasks, and settings.
- Mobile-friendly, responsive.

### Wingman-AI Integration
- Uses Whisper (STT), OpenAI (LLM), ElevenLabs (TTS).
- Custom skill maps voice commands to backend API calls.
- Configurable via YAML.
- Tested PoC: <2s latency, >90% accuracy.

---

## 5. Entities (Summary)
- **Guilds**: Core organizational units; personal guilds undeletable; non-personal guilds deletable only by creator.
- **Users**: Registered participants with ranks, preferences, and multiple guild memberships.
- **Invites & Requests**: Control entry into guilds via codes and approvals.
- **AI Commander**: AI persona for immersive interactions.
- **Squads**: User groups; can be assigned to objectives and tasks.
- **Ranks & Access Levels**: Define permissions, with a non-revocable `super_admin` for guild creators.
- **Objectives & Tasks**: Hierarchical mission and sub-task tracking.
- **Categories**: For grouping of objectives by outcomes (e.g., economy, military).

(Detailed schemas are provided in [`project_data_structures.md`](./project_data_structures.md).)

---

## 3. Commercials
### Revenue Model
- **Free Tier**: Personal guild, max 2 members per guild, up to 3 guilds per user (own + 2 joins).
- **Paid Guild Plans**: Tiered member limits with Stripe integration. Unlocks unlimited joins.
  - **Tier 1:** 10 guild members.
  - **Tier 2:** 50 guild members, in-app donations.
  - **Tier 3:** Unlimited guild members, in-app donations, AI analytics.

### Customers
- **Guild Leader**: Pays for upgrades, manages members and guild features.
- **Guild Member**: Uses leader-provided features.
- **Solo Player**: Free tier with personal guild.

---

## 6. Features

### User Roles
- **System Administrator**: Oversees platform-level operations (approvals, billing).
- **Guild Admins**: Guild owner, Manage users, guilds, ranks, access.
- **Users/Members**: Update profile, join/leave guilds, sign up for tasks.

### Authentication
- Login with username/email + password, MFA optional.
- Voice PIN for Wingman-AI.
- Auto-deactivation after failed attempts (configurable).
- Auto-logoff after inactivity.

### Authorization & Access Control Model

- Hierarchical, flexible RBAC system:
- Deny-by-default: all actions require explicit grants via access levels.
  
#### 1. User Actions (atomic permissions)
- The most granular unit of access, mapped directly to functionality in the codebase.
- Examples: `create_objective`, `delete_guild`, `view_tasks`.
- All access control checks in the backend reference **user actions**.

#### 2. Access Levels (bundles of actions)
- Groupings of related user actions for easier management.
- Customizable per guild — admins can mix and match actions into new access levels.
- Example: `manage_guilds` might include `view_guilds`, `edit_guilds`, `delete_guilds`.

#### 3. Ranks (organizational roles)
- Containers of access levels.
- Represent guild hierarchy (Recruit, NCO, Officer, CO).
- Assigning a rank to a user grants them all access levels linked to that rank.

#### 4. User Permissions = Rank + Overrides
- A user inherits all access levels from their rank(s).
- Overrides allow **direct assignment of access levels** to a user in addition to their rank.
- Overrides are always at the **access level** layer, not raw user actions.
- This enables flexibility: e.g. one NCO can be given Recruiting permissions without redefining the NCO rank.

#### 5. Super Admin
- Special non-revocable access level, automatically granted to guild creators.
- Always includes **all current and future user actions**.
- Always bypasses access checks.
- Cannot be modified or deleted.

#### 6. Defaults
- System ships with sensible **default ranks** (Recruit, NCO, Officer, CO) and **default access levels** (grouped around major UI areas).
- Guild admins may modify or create new ones to match their organizational needs.

---

## 7. Development Sequence
1. Authentication (register, login, PIN, status).
2. Guild management (switch, invite/join, leave/kick, approvals).
3. Objectives and tasks (CRUD, progress, notifications).
4. Access management (ranks, levels, overrides).

---

## 8. Repository Notes
- Tests grouped by feature (auth, guild, objectives, etc.).
- React app uses CRA with react-app-rewired (no eject).
- Voice subset in MVP: guild switching, objective creation, progress reporting. Invite/join/leave/kick remain web-only initially.

---

## 9. References
- Active backlog: see [`TODO.md`](../../TODO.md)
- Detailed **flows**: see [`project_flows.md`](./project_flows.md).
- Detailed **data structures**: see [`project_data_structures.md`](./project_data_structures.md).

