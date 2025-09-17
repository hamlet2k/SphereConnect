# SphereConnect Use Cases and Flows (v1.1)

This document outlines key use cases and interaction flows for the SphereConnect MVP, modularized by functionality. Flows are visualized using Mermaid sequence diagrams for clarity. Update as needed for new features or refinements. Aligns with `mvp_grok.markdown` v17.

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
    B->>D: Create default Access Levels (e.g., manage_users)
    B->>D: Create CO Rank (access_levels array)
    B->>D: Assign User.rank=CO, current_guild_id=Guild.id
    note over B,D: If invite_code: Process join
    B-->>W: 201 {user_id, guild_id}
    W->>U: Redirect to Login.tsx ("Registered!")
```

### Edge Cases
- Duplicate username/email: 409 error, UI alert.
- Invalid input: 422 error, form validation.

## Module 2: Login
### Use Case: User Login
- **Persona**: User (Solo Player, Guild Member, Guild Leader).
- **Goal**: Authenticate, default to personal guild (`current_guild_id`).
- **Preconditions**: Registered user.
- **Success Criteria**: JWT issued, redirect to AdminDashboard with guild context.
- **Flow**:
```mermaid
sequenceDiagram
    participant U as User
    participant W as Web PWA (Login.tsx)
    participant B as Backend (/api/auth/login)
    participant D as Database
    U->>W: Enter username or email, password
    W->>B: POST {username_or_email, password}
    B->>D: Validate credentials (bcrypt), check lockout
    D-->>B: User (current_guild_id)
    alt current_guild_id null
        B->>D: Query personal Guild (is_solo=true, creator_id=user.id)
        D-->>B: Set current_guild_id=personal.id
    end
    B->>D: Create UserSession (id=uuid4, user_id, token_hash, expires_at)
    D-->>B: Session created
    B-->>W: 200 {access_token, refresh_token, current_guild_id, guild_name}
    W->>U: Set GuildContext, redirect to AdminDashboard ("Logged in as {name} | {guild_name}")
```

### Edge Cases
- Invalid credentials: 401, increment failed_attempts.
- Locked account: 423, wait 15min.
### Notes
- Voice Subset: Login not available via Wingman AI (web-only for security).

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
    W->>U: Refresh dashboard (filter objectives/tasks)
    Note right of W: Voice: Wingman AI "Switch to guild [name]" → API
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

### Use Case: Leave/Kick from Guild
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
- Voice Subset: Includes “Switch to guild [name]”, “Invite member to guild [name]”, “Join guild with code [code]”, “Leave guild [name]”. Excludes rank management, guild deletion (web-only).

## Module 4: Objective/Task Management (TBD)
- **Use Case**: Create Objective (e.g., "Collect 500 SCU Gold").
- **Persona**: User (Guild Leader/Member with permission).
- **Voice Subset**: Includes “Create objective [name]”, “Report progress [details]” (TBD).

## Updates Log
- v1.0 (2025-09-16): Initial flows for Registration, Login, Guild Management.
- v1.1 (2025-09-16): Updated Login for username/email, added voice subset notes.