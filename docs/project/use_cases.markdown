# SphereConnect Use Cases and Flows (v1.4)

This document outlines key use cases and interaction flows for the SphereConnect MVP, modularized by functionality. Flows are visualized using Mermaid sequence diagrams for clarity. Update as needed for new features or refinements. Aligns with `mvp_grok.markdown` v20.

## Module 1: Registration
### Use Case: User Registration
- **Persona**: User (Solo Player buyer persona).
- **Goal**: Register, auto-create personal guild (`is_solo=true`, `is_deletable=false`), gain full access (except delete).
- **Preconditions**: No existing user.
- **Success Criteria**: User and personal guild in DB, redirect to login.
- **Flow**:
```mermaid
sequenceDiagram
    participant U as User
    participant W as Web PWA (Register.tsx)
    participant B as Backend (/api/auth/register)
    participant D as Database
    U->>W: Enter username, email (optional), password, PIN, invite_code?
    W->>B: POST {username, email?, password, PIN, invite_code?}
    B->>D: Validate & hash (bcrypt), check username/email uniqueness
    D-->>B: User created (id, current_guild_id=null)
    B->>D: Create personal Guild (is_solo=true, is_deletable=false, creator_id=user.id)
    D-->>B: Guild.id
    B->>D: Commit Guild (ensure FK for access_levels)
    B->>D: Create default Access Levels (view_guilds, manage_guilds, objectives)
    B->>D: Create CO Rank (access_levels array)
    B->>D: Assign User.rank=CO, current_guild_id=Guild.id
    note over B,D: If invite_code: Process join
    B-->>W: 201 {user_id, guild_id}
    W->>U: Redirect to Login.tsx ("Registered!")
```
### Edge Cases
- Duplicate username/email: 409 error, UI alert.
- Invalid input: 422 error, form validation.
- Invalid invite_code: 422 error, UI alert.

## Module 2: Login
### Use Case: User Login with PIN and Status
- **Persona**: User (Solo Player, Guild Member, Guild Leader).
- **Goal**: Authenticate, verify PIN (voice), set online status/availability, default to personal guild.
- **Preconditions**: Registered user.
- **Success Criteria**: JWT issued, PIN verified, status updated, redirect to AdminDashboard.
- **Flow**:
```mermaid
sequenceDiagram
    participant U as User
    participant W as Web PWA (Login.tsx)
    participant B as Backend (/api/auth/login, /api/auth/verify-pin)
    participant D as Database
    U->>W: Enter username/email, password, online status, availability
    W->>B: POST /api/auth/login {username_or_email, password}
    B->>D: Validate credentials, check lockout
    D-->>B: User (current_guild_id)
    alt current_guild_id null
        B->>D: Set to personal guild
    end
    B->>D: Create UserSession
    B-->>W: 200 {access_token, refresh_token, current_guild_id, guild_name}
    opt Voice Auth
        U->>W: Enter PIN
        W->>B: POST /api/auth/verify-pin {pin}
        B->>D: Validate PIN
        B-->>W: 200 OK
    end
    W->>B: PATCH /api/users/{id}/update-status {online, availability}
    B->>D: Update User
    W->>U: Redirect to AdminDashboard
```
### Edge Cases
- Invalid PIN: 401, retry.
- Voice Subset: PIN verification (“Verify PIN [code]”), not full login.

## Module 3: Guild Management
### Use Case: Guild Switching
- **Persona**: User (Solo Player, Guild Member).
- **Goal**: Switch active guild (personal or joined/created), persist in context.
- **Preconditions**: Logged in, multiple guilds.
- **Success Criteria**: Dashboard filters by new `current_guild_id`.
- **Flow**:
```mermaid
sequenceDiagram
    participant U as User
    participant W as Web PWA (AdminDashboard.tsx)
    participant B as Backend (/api/users/{id}/switch-guild)
    participant D as Database
    U->>W: Select guild from dropdown
    W->>B: PATCH {guild_id}
    B->>D: Verify user in guild (Invites/GuildRequests)
    B->>D: Update User.current_guild_id
    D-->>B: Success
    B-->>W: 200 {current_guild_id}
    W->>U: Refresh dashboard (filter by guild_id)
    Note right of W: Voice: "Switch to guild [name]"
```

### Use Case: Invite and Join
- **Persona**: User (Guild Leader for invite, Solo Player/Member for join).
- **Goal**: Invite member (limited by `member_limit`), join via code.
- **Preconditions**: Leader in guild, under limit.
- **Success Criteria**: Invite created, member added, 402 if over limit.
- **Flow**:
```mermaid
sequenceDiagram
    participant L as Leader
    participant M as Member
    participant W as Web PWA (AdminDashboard.tsx)
    participant B as Backend (/api/invites, /api/users/{id}/join)
    participant D as Database
    L->>W: Click "Invite"
    W->>B: POST /api/invites {guild_id}
    B->>D: Check member_limit (e.g., 2 free)
    alt Over limit
        B-->>W: 402 Payment Required
    else Under limit
        B->>D: Create Invite (code, uses_left=1)
        D-->>B: code
        B-->>W: 201 {invite_code}
    end
    L->>M: Share code
    M->>W: Enter code (Register/Dashboard)
    W->>B: POST /api/users/{id}/join {invite_code}
    B->>D: Validate code, check limit
    B->>D: Add user to guild, update current_guild_id
    D-->>B: Success
    B-->>W: 200 OK
```

### Use Case: Leave/Kick
- **Persona**: User (Guild Member for leave, Guild Leader for kick).
- **Goal**: Leave/kick, auto-switch to personal guild.
- **Preconditions**: User in guild.
- **Success Criteria**: Removed from guild, `current_guild_id` = personal.
- **Flow**:
```mermaid
sequenceDiagram
    participant U as User (Member)
    participant L as Leader
    participant W as Web PWA (AdminDashboard.tsx)
    participant B as Backend (/api/users/{id}/leave, /api/admin/users/{id}/kick)
    participant D as Database
    U->>W: Click "Leave Guild"
    W->>B: POST /api/users/{id}/leave {guild_id}
    B->>D: Remove from guild
    B->>D: Set current_guild_id=personal
    D-->>B: Success
    B-->>W: 200 OK
    W->>U: Switch to personal dashboard
    L->>W: Click "Kick {user}"
    W->>B: POST /api/admin/users/{id}/kick
    B->>D: Check RBAC (manage_users)
    B->>D: Remove user, set their current_guild_id=personal
    D-->>B: Success
    B-->>W: 200 OK
    Note over B,U: Notify via WebSocket/push
```
### Notes
- Voice Subset: Only “Switch to guild [name]”. Excludes invite/join/leave/kick (web-only, post-MVP).

## Module 4: Objective/Task Management
### Use Case: Create Objective
- **Persona**: User (with create_objective permission).
- **Goal**: Create objective, assign tasks, report progress.
- **Flow**:
```mermaid
sequenceDiagram
    participant U as User
    participant W as Web PWA (ObjectiveForm.tsx)
    participant B as Backend (/api/objectives)
    participant D as Database
    U->>W: Enter objective details
    W->>B: POST /api/objectives {name, description, ...}
    B->>D: Create Objective (guild_id=current_guild_id)
    D-->>B: Objective.id
    B-->>W: 201 {objective_id}
    W->>U: Show objective in table
    Note right of W: Voice: "Create objective [name]"
```

## Module 5: Invite Management
### Use Case: Manage Invite Codes
- **Persona**: User (with manage_guilds permission).
- **Goal**: Create, view, delete invite codes for a guild.
- **Flow**:
```mermaid
sequenceDiagram
    participant U as User
    participant W as Web PWA (InviteManagement.tsx)
    participant B as Backend (/api/invites, /api/admin/invites/{code})
    participant D as Database
    U->>W: View invite codes in table
    W->>B: GET /api/invites?guild_id={current_guild_id}
    B->>D: Fetch invites for guild
    D-->>B: Invite list
    B-->>W: 200 {invites}
    U->>W: Click "Create Invite"
    W->>B: POST /api/invites {guild_id}
    B->>D: Create Invite (code, uses_left=1)
    D-->>B: code
    B-->>W: 201 {invite_code}
    U->>W: Click "Delete" on invite
    W->>B: DELETE /api/admin/invites/{code}
    B->>D: Remove invite
    D-->>B: Success
    B-->>W: 204 No Content
```

## Updates Log
- v1.0 (2025-09-16): Initial flows for Registration, Login, Guild Management.
- v1.1 (2025-09-16): Updated Login for username/email, added voice subset notes.
- v1.4 (2025-09-17): Added invite management, clarified RBAC, updated voice subset.