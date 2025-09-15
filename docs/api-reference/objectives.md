# Objectives API Reference

The Objectives API provides comprehensive endpoints for managing guild mission objectives in SphereConnect.

## Overview

Objectives represent high-level missions or goals that guild members work toward. Each objective can contain multiple tasks, have different priority levels, and include structured descriptions with varying security classifications.

## Base URL
```
http://localhost:8000/api
```

## Authentication
All API requests require JWT authentication:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### List Objectives

Get all objectives accessible to the authenticated user.

```http
GET /api/objectives
```

**Query Parameters:**
- `guild_id` (UUID): Filter by specific guild
- `status` (string): Filter by status (active, completed, cancelled)
- `priority` (string): Filter by priority (critical, high, medium, low)
- `category` (string): Filter by category
- `assigned_to` (UUID): Filter by assigned user
- `limit` (integer): Limit results (default: 50, max: 100)
- `offset` (integer): Pagination offset (default: 0)

**Response (200):**
```json
{
  "objectives": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "guild_id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Secure Trade Route Alpha",
      "description": {
        "brief": "Protect merchant vessels traveling to Port Olisar",
        "tactical": "Deploy escort squadrons at key checkpoints",
        "classified": "Intelligence reports indicate pirate activity",
        "metrics": {
          "vessels_protected": 0,
          "interceptions": 0
        }
      },
      "category": "Security",
      "priority": "high",
      "progress": 0.0,
      "status": "active",
      "lead_id": "550e8400-e29b-41d4-a716-446655440003",
      "squad_id": "550e8400-e29b-41d4-a716-446655440004",
      "applicable_rank": "NCO",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

### Create Objective

Create a new objective.

```http
POST /api/objectives
```

**Request Body:**
```json
{
  "name": "Mine 1000 SCU Quantanium",
  "description": {
    "brief": "Extract Quantanium from Crusader system",
    "tactical": "Use Orion for mining operations",
    "classified": "Coordinates: sector 7-4-2",
    "metrics": {
      "scu_mined": 0,
      "target_scu": 1000
    }
  },
  "category": "Mining",
  "priority": "medium",
  "lead_id": "550e8400-e29b-41d4-a716-446655440003",
  "squad_id": "550e8400-e29b-41d4-a716-446655440004",
  "applicable_rank": "Recruit"
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "guild_id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Mine 1000 SCU Quantanium",
  "description": {
    "brief": "Extract Quantanium from Crusader system",
    "tactical": "Use Orion for mining operations",
    "classified": "Coordinates: sector 7-4-2",
    "metrics": {
      "scu_mined": 0,
      "target_scu": 1000
    }
  },
  "category": "Mining",
  "priority": "medium",
  "progress": 0.0,
  "status": "active",
  "lead_id": "550e8400-e29b-41d4-a716-446655440003",
  "squad_id": "550e8400-e29b-41d4-a716-446655440004",
  "applicable_rank": "Recruit",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "tts_response": "Objective 'mine 1000 scu quantanium' created successfully"
}
```

### Get Objective

Retrieve a specific objective by ID.

```http
GET /api/objectives/{id}
```

**Path Parameters:**
- `id` (UUID): Objective ID

**Response (200):** Same as create response

**Error Responses:**
- `404`: Objective not found
- `403`: Insufficient permissions

### Update Objective

Update an existing objective.

```http
PATCH /api/objectives/{id}
```

**Path Parameters:**
- `id` (UUID): Objective ID

**Request Body:** (partial update supported)
```json
{
  "name": "Mine 1500 SCU Quantanium",
  "description": {
    "metrics": {
      "scu_mined": 250,
      "target_scu": 1500
    }
  },
  "priority": "high",
  "status": "in_progress"
}
```

**Response (200):** Updated objective object

### Update Progress

Update objective progress metrics.

```http
PATCH /api/objectives/{id}/progress
```

**Path Parameters:**
- `id` (UUID): Objective ID

**Request Body:**
```json
{
  "progress": 25.0,
  "description": {
    "metrics": {
      "scu_mined": 250
    }
  }
}
```

**Response (200):** Updated objective object

### Delete Objective

Delete an objective (admin only).

```http
DELETE /api/objectives/{id}
```

**Path Parameters:**
- `id` (UUID): Objective ID

**Response (204):** No content

## Data Models

### Objective Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Auto | Unique identifier |
| guild_id | UUID | Auto | Associated guild |
| name | string | Yes | Objective name |
| description | object | No | Structured description |
| category | string | No | Category (Mining, Combat, etc.) |
| priority | string | No | Priority level |
| progress | float | Auto | Completion percentage (0-100) |
| status | string | Auto | Current status |
| lead_id | UUID | No | Objective lead user |
| squad_id | UUID | No | Assigned squad |
| applicable_rank | string | No | Minimum rank to view |
| created_at | datetime | Auto | Creation timestamp |
| updated_at | datetime | Auto | Last update timestamp |

### Description Object

| Field | Type | Description |
|-------|------|-------------|
| brief | string | High-level overview (all ranks) |
| tactical | string | Detailed execution plan |
| classified | string | Sensitive information (restricted) |
| metrics | object | Progress tracking data |

## Categories

Predefined categories:
- `Mining`: Resource extraction operations
- `Combat`: Military engagements
- `Security`: Protection and defense
- `Economy`: Trade and commerce
- `Exploration`: Discovery missions
- `Transport`: Cargo and passenger movement

## Priorities

Priority levels (descending order):
- `critical`: Immediate attention required
- `high`: Important, time-sensitive
- `medium`: Standard priority
- `low`: Can be deferred

## Status Values

- `active`: Currently in progress
- `completed`: Successfully finished
- `cancelled`: Terminated before completion
- `on_hold`: Temporarily paused

## Permissions

### View Permissions
- Users can view objectives where `applicable_rank` ≤ their rank
- Guild admins can view all objectives
- Classified sections only visible to officers+

### Edit Permissions
- Objective leads can update their objectives
- Guild officers can update any objective
- Only admins can delete objectives

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid request data |
| 401 | Authentication required |
| 403 | Insufficient permissions |
| 404 | Objective not found |
| 409 | Conflict (e.g., duplicate name) |
| 422 | Validation error |

## Rate Limits

- List: 100 requests per minute
- Create: 20 requests per minute
- Update: 50 requests per minute
- Delete: 10 requests per minute

## WebSocket Events

Real-time updates via WebSocket:

```javascript
// Objective created
{
  "event": "objective_created",
  "data": { /* objective object */ }
}

// Objective updated
{
  "event": "objective_updated",
  "data": { /* objective object */ }
}

// Progress updated
{
  "event": "objective_progress",
  "data": {
    "id": "uuid",
    "progress": 25.0,
    "metrics": { /* updated metrics */ }
  }
}
```

## Examples

### Create Mining Objective
```bash
curl -X POST "http://localhost:8000/api/objectives" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Extract Quantanium",
    "category": "Mining",
    "priority": "medium",
    "description": {
      "brief": "Mine Quantanium in Crusader",
      "metrics": {"target": 1000}
    }
  }'
```

### Update Progress
```bash
curl -X PATCH "http://localhost:8000/api/objectives/550e8400-e29b-41d4-a716-446655440001/progress" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "progress": 50.0,
    "description": {
      "metrics": {"current": 500}
    }
  }'
```

### List Active Objectives
```bash
curl "http://localhost:8000/api/objectives?status=active&limit=10" \
  -H "Authorization: Bearer <token>"