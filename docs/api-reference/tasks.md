# Tasks API Reference

The Tasks API provides endpoints for managing individual tasks within objectives, including assignment, scheduling, and progress tracking.

## Overview

Tasks are specific, actionable items that contribute to objective completion. They can be assigned to users or squads, scheduled with flexible timing, and tracked for progress.

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

### List Tasks

Get all tasks accessible to the authenticated user.

```http
GET /api/tasks
```

**Query Parameters:**
- `objective_id` (UUID): Filter by parent objective
- `guild_id` (UUID): Filter by guild
- `assignee_id` (UUID): Filter by assigned user
- `squad_id` (UUID): Filter by assigned squad
- `status` (string): Filter by status
- `priority` (string): Filter by priority
- `due_before` (datetime): Filter by due date
- `due_after` (datetime): Filter by start date
- `limit` (integer): Limit results (default: 50)
- `offset` (integer): Pagination offset

**Response (200):**
```json
{
  "tasks": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440005",
      "objective_id": "550e8400-e29b-41d4-a716-446655440001",
      "guild_id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Scout Route Alpha",
      "description": "Survey the trade route for potential hazards",
      "status": "in_progress",
      "priority": "high",
      "progress": 0.0,
      "self_assignment": true,
      "lead_id": "550e8400-e29b-41d4-a716-446655440003",
      "squad_id": "550e8400-e29b-41d4-a716-446655440004",
      "schedule": {
        "start": "2024-01-15T14:00:00Z",
        "end": "2024-01-15T16:00:00Z",
        "duration": 120,
        "flexible": false,
        "timezone": "UTC"
      },
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

### Create Task

Create a new task within an objective.

```http
POST /api/tasks
```

**Request Body:**
```json
{
  "objective_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Mine Quantanium Deposit",
  "description": "Extract 500 SCU from the designated asteroid",
  "priority": "medium",
  "self_assignment": true,
  "schedule": {
    "start": "2024-01-15T14:00:00Z",
    "duration": 180,
    "flexible": true,
    "timezone": "UTC"
  }
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440005",
  "objective_id": "550e8400-e29b-41d4-a716-446655440001",
  "guild_id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Mine Quantanium Deposit",
  "description": "Extract 500 SCU from the designated asteroid",
  "status": "pending",
  "priority": "medium",
  "progress": 0.0,
  "self_assignment": true,
  "schedule": {
    "start": "2024-01-15T14:00:00Z",
    "end": null,
    "duration": 180,
    "flexible": true,
    "timezone": "UTC"
  },
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "tts_response": "Task 'mine quantanium deposit' created successfully"
}
```

### Get Task

Retrieve a specific task by ID.

```http
GET /api/tasks/{id}
```

**Path Parameters:**
- `id` (UUID): Task ID

**Response (200):** Task object

### Update Task

Update an existing task.

```http
PATCH /api/tasks/{id}
```

**Path Parameters:**
- `id` (UUID): Task ID

**Request Body:** (partial updates supported)
```json
{
  "name": "Mine Rich Quantanium Deposit",
  "status": "in_progress",
  "progress": 25.0,
  "description": "Updated coordinates provided"
}
```

**Response (200):** Updated task object

### Assign Task

Assign a task to a user or squad.

```http
POST /api/tasks/assign
```

**Request Body:**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440005",
  "assignee_id": "550e8400-e29b-41d4-a716-446655440003",
  "squad_id": "550e8400-e29b-41d4-a716-446655440004"
}
```

**Response (200):** Updated task object

### Schedule Task

Update task scheduling information.

```http
PATCH /api/tasks/{id}/schedule
```

**Path Parameters:**
- `id` (UUID): Task ID

**Request Body:**
```json
{
  "schedule": {
    "start": "2024-01-15T15:00:00Z",
    "end": "2024-01-15T17:30:00Z",
    "duration": 150,
    "flexible": false,
    "timezone": "UTC"
  }
}
```

**Response (200):** Updated task object

### Delete Task

Delete a task (admin only).

```http
DELETE /api/tasks/{id}
```

**Path Parameters:**
- `id` (UUID): Task ID

**Response (204):** No content

## Data Models

### Task Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Auto | Unique identifier |
| objective_id | UUID | Yes | Parent objective |
| guild_id | UUID | Auto | Associated guild |
| name | string | Yes | Task name |
| description | string | No | Detailed description |
| status | string | Auto | Current status |
| priority | string | No | Priority level |
| progress | float | Auto | Completion percentage |
| self_assignment | boolean | No | Allow self-assignment |
| lead_id | UUID | No | Task lead user |
| squad_id | UUID | No | Assigned squad |
| schedule | object | No | Scheduling information |
| created_at | datetime | Auto | Creation timestamp |
| updated_at | datetime | Auto | Last update timestamp |

### Schedule Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| start | datetime | No | Scheduled start time |
| end | datetime | No | Scheduled end time |
| duration | integer | No | Duration in minutes |
| flexible | boolean | No | Allow flexible timing |
| timezone | string | No | Timezone (default: UTC) |

## Status Values

- `pending`: Not yet started
- `in_progress`: Currently being worked on
- `completed`: Successfully finished
- `cancelled`: Terminated before completion
- `on_hold`: Temporarily paused

## Priority Levels

- `critical`: Immediate attention required
- `high`: Important, time-sensitive
- `medium`: Standard priority
- `low`: Can be deferred

## Permissions

### View Permissions
- Users can view tasks in their objectives
- Squad members can view squad-assigned tasks
- Guild admins can view all tasks

### Edit Permissions
- Task assignees can update their tasks
- Objective leads can update tasks in their objectives
- Guild officers can update any task
- Only admins can delete tasks

### Assignment Permissions
- Self-assignment if `self_assignment` is true
- Objective leads can assign tasks
- Guild officers can assign any task

## Validation Rules

### Schedule Validation
- `start` and `end` must be valid datetime strings
- `duration` must be positive integer (minutes)
- If `end` is provided, it must be after `start`
- `timezone` must be valid timezone identifier

### Assignment Validation
- `assignee_id` must be valid user in guild
- `squad_id` must be valid squad in guild
- User must have appropriate rank for task
- Task must not be already assigned if exclusive

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid request data or validation error |
| 401 | Authentication required |
| 403 | Insufficient permissions |
| 404 | Task not found |
| 409 | Task already assigned or conflict |
| 422 | Schedule validation error |

## Rate Limits

- List: 100 requests per minute
- Create: 30 requests per minute
- Update: 60 requests per minute
- Assign: 40 requests per minute
- Delete: 10 requests per minute

## WebSocket Events

Real-time task updates:

```javascript
// Task created
{
  "event": "task_created",
  "data": { /* task object */ }
}

// Task updated
{
  "event": "task_updated",
  "data": { /* task object */ }
}

// Task assigned
{
  "event": "task_assigned",
  "data": {
    "task_id": "uuid",
    "assignee_id": "uuid",
    "squad_id": "uuid"
  }
}

// Progress updated
{
  "event": "task_progress",
  "data": {
    "id": "uuid",
    "progress": 50.0
  }
}
```

## Examples

### Create a Scheduled Task
```bash
curl -X POST "http://localhost:8000/api/tasks" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "objective_id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Patrol Sector 7",
    "description": "Monitor sector 7 for pirate activity",
    "priority": "high",
    "schedule": {
      "start": "2024-01-15T20:00:00Z",
      "duration": 120,
      "flexible": false
    }
  }'
```

### Assign Task to User
```bash
curl -X POST "http://localhost:8000/api/tasks/assign" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "550e8400-e29b-41d4-a716-446655440005",
    "assignee_id": "550e8400-e29b-41d4-a716-446655440003"
  }'
```

### Update Task Progress
```bash
curl -X PATCH "http://localhost:8000/api/tasks/550e8400-e29b-41d4-a716-446655440005" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "progress": 75.0,
    "status": "in_progress"
  }'
```

### List Tasks by Status
```bash
curl "http://localhost:8000/api/tasks?status=in_progress&limit=20" \
  -H "Authorization: Bearer <token>"