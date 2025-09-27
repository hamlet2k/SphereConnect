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

## 3. Personas
- **User**: Any participant (solo, member, leader). Access depends on rank and overrides.
- **System Administrator**: Oversees platform-level operations (approvals, billing).
- **Guild Leader**: Pays for upgrades, manages members and guild features.
- **Guild Member**: Uses leader-provided features.
- **Solo Player**: Free tier with personal guild.

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
- **Guilds**: Core organizational units; personal guilds undeletable.
- **Users**: Registered participants with ranks, preferences, and multiple guild memberships.
- **Invites & Requests**: Control entry into guilds via codes and approvals.
- **AI Commander**: Default persona for immersive interactions.
- **Squads**: Sub-groups for objectives and tasks.
- **Ranks & Access Levels**: Define permissions, with a non-revocable `super_admin` for guild creators.
- **Objectives & Tasks**: Hierarchical mission and sub-task tracking.
- **Categories**: Grouping of objectives by outcomes (e.g., economy, military).

(Detailed schemas are provided in [`project_data_structures.md`](./project_data_structures.md).)

---

## 6. Features
### Revenue Model
- **Free Tier**: Personal guilds, max 2 members per guild, up to 3 guilds per user.
- **Paid Guild Plans**: Tiered member limits with Stripe integration (mock in MVP).

### Authentication & Authorization
- Login with username/email + password, MFA optional.
- Voice PIN for Wingman-AI.
- RBAC with ranks, access levels, overrides.
- Personal guilds undeletable; non-personal guilds deletable only by creator.

### User Actions
- **Admins**: Manage users, guilds, ranks, access.
- **Members**: Update profile, join/leave guilds, sign up for tasks.
- **System Admins**: Approvals and billing.

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

