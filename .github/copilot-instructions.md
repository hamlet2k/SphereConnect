# SphereConnect AI Coding Assistant Instructions

## Project Context
SphereConnect is a **multitenant AI-powered coordination platform** for Star Citizen guilds. Key architectural principles:

For more details, see: `docs/project/project_context.md`

- **Multitenant by Design**: All entities filtered by `guild_id` - never cross-tenant data leaks
- **Deny-by-Default Security**: All actions require explicit RBAC grants via access levels and ranks
- **Voice-First Integration**: Wingman-AI handles STT/TTS/LLM, backend manages structured data only
- **Enterprise-Grade**: JWT auth, MFA, rate limiting, audit logging, PostgreSQL with UUIDs

## Core Architecture Patterns

### Database & ORM
- **PostgreSQL + SQLAlchemy**: All models in `app/core/models.py` with UUID primary keys
- **Array Fields**: `allowed_ranks`, `categories`, `tasks` use PostgreSQL arrays with UUIDs
- **JSONB**: Flexible fields like `description`, `progress` for extensibility
- **String/UUID Conversion**: Always convert between string UUIDs (API) and UUID objects (DB)

```python
# Correct pattern for UUID arrays
allowed_rank_uuids = [uuid.UUID(rank_id) for rank_id in update.allowed_ranks]
objective.allowed_ranks = allowed_rank_uuids
```

### API Patterns (`app/api/routes.py`, `app/api/admin_routes.py`)
- **Access Control**: Use `check_*_access()` functions before any operation
- **Guild Isolation**: Verify `current_user.guild_id` matches target entity's `guild_id`
- **Complete Responses**: Return full entity data after creates/updates, not just messages
- **Error Handling**: Always rollback on exceptions, use specific HTTP status codes

```python
# Standard endpoint pattern
@router.put("/entities/{entity_id}")
async def update_entity(entity_id: str, update: EntityUpdate, 
                       current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    if not check_entity_access(current_user, db, "manage_entities"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Guild isolation check
    if str(current_user.guild_id) != str(entity.guild_id):
        raise HTTPException(status_code=403, detail="Guild access denied")
```

### RBAC System
- **Three Layers**: User Actions → Access Levels → Ranks
- **Super Admin**: Non-revocable, auto-granted to guild creators, bypasses all checks
- **Action Mapping**: Functions like `view_objectives`, `manage_guilds` map to user permissions
- **Rank Hierarchy**: Lower `hierarchy_level` = higher rank (Commander=1, Recruit=6)

### Frontend Integration (`frontend/src/`)
- **API Contexts**: Use `ObjectivesAPI.tsx`, `GuildContext.tsx` for centralized API calls
- **Auth Flow**: JWT tokens in localStorage, auto-refresh, PIN verification for voice
- **Form Patterns**: Always validate required fields, handle loading states, show errors

## Development Workflows

### Server Startup
```bash
python scripts/start_server.py  # FastAPI on :8000
npm start                       # React frontend on :3000 (from frontend/)
```

### Testing Strategy
```bash
pytest tests/ -m auth          # Auth-specific tests
pytest tests/ -m guild         # Guild management tests
pytest tests/ -m objective     # Objective/task tests
pytest --cov=app --cov-report=html  # Coverage reporting
```

### Database Operations
```bash
python scripts/db_init.py             # Initialize schema
python scripts/add_objective_allowed_ranks.py  # Migration example
python scripts/test_data.py           # Seed test data
```

## Critical Integration Points

### Wingman-AI Voice Commands (`wingman-ai/skills/sphereconnect/main.py`)
- Maps natural language to API calls with retry logic and error handling
- Authenticates via JWT tokens stored in skill config
- Supports: create objectives, switch guilds, progress updates, task assignments
- Voice PIN verification for secure operations

### Data Type Conversions
- **API Input/Output**: String UUIDs in JSON
- **Database Storage**: UUID objects for foreign keys and arrays
- **Frontend Display**: String UUIDs, resolve to names for user-friendly display
- **Rank Filtering**: Always convert to strings for `allowed_ranks` comparisons

### Error Patterns to Avoid
- ❌ `if update.allowed_ranks:` (misses empty arrays)
- ✅ `if update.allowed_ranks is not None:`
- ❌ Direct string/UUID comparison in filters
- ✅ Convert both sides to same type before comparison
- ❌ Returning success messages without entity data
- ✅ Return complete updated entity after operations

## Project-Specific Conventions

### File Organization
- `app/api/routes.py`: Core user-facing endpoints
- `app/api/admin_routes.py`: Admin/management endpoints  
- `docs/project/`: Canonical documentation (context, flows, data structures)
- `scripts/`: Database utilities, server startup, data seeding
- `tests/`: Grouped by feature with pytest markers

### Code Style
- Type hints required on all functions
- Logging via `logger = logging.getLogger(__name__)`
- Database sessions via dependency injection: `db: Session = Depends(get_db)`
- Exception handling with transaction rollbacks

### Documentation Updates
When making structural changes, update:
1. `docs/project/ai_output_history.md` (append new entry)
2. Relevant flow diagrams in `docs/project/project_flows.md`
3. Entity definitions in `docs/project/project_data_structures.md`