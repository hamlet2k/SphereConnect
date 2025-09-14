# Copyright 2025 Federico Arce. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid
from datetime import datetime, timedelta
import re
from ..core.models import (
    Objective, Task, Guild, Squad, AICommander, User,
    get_db, create_tables
)

router = APIRouter()

# Pydantic models for request/response
class ObjectiveCreate(BaseModel):
    name: str
    description: Optional[Dict[str, Any]] = {"brief": "", "tactical": "", "classified": "", "metrics": {}}
    categories: Optional[List[str]] = []
    priority: Optional[str] = "Medium"
    applicable_rank: Optional[str] = "Recruit"
    guild_id: str
    squad_id: Optional[str] = None

class ObjectiveUpdate(BaseModel):
    description: Optional[Dict[str, Any]] = None
    progress: Optional[Dict[str, Any]] = None
    categories: Optional[List[str]] = None
    priority: Optional[str] = None

class TaskCreate(BaseModel):
    name: str
    objective_id: str
    description: Optional[str] = None
    guild_id: str
    squad_id: Optional[str] = None
    priority: Optional[str] = "Medium"

class TaskAssign(BaseModel):
    task_id: str
    user_id: str
    squad_id: Optional[str] = None

class TaskSchedule(BaseModel):
    task_id: str
    schedule: Dict[str, Any]

class ProgressUpdate(BaseModel):
    objective_id: Optional[str] = None
    task_id: Optional[str] = None
    metrics: Dict[str, Any]

# Helper functions
def parse_metrics_from_text(text: str) -> Dict[str, Any]:
    """Parse metrics from voice command text"""
    metrics = {}

    # Parse SCU amounts
    scu_match = re.search(r'(\d+)\s*SCU\s*([a-zA-Z]+)', text, re.IGNORECASE)
    if scu_match:
        amount = int(scu_match.group(1))
        resource_type = scu_match.group(2).lower()
        metrics[f"{resource_type}_scu"] = amount

    # Parse generic numbers with units
    generic_match = re.search(r'(\d+)\s*([a-zA-Z]+)', text, re.IGNORECASE)
    if generic_match and not scu_match:  # Avoid duplicate parsing
        amount = int(generic_match.group(1))
        unit = generic_match.group(2).lower()
        metrics[unit] = amount

    return metrics

def parse_schedule_from_text(text: str) -> Dict[str, Any]:
    """Parse schedule information from voice command text"""
    schedule = {"flexible": True, "timezone": "UTC"}

    # Parse time durations
    duration_match = re.search(r'(\d+)\s*minute', text, re.IGNORECASE)
    if duration_match:
        minutes = int(duration_match.group(1))
        schedule["start"] = (datetime.utcnow() + timedelta(minutes=minutes)).isoformat()
        schedule["duration"] = f"{minutes}m"
        schedule["flexible"] = False

    # Parse specific times
    if "now" in text.lower():
        schedule["start"] = datetime.utcnow().isoformat()
        schedule["flexible"] = False

    return schedule

def create_adhoc_squad(db: Session, guild_id: str, user_id: str = None) -> str:
    """Create an ad-hoc squad if none exists"""
    # For ad-hoc, just create a new squad without checking existing
    # Since user_id might be None or random

    # Create new ad-hoc squad
    squad = Squad(
        id=uuid.uuid4(),
        guild_id=uuid.UUID(guild_id),
        name=f"Ad-hoc Squad - {datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        lead_id=None  # Don't set lead_id for ad-hoc squad
    )
    db.add(squad)
    db.commit()
    return str(squad.id)

# API Endpoints
@router.post("/objectives")
async def create_objective(objective: ObjectiveCreate, db: Session = Depends(get_db)):
    """Create a new objective"""
    try:
        obj_id = uuid.uuid4()
        guild_uuid = uuid.UUID(objective.guild_id)

        # Create ad-hoc squad if not provided
        squad_id = objective.squad_id
        if not squad_id:
            # For demo purposes, use a default user_id - in production this would come from auth
            squad_id = create_adhoc_squad(db, objective.guild_id, str(uuid.uuid4()))

        new_objective = Objective(
            id=obj_id,
            guild_id=guild_uuid,
            name=objective.name,
            description=objective.description,
            categories=objective.categories,
            priority=objective.priority,
            applicable_rank=objective.applicable_rank,
            squad_id=uuid.UUID(squad_id) if squad_id else None
        )

        db.add(new_objective)
        db.commit()

        return {
            "id": str(obj_id),
            "message": f"Objective '{objective.name}' created successfully",
            "tts_response": f"Objective created: {objective.name}"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create objective: {str(e)}")

@router.get("/objectives/{objective_id}")
async def get_objective(objective_id: str, db: Session = Depends(get_db)):
    """Get objective details"""
    try:
        obj_uuid = uuid.UUID(objective_id)
        objective = db.query(Objective).filter(Objective.id == obj_uuid).first()

        if not objective:
            raise HTTPException(status_code=404, detail="Objective not found")

        return {
            "id": str(objective.id),
            "name": objective.name,
            "description": objective.description,
            "categories": objective.categories,
            "priority": objective.priority,
            "progress": objective.progress,
            "tasks": objective.tasks
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid objective ID format")

@router.patch("/objectives/{objective_id}")
async def update_objective(objective_id: str, update: ObjectiveUpdate, db: Session = Depends(get_db)):
    """Update objective progress or description"""
    try:
        obj_uuid = uuid.UUID(objective_id)
        objective = db.query(Objective).filter(Objective.id == obj_uuid).first()

        if not objective:
            raise HTTPException(status_code=404, detail="Objective not found")

        if update.description:
            # Merge with existing description
            current_desc = objective.description or {}
            current_desc.update(update.description)
            objective.description = current_desc

        if update.progress:
            # Update progress metrics
            current_progress = objective.progress or {}
            current_progress.update(update.progress)
            objective.progress = current_progress

        if update.categories:
            objective.categories = update.categories

        if update.priority:
            objective.priority = update.priority

        db.commit()

        return {
            "message": "Objective updated successfully",
            "tts_response": "Objective updated"
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid objective ID format")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update objective: {str(e)}")

@router.patch("/objectives/{objective_id}/progress")
async def update_objective_progress(objective_id: str, progress: ProgressUpdate, db: Session = Depends(get_db)):
    """Update objective progress with parsed metrics"""
    try:
        obj_uuid = uuid.UUID(objective_id)
        objective = db.query(Objective).filter(Objective.id == obj_uuid).first()

        if not objective:
            raise HTTPException(status_code=404, detail="Objective not found")

        # Update metrics in description
        current_desc = objective.description or {}
        current_metrics = current_desc.get("metrics", {})
        current_metrics.update(progress.metrics)
        current_desc["metrics"] = current_metrics
        objective.description = current_desc

        # Update progress tracking
        current_progress = objective.progress or {}
        current_progress.update(progress.metrics)
        objective.progress = current_progress

        db.commit()

        return {
            "message": "Progress updated successfully",
            "tts_response": f"Progress updated: {progress.metrics}"
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid objective ID format")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update progress: {str(e)}")

@router.post("/tasks")
async def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task"""
    try:
        task_id = uuid.uuid4()
        objective_uuid = uuid.UUID(task.objective_id)
        guild_uuid = uuid.UUID(task.guild_id)

        # Create ad-hoc squad if not provided
        squad_id = task.squad_id
        if not squad_id:
            squad_id = create_adhoc_squad(db, task.guild_id, None)  # No user_id for ad-hoc

        new_task = Task(
            id=task_id,
            objective_id=objective_uuid,
            guild_id=guild_uuid,
            name=task.name,
            description=task.description,
            priority=task.priority,
            squad_id=uuid.UUID(squad_id) if squad_id else None
        )

        db.add(new_task)
        db.commit()

        return {
            "id": str(task_id),
            "message": f"Task '{task.name}' created successfully",
            "tts_response": f"Task created: {task.name}"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")

@router.post("/tasks/assign")
async def assign_task(assignment: TaskAssign, db: Session = Depends(get_db)):
    """Assign task to user/squad"""
    try:
        task_uuid = uuid.UUID(assignment.task_id)
        user_uuid = uuid.UUID(assignment.user_id)

        task = db.query(Task).filter(Task.id == task_uuid).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        task.lead_id = user_uuid
        if assignment.squad_id:
            task.squad_id = uuid.UUID(assignment.squad_id)

        db.commit()

        return {
            "message": "Task assigned successfully",
            "tts_response": "Task assignment confirmed"
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to assign task: {str(e)}")

@router.patch("/tasks/{task_id}/schedule")
async def schedule_task(task_id: str, schedule_data: TaskSchedule, db: Session = Depends(get_db)):
    """Schedule a task"""
    try:
        task_uuid = uuid.UUID(task_id)
        task = db.query(Task).filter(Task.id == task_uuid).first()

        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        task.schedule = schedule_data.schedule
        db.commit()

        return {
            "message": "Task scheduled successfully",
            "tts_response": f"Task scheduled: {schedule_data.schedule}"
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid task ID format")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to schedule task: {str(e)}")

@router.get("/guilds/{guild_id}/ai_commanders")
async def get_ai_commander(guild_id: str, db: Session = Depends(get_db)):
    """Get AI Commander for guild"""
    try:
        guild_uuid = uuid.UUID(guild_id)
        commander = db.query(AICommander).filter(AICommander.guild_id == guild_uuid).first()

        if not commander:
            # Create default commander if none exists
            commander = AICommander(
                id=uuid.uuid4(),
                guild_id=guild_uuid,
                name="UEE Commander",
                system_prompt="Act as a UEE Commander, coordinating Star Citizen guild missions with formal, strategic responses."
            )
            db.add(commander)
            db.commit()

        return {
            "id": str(commander.id),
            "name": commander.name,
            "system_prompt": commander.system_prompt,
            "phonetic": commander.phonetic
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid guild ID format")
