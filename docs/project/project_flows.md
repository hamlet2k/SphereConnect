# Sphere Connect – Project Flows

This file describes the **use case flows** of Sphere Connect, with Mermaid diagrams for clarity.

For detailed data entities referenced here, see [`project_data_structures.md`](./project_data_structures.md). For the broader project context, see [`project_context.md`](./project_context.md).

---

## Table of Contents
1. [Registration](#1-registration)
2. [Login](#2-login)
3. [Guild Management](#3-guild-management)
   - [Switch Guild](#switch-guild)
   - [Invite & Join](#invite--join)
   - [Approval / Leave / Kick](#approval--leave--kick)
4. [Objective & Task Management](#4-objective--task-management)
5. [Invite Management](#5-invite-management)
6. [Access Level Management](#6-access-level-management)
7. [Notes](#notes)
8. [Entities Referenced in These Flows](#entities-referenced-in-these-flows)

---

## 1. Registration
```mermaid
sequenceDiagram
    participant U as User
    participant W as Web PWA (Register.tsx)
    participant B as Backend (/api/auth/register)
    participant D as Database
    U->>W: Enter username, email (optional), password, PIN, invite_code?
    W->>B: POST {username, email?, password, PIN, invite_code?}
    B->>D: Validate & hash, check uniqueness
    D-->>B: User created
    B->>D: Create personal guild (is_solo=true)
    B->>D: Create default access levels and CO rank
    B->>D: Assign super_admin access
    opt Invite code
        B->>D: Create GuildRequest (pending)
    end
    B-->>W: 201 {user_id, guild_id}
    W->>U: Redirect to login
```

---

## 2. Login
```mermaid
sequenceDiagram
    participant U as User
    participant W as Web PWA (Login.tsx)
    participant B as Backend (/api/auth/login, /api/auth/verify-pin)
    participant D as Database
    U->>W: Enter username/email, password, status
    W->>B: POST /api/auth/login
    B->>D: Validate credentials
    D-->>B: User with current_guild_id
    alt null current_guild_id
        B->>D: Assign personal guild
    end
    B->>D: Create UserSession
    B-->>W: 200 {access_token, guild_id}
    opt Voice PIN
        U->>W: Enter PIN
        W->>B: POST /api/auth/verify-pin
        B->>D: Validate PIN
        B-->>W: 200 OK
    end
    W->>B: PATCH update user status
    B-->>W: Success
    W->>U: Redirect to dashboard
```

---

## 3. Guild Management
### Switch Guild
```mermaid
sequenceDiagram
    participant U as User
    participant W as Web PWA
    participant B as Backend (/api/users/{id}/switch-guild)
    participant D as Database
    U->>W: Select guild
    W->>B: PATCH {guild_id}
    B->>D: Verify membership
    B->>D: Update current_guild_id
    D-->>B: Success
    B-->>W: 200 {guild_id}
    W->>U: Refresh dashboard
```

### Invite & Join
```mermaid
sequenceDiagram
    participant L as Leader
    participant M as Member
    participant W as Web PWA
    participant B as Backend (/api/invites, /api/users/{id}/join)
    participant D as Database
    L->>W: Click Invite
    W->>B: POST /api/invites
    B->>D: Check member_limit
    alt Over limit
        B-->>W: 402 Payment Required
    else
        B->>D: Create invite code
        D-->>B: code
        B-->>W: 201 {invite_code}
    end
    L->>M: Share code
    M->>W: Enter code
    W->>B: POST /api/users/{id}/join
    B->>D: Validate code, check limit
    alt Approval required
        B->>D: Create GuildRequest (pending)
    else
        B->>D: Add user to guild
    end
    D-->>B: Success
    B-->>W: 200 OK
```

### Approval / Leave / Kick
- **Approval**: Leader approves/rejects pending requests.
- **Leave/Kick**: User leaves or is removed, auto-switch to personal guild.

---

## 4. Objective & Task Management
```mermaid
sequenceDiagram
    participant U as User
    participant W as Web PWA (ObjectiveForm.tsx)
    participant B as Backend (/api/objectives)
    participant D as Database
    U->>W: Enter objective details
    W->>B: POST /api/objectives
    B->>D: Create objective linked to guild
    D-->>B: Objective.id
    B-->>W: 201 {objective_id}
    W->>U: Show in dashboard
```

---

## 5. Invite Management
```mermaid
sequenceDiagram
    participant U as User
    participant W as Web PWA (InviteManagement.tsx)
    participant B as Backend (/api/invites)
    participant D as Database
    U->>W: View invite codes
    W->>B: GET /api/invites?guild_id
    B->>D: Fetch invites
    D-->>B: Invite list
    B-->>W: 200 {invites}
    U->>W: Create or delete invite
    W->>B: POST/DELETE /api/invites
    B->>D: Update DB
    D-->>B: Success
    B-->>W: OK
```

---

## 6. Access Level Management
```mermaid
sequenceDiagram
    participant U as User
    participant W as Web PWA (AccessLevelManager.tsx)
    participant B as Backend (/api/admin/access-levels)
    participant D as Database
    U->>W: Manage access levels
    W->>B: GET/POST/PATCH/DELETE requests
    B->>D: Validate and update access levels
    D-->>B: Success/Failure
    B-->>W: Response
```

---

## Notes
- Voice subset (MVP): guild switching, objective creation, progress reporting.
- Other flows (invite/join/leave/kick) remain web-only until later phases.

---

## Entities Referenced in These Flows
- [Users](./project_data_structures.md#2-users)
- [Guilds](./project_data_structures.md#1-guilds)
- [Invites & Requests](./project_data_structures.md#3-invites--requests)
- [Objectives](./project_data_structures.md#7-objectives)
- [Tasks](./project_data_structures.md#8-tasks)
- [Ranks & Access Levels](./project_data_structures.md#6-ranks--access-levels)

