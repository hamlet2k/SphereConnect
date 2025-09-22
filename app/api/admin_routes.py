# Copyright 2025 Federico Arce. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid
from datetime import datetime

from ..core.models import (
    User, Rank, AccessLevel, UserAccess, Objective, Task, Squad, ObjectiveCategory, Guild, Invite, GuildRequest,
    get_db, create_tables
)
from .routes import get_current_user, verify_token

router = APIRouter()
security = HTTPBearer()

# Pydantic models for admin operations
class UserCreate(BaseModel):
    name: str
    password: str
    pin: str
    rank_id: Optional[str] = None
    squad_id: Optional[str] = None
    phonetic: Optional[str] = None
    guild_id: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    rank_id: Optional[str] = None
    squad_id: Optional[str] = None
    availability: Optional[str] = None
    phonetic: Optional[str] = None

class RankCreate(BaseModel):
    name: str
    access_levels: List[str]
    guild_id: str

class RankUpdate(BaseModel):
    name: Optional[str] = None
    access_levels: Optional[List[str]] = None

class AccessLevelCreate(BaseModel):
    name: str
    user_actions: List[str]
    guild_id: str

class AccessLevelUpdate(BaseModel):
    name: Optional[str] = None
    user_actions: Optional[List[str]] = None

class ObjectiveCreate(BaseModel):
    name: str
    description: Optional[Dict[str, Any]] = {"brief": "", "tactical": "", "classified": "", "metrics": {}}
    categories: Optional[List[str]] = []
    priority: Optional[str] = "Medium"
    applicable_rank: Optional[str] = "Recruit"
    squad_id: Optional[str] = None
    guild_id: str

class ObjectiveUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[Dict[str, Any]] = None
    categories: Optional[List[str]] = None
    priority: Optional[str] = None
    applicable_rank: Optional[str] = None
    squad_id: Optional[str] = None

class TaskCreate(BaseModel):
    name: str
    description: Optional[str] = None
    objective_id: str
    priority: Optional[str] = "Medium"
    self_assignment: Optional[bool] = True
    max_assignees: Optional[int] = 5
    squad_id: Optional[str] = None
    guild_id: str

class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    self_assignment: Optional[bool] = None
    max_assignees: Optional[int] = None
    squad_id: Optional[str] = None

class SquadCreate(BaseModel):
    name: str
    lead_id: Optional[str] = None
    guild_id: str

class SquadUpdate(BaseModel):
    name: Optional[str] = None
    lead_id: Optional[str] = None

class ObjectiveCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    guild_id: str

class ObjectiveCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

# RBAC Helper Functions
def check_admin_access(user: User, db: Session) -> bool:
    """Check if user has admin access for their guild from both rank and user_access table"""
    # Check rank-based admin access
    rank_has_admin = False
    if user.rank:
        rank = db.query(Rank).filter(Rank.id == user.rank).first()
        if rank:
            admin_actions = ["manage_users", "manage_ranks", "manage_objectives", "manage_tasks", "manage_squads", "manage_guilds", "view_guilds"]
            rank_has_admin = any(action in rank.access_levels for action in admin_actions)

    # Check user_access table for admin permissions
    user_access_actions = set()
    user_access_levels = db.query(UserAccess).filter(UserAccess.user_id == user.id).all()
    for ua in user_access_levels:
        access_level = db.query(AccessLevel).filter(AccessLevel.id == ua.access_level_id).first()
        if access_level:
            user_access_actions.update(access_level.user_actions)

    user_has_admin = any(action in user_access_actions for action in ["manage_users", "manage_ranks", "manage_objectives", "manage_tasks", "manage_squads", "manage_guilds", "view_guilds"])

    # User has admin access if either rank OR user_access grants admin permissions
    return rank_has_admin or user_has_admin

def check_access_level(user: User, required_actions: List[str], db: Session) -> bool:
    """Check if user has required access levels from both rank and user_access table"""
    # Check rank-based access levels
    rank_has_access = False
    if user.rank:
        rank = db.query(Rank).filter(Rank.id == user.rank).first()
        if rank:
            rank_has_access = all(action in rank.access_levels for action in required_actions)

    # Check user_access table for additional permissions
    user_access_actions = set()
    user_access_levels = db.query(UserAccess).filter(UserAccess.user_id == user.id).all()
    for ua in user_access_levels:
        access_level = db.query(AccessLevel).filter(AccessLevel.id == ua.access_level_id).first()
        if access_level:
            user_access_actions.update(access_level.user_actions)

    user_has_access = all(action in user_access_actions for action in required_actions)

    # User has access if either rank OR user_access grants the required actions
    return rank_has_access or user_has_access

def require_admin_access(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Dependency to require admin access"""
    if not check_admin_access(user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user

def require_access_level(required_actions: List[str]):
    """Dependency factory for specific access levels"""
    def dependency(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
        if not check_access_level(user, required_actions, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required actions: {', '.join(required_actions)}"
            )
        return user
    return dependency

# User Management Endpoints
@router.get("/users")
async def get_users(
    guild_id: str = Query(..., description="Guild ID for filtering"),
    current_user: User = Depends(require_access_level(["view_users"])),
    db: Session = Depends(get_db)
):
    """Get all users for a guild (admin only)"""
    try:
        # Verify user belongs to the guild
        if str(current_user.guild_id) != guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        # Get all users with approved guild requests for this guild
        approved_requests = db.query(GuildRequest).filter(
            GuildRequest.guild_id == uuid.UUID(guild_id),
            GuildRequest.status == "approved"
        ).all()

        user_ids = [str(req.user_id) for req in approved_requests]
        if not user_ids:
            users = []
        else:
            users = db.query(User).filter(User.id.in_([uuid.UUID(uid) for uid in user_ids])).all()

        return [
            {
                "id": str(user.id),
                "name": user.name,
                "rank": str(user.rank) if user.rank else None,
                "squad_id": str(user.squad_id) if user.squad_id else None,
                "availability": user.availability,
                "phonetic": user.phonetic,
                "created_at": user.created_at.isoformat() if user.created_at else None
            }
            for user in users
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve users: {str(e)}"
        )

@router.post("/users")
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_access_level(["manage_users"])),
    db: Session = Depends(get_db)
):
    """Create a new user (admin only)"""
    try:
        # Verify admin belongs to the guild
        if str(current_user.guild_id) != user_data.guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Admin does not belong to this guild"
            )

        # Check if user already exists
        existing_user = db.query(User).filter(
            User.name == user_data.name,
            User.guild_id == uuid.UUID(user_data.guild_id)
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already exists in this guild"
            )

        # Create new user
        from .routes import hash_password, hash_pin

        new_user = User(
            id=uuid.uuid4(),
            guild_id=uuid.UUID(user_data.guild_id),
            name=user_data.name,
            password=hash_password(user_data.password),
            pin=hash_pin(user_data.pin),
            rank=uuid.UUID(user_data.rank_id) if user_data.rank_id else None,
            squad_id=uuid.UUID(user_data.squad_id) if user_data.squad_id else None,
            phonetic=user_data.phonetic,
            availability="offline"
        )

        db.add(new_user)
        db.commit()

        return {
            "message": f"User '{user_data.name}' created successfully",
            "user_id": str(new_user.id)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )

@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: User = Depends(require_access_level(["manage_users"])),
    db: Session = Depends(get_db)
):
    """Update a user (admin only)"""
    try:
        user_uuid = uuid.UUID(user_id)
        user = db.query(User).filter(User.id == user_uuid).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Verify admin belongs to the same guild
        if str(current_user.guild_id) != str(user.guild_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to your guild"
            )

        # Update fields
        if user_data.name is not None:
            user.name = user_data.name
        if user_data.rank_id is not None:
            user.rank = uuid.UUID(user_data.rank_id) if user_data.rank_id else None
        if user_data.squad_id is not None:
            user.squad_id = uuid.UUID(user_data.squad_id) if user_data.squad_id else None
        if user_data.availability is not None:
            user.availability = user_data.availability
        if user_data.phonetic is not None:
            user.phonetic = user_data.phonetic

        db.commit()

        return {
            "message": "User updated successfully",
            "user_id": str(user.id)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_access_level(["manage_users"])),
    db: Session = Depends(get_db)
):
    """Delete a user (admin only)"""
    try:
        user_uuid = uuid.UUID(user_id)
        user = db.query(User).filter(User.id == user_uuid).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Verify admin belongs to the same guild
        if str(current_user.guild_id) != str(user.guild_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to your guild"
            )

        # Prevent deleting self
        if str(user.id) == str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )

        db.delete(user)
        db.commit()

        return {
            "message": "User deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )

# Rank Management Endpoints
@router.get("/ranks")
async def get_ranks(
    guild_id: str = Query(..., description="Guild ID for filtering"),
    current_user: User = Depends(require_access_level(["view_ranks"])),
    db: Session = Depends(get_db)
):
    """Get all ranks for a guild"""
    try:
        if str(current_user.guild_id) != guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        ranks = db.query(Rank).filter(Rank.guild_id == uuid.UUID(guild_id)).all()

        return [
            {
                "id": str(rank.id),
                "name": rank.name,
                "access_levels": rank.access_levels,
                "phonetic": rank.phonetic
            }
            for rank in ranks
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve ranks: {str(e)}"
        )

@router.post("/ranks")
async def create_rank(
    rank_data: RankCreate,
    current_user: User = Depends(require_access_level(["manage_ranks"])),
    db: Session = Depends(get_db)
):
    """Create a new rank (admin only)"""
    try:
        if str(current_user.guild_id) != rank_data.guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Admin does not belong to this guild"
            )

        new_rank = Rank(
            id=uuid.uuid4(),
            guild_id=uuid.UUID(rank_data.guild_id),
            name=rank_data.name,
            access_levels=rank_data.access_levels
        )

        db.add(new_rank)
        db.commit()

        return {
            "message": f"Rank '{rank_data.name}' created successfully",
            "rank_id": str(new_rank.id)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create rank: {str(e)}"
        )

@router.patch("/ranks/{rank_id}")
async def update_rank(
    rank_id: str,
    rank_data: RankUpdate,
    current_user: User = Depends(require_access_level(["manage_ranks"])),
    db: Session = Depends(get_db)
):
    """Update a rank (admin only)"""
    try:
        rank_uuid = uuid.UUID(rank_id)
        rank = db.query(Rank).filter(Rank.id == rank_uuid).first()

        if not rank:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rank not found"
            )

        # Verify admin belongs to the same guild
        if str(current_user.guild_id) != str(rank.guild_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Rank does not belong to your guild"
            )

        # Update fields
        if rank_data.name is not None:
            rank.name = rank_data.name
        if rank_data.access_levels is not None:
            rank.access_levels = rank_data.access_levels

        db.commit()

        return {
            "message": "Rank updated successfully",
            "rank_id": str(rank.id)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update rank: {str(e)}"
        )

@router.delete("/ranks/{rank_id}")
async def delete_rank(
    rank_id: str,
    current_user: User = Depends(require_access_level(["manage_ranks"])),
    db: Session = Depends(get_db)
):
    """Delete a rank (admin only)"""
    try:
        rank_uuid = uuid.UUID(rank_id)
        rank = db.query(Rank).filter(Rank.id == rank_uuid).first()

        if not rank:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rank not found"
            )

        # Verify admin belongs to the same guild
        if str(current_user.guild_id) != str(rank.guild_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Rank does not belong to your guild"
            )

        # Check if rank is assigned to any users
        users_with_rank = db.query(User).filter(User.rank == rank_uuid).count()
        if users_with_rank > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete rank: {users_with_rank} user(s) are assigned to this rank"
            )

        db.delete(rank)
        db.commit()

        return {
            "message": "Rank deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete rank: {str(e)}"
        )

# Objective Management Endpoints
@router.get("/objectives")
async def get_objectives(
    guild_id: str = Query(..., description="Guild ID for filtering"),
    current_user: User = Depends(require_access_level(["view_objectives"])),
    db: Session = Depends(get_db)
):
    """Get all objectives for a guild"""
    try:
        if str(current_user.guild_id) != guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        objectives = db.query(Objective).filter(Objective.guild_id == uuid.UUID(guild_id)).all()

        return [
            {
                "id": str(obj.id),
                "name": obj.name,
                "description": obj.description,
                "categories": obj.categories,
                "priority": obj.priority,
                "progress": obj.progress,
                "applicable_rank": obj.applicable_rank,
                "squad_id": str(obj.squad_id) if obj.squad_id else None,
                "lead_id": str(obj.lead_id) if obj.lead_id else None
            }
            for obj in objectives
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve objectives: {str(e)}"
        )

@router.post("/objectives")
async def create_objective(
    objective_data: ObjectiveCreate,
    current_user: User = Depends(require_access_level(["manage_objectives"])),
    db: Session = Depends(get_db)
):
    """Create a new objective (admin only)"""
    try:
        if str(current_user.guild_id) != objective_data.guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Admin does not belong to this guild"
            )

        obj_id = uuid.uuid4()
        new_objective = Objective(
            id=obj_id,
            guild_id=uuid.UUID(objective_data.guild_id),
            name=objective_data.name,
            description=objective_data.description,
            categories=objective_data.categories,
            priority=objective_data.priority,
            applicable_rank=objective_data.applicable_rank,
            squad_id=uuid.UUID(objective_data.squad_id) if objective_data.squad_id else None
        )

        db.add(new_objective)
        db.commit()

        return {
            "message": f"Objective '{objective_data.name}' created successfully",
            "objective_id": str(obj_id)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create objective: {str(e)}"
        )

# Task Management Endpoints
@router.get("/tasks")
async def get_tasks(
    guild_id: str = Query(..., description="Guild ID for filtering"),
    current_user: User = Depends(require_access_level(["view_tasks"])),
    db: Session = Depends(get_db)
):
    """Get all tasks for a guild"""
    try:
        if str(current_user.guild_id) != guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        tasks = db.query(Task).filter(Task.guild_id == uuid.UUID(guild_id)).all()

        return [
            {
                "id": str(task.id),
                "name": task.name,
                "description": task.description,
                "status": task.status,
                "priority": task.priority,
                "progress": task.progress,
                "schedule": task.schedule,
                "self_assignment": task.self_assignment,
                "max_assignees": task.max_assignees,
                "objective_id": str(task.objective_id),
                "squad_id": str(task.squad_id) if task.squad_id else None,
                "lead_id": str(task.lead_id) if task.lead_id else None
            }
            for task in tasks
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tasks: {str(e)}"
        )

@router.post("/tasks")
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(require_access_level(["manage_tasks"])),
    db: Session = Depends(get_db)
):
    """Create a new task (admin only)"""
    try:
        if str(current_user.guild_id) != task_data.guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Admin does not belong to this guild"
            )

        task_id = uuid.uuid4()
        new_task = Task(
            id=task_id,
            objective_id=uuid.UUID(task_data.objective_id),
            guild_id=uuid.UUID(task_data.guild_id),
            name=task_data.name,
            description=task_data.description,
            priority=task_data.priority,
            self_assignment=task_data.self_assignment,
            max_assignees=task_data.max_assignees,
            squad_id=uuid.UUID(task_data.squad_id) if task_data.squad_id else None
        )

        db.add(new_task)
        db.commit()

        return {
            "message": f"Task '{task_data.name}' created successfully",
            "task_id": str(task_id)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create task: {str(e)}"
        )

# Squad Management Endpoints
@router.get("/squads")
async def get_squads(
    guild_id: str = Query(..., description="Guild ID for filtering"),
    current_user: User = Depends(require_access_level(["view_squads"])),
    db: Session = Depends(get_db)
):
    """Get all squads for a guild"""
    try:
        if str(current_user.guild_id) != guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        squads = db.query(Squad).filter(Squad.guild_id == uuid.UUID(guild_id)).all()

        return [
            {
                "id": str(squad.id),
                "name": squad.name,
                "lead_id": str(squad.lead_id) if squad.lead_id else None
            }
            for squad in squads
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve squads: {str(e)}"
        )

@router.post("/squads")
async def create_squad(
    squad_data: SquadCreate,
    current_user: User = Depends(require_access_level(["manage_squads"])),
    db: Session = Depends(get_db)
):
    """Create a new squad (admin only)"""
    try:
        if str(current_user.guild_id) != squad_data.guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Admin does not belong to this guild"
            )

        squad_id = uuid.uuid4()
        new_squad = Squad(
            id=squad_id,
            guild_id=uuid.UUID(squad_data.guild_id),
            name=squad_data.name,
            lead_id=uuid.UUID(squad_data.lead_id) if squad_data.lead_id else None
        )

        db.add(new_squad)
        db.commit()

        return {
            "message": f"Squad '{squad_data.name}' created successfully",
            "squad_id": str(squad_id)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create squad: {str(e)}"
        )

# Access Level Management Endpoints
@router.get("/access-levels")
async def get_access_levels(
    guild_id: str = Query(..., description="Guild ID for filtering"),
    current_user: User = Depends(require_access_level(["manage_rbac"])),
    db: Session = Depends(get_db)
):
    """Get all access levels for a guild"""
    try:
        if str(current_user.guild_id) != guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        access_levels = db.query(AccessLevel).filter(AccessLevel.guild_id == uuid.UUID(guild_id)).all()

        return [
            {
                "id": str(al.id),
                "name": al.name,
                "user_actions": al.user_actions
            }
            for al in access_levels
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve access levels: {str(e)}"
        )

@router.post("/access-levels")
async def create_access_level(
    access_level_data: AccessLevelCreate,
    current_user: User = Depends(require_access_level(["manage_rbac"])),
    db: Session = Depends(get_db)
):
    """Create a new access level (admin only)"""
    try:
        if str(current_user.guild_id) != access_level_data.guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Admin does not belong to this guild"
            )

        new_access_level = AccessLevel(
            id=uuid.uuid4(),
            guild_id=uuid.UUID(access_level_data.guild_id),
            name=access_level_data.name,
            user_actions=access_level_data.user_actions
        )

        db.add(new_access_level)
        db.commit()

        return {
            "message": f"Access level '{access_level_data.name}' created successfully",
            "id": str(new_access_level.id)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create access level: {str(e)}"
        )

@router.patch("/access-levels/{access_level_id}")
async def update_access_level(
    access_level_id: str,
    access_level_data: AccessLevelUpdate,
    current_user: User = Depends(require_access_level(["manage_rbac"])),
    db: Session = Depends(get_db)
):
    """Update an access level (admin only)"""
    try:
        access_level_uuid = uuid.UUID(access_level_id)
        access_level = db.query(AccessLevel).filter(AccessLevel.id == access_level_uuid).first()

        if not access_level:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Access level not found"
            )

        # Block super_admin modification
        if access_level.name == "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot modify super_admin access level"
            )

        # Block super_admin deletion
        if access_level.name == "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete super_admin access level"
            )

        # Verify admin belongs to the same guild
        if str(current_user.guild_id) != str(access_level.guild_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Access level does not belong to your guild"
            )

        # Update fields
        if access_level_data.name is not None:
            access_level.name = access_level_data.name
        if access_level_data.user_actions is not None:
            access_level.user_actions = access_level_data.user_actions

        db.commit()

        return {
            "message": "Access level updated successfully",
            "id": str(access_level.id)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update access level: {str(e)}"
        )

@router.delete("/access-levels/{access_level_id}")
async def delete_access_level(
    access_level_id: str,
    current_user: User = Depends(require_access_level(["manage_rbac"])),
    db: Session = Depends(get_db)
):
    """Delete an access level (admin only)"""
    try:
        access_level_uuid = uuid.UUID(access_level_id)
        access_level = db.query(AccessLevel).filter(AccessLevel.id == access_level_uuid).first()

        if not access_level:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Access level not found"
            )

        # Verify admin belongs to the same guild
        if str(current_user.guild_id) != str(access_level.guild_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Access level does not belong to your guild"
            )

        db.delete(access_level)
        db.commit()

        return {
            "message": "Access level deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete access level: {str(e)}"
        )

# Objective Category Management Endpoints
@router.get("/objective-categories")
async def get_objective_categories(
    guild_id: str = Query(..., description="Guild ID for filtering"),
    current_user: User = Depends(require_access_level(["view_categories"])),
    db: Session = Depends(get_db)
):
    """Get all objective categories for a guild"""
    try:
        if str(current_user.guild_id) != guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        categories = db.query(ObjectiveCategory).filter(ObjectiveCategory.guild_id == uuid.UUID(guild_id)).all()

        return [
            {
                "id": str(cat.id),
                "name": cat.name,
                "description": cat.description
            }
            for cat in categories
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve objective categories: {str(e)}"
        )

@router.post("/objective-categories")
async def create_objective_category(
    category_data: ObjectiveCategoryCreate,
    current_user: User = Depends(require_access_level(["manage_categories"])),
    db: Session = Depends(get_db)
):
    """Create a new objective category (admin only)"""
    try:
        if str(current_user.guild_id) != category_data.guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Admin does not belong to this guild"
            )

        category_id = uuid.uuid4()
        new_category = ObjectiveCategory(
            id=category_id,
            guild_id=uuid.UUID(category_data.guild_id),
            name=category_data.name,
            description=category_data.description
        )

        db.add(new_category)
        db.commit()

        return {
            "message": f"Objective category '{category_data.name}' created successfully",
            "category_id": str(category_id)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create objective category: {str(e)}"
        )

# Guild Management Endpoints
@router.post("/guilds")
async def create_guild(
    guild_data: dict,
    current_user: User = Depends(require_access_level(["manage_guilds"])),
    db: Session = Depends(get_db)
):
    """Create a new guild (admin only)"""
    try:
        name = guild_data.get("name")
        if not name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Guild name is required"
            )

        # Check guild limit
        user_guilds = db.query(Guild).filter(Guild.creator_id == current_user.id).count()
        if user_guilds >= current_user.max_guilds:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Maximum guild limit of {current_user.max_guilds} reached"
            )

        # Create guild
        guild_id = uuid.uuid4()
        new_guild = Guild(
            id=guild_id,
            name=name,
            creator_id=current_user.id,
            member_limit=2,  # Free tier default
            billing_tier="free",
            is_solo=False,
            is_active=True,
            is_deletable=True,
            type="game_star_citizen"
        )

        db.add(new_guild)

        # Create approved GuildRequest for creator
        creator_request = GuildRequest(
            id=uuid.uuid4(),
            user_id=current_user.id,
            guild_id=guild_id,
            status="approved"
        )
        db.add(creator_request)

        db.commit()

        return {
            "message": f"Guild '{name}' created successfully",
            "guild_id": str(guild_id)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create guild: {str(e)}"
        )

@router.get("/guilds")
async def get_guilds(
    current_user: User = Depends(require_access_level(["manage_guilds"])),
    db: Session = Depends(get_db)
):
    """Get user's guilds (admin only with manage_guilds permission)"""
    try:
        # Get user's personal guild
        personal_guild = db.query(Guild).filter(Guild.creator_id == current_user.id).first()

        # Get guilds where user has approved guild requests
        approved_requests = db.query(GuildRequest).filter(
            GuildRequest.user_id == current_user.id,
            GuildRequest.status == "approved"
        ).all()

        guild_ids = set()
        if personal_guild:
            guild_ids.add(personal_guild.id)

        for request in approved_requests:
            guild_ids.add(request.guild_id)

        # Get all guilds user has access to
        guilds = db.query(Guild).filter(Guild.id.in_(guild_ids)).all()

        return [
            {
                "id": str(guild.id),
                "name": guild.name,
                "creator_id": str(guild.creator_id) if guild.creator_id else None,
                "member_limit": guild.member_limit,
                "billing_tier": guild.billing_tier,
                "is_solo": guild.is_solo,
                "is_deletable": guild.is_deletable,
                "type": guild.type
            }
            for guild in guilds
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve guilds: {str(e)}"
        )

@router.post("/users/{user_id}/kick")
async def kick_user(
    user_id: str,
    kick_data: dict,
    current_user: User = Depends(require_access_level(["manage_users"])),
    db: Session = Depends(get_db)
):
    """Kick a user from their current guild (admin only)"""
    try:
        user_uuid = uuid.UUID(user_id)
        user_to_kick = db.query(User).filter(User.id == user_uuid).first()

        if not user_to_kick:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Cannot kick yourself
        if str(user_to_kick.id) == str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Cannot kick yourself"
            )

        # Find user's personal guild
        personal_guild = db.query(Guild).filter(
            Guild.creator_id == user_to_kick.id,
            Guild.is_solo == True
        ).first()

        if not personal_guild:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User's personal guild not found"
            )

        # Switch kicked user to their personal guild
        user_to_kick.current_guild_id = str(personal_guild.id)

        db.commit()

        return {
            "message": f"User kicked and switched to personal guild: {personal_guild.name}",
            "user_id": str(user_to_kick.id),
            "new_guild_id": str(personal_guild.id),
            "guild_name": personal_guild.name
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to kick user: {str(e)}"
        )

@router.delete("/guilds/{guild_id}")
async def delete_guild(
    guild_id: str,
    current_user: User = Depends(require_access_level(["manage_guilds"])),
    db: Session = Depends(get_db)
):
    """Delete a guild (admin only, with protection for personal guilds)"""
    try:
        guild_uuid = uuid.UUID(guild_id)
        guild = db.query(Guild).filter(Guild.id == guild_uuid).first()

        if not guild:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Guild not found"
            )

        # Check if guild is personal (is_solo=true) - cannot be deleted
        if guild.is_solo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Personal guilds cannot be deleted"
            )

        # Check if current user is the creator
        if str(guild.creator_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the guild creator can delete this guild"
            )

        # Check is_deletable flag
        if not guild.is_deletable:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This guild cannot be deleted"
            )

        # Move any users in this guild to their personal guilds
        users_in_guild = db.query(User).filter(User.current_guild_id == str(guild.id)).all()
        for user in users_in_guild:
            # Find user's personal guild
            personal_guild = db.query(Guild).filter(
                Guild.creator_id == user.id,
                Guild.is_solo == True
            ).first()
            if personal_guild:
                user.current_guild_id = str(personal_guild.id)

        db.delete(guild)
        db.commit()

        return {
            "message": "Guild deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete guild: {str(e)}"
        )

# User Access Management Endpoints
@router.post("/user_access")
async def assign_user_access(
    access_data: dict,
    current_user: User = Depends(require_access_level(["manage_users"])),
    db: Session = Depends(get_db)
):
    """Assign access level to user (admin only)"""
    try:
        user_id = access_data.get("user_id")
        access_level_id = access_data.get("access_level_id")

        if not user_id or not access_level_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="user_id and access_level_id are required"
            )

        # Verify user exists
        user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Verify access level exists
        access_level = db.query(AccessLevel).filter(AccessLevel.id == uuid.UUID(access_level_id)).first()
        if not access_level:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Access level not found"
            )

        # Check if assignment already exists
        existing = db.query(UserAccess).filter(
            UserAccess.user_id == uuid.UUID(user_id),
            UserAccess.access_level_id == uuid.UUID(access_level_id)
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already has this access level"
            )

        # Create assignment
        user_access = UserAccess(
            user_id=uuid.UUID(user_id),
            access_level_id=uuid.UUID(access_level_id)
        )

        db.add(user_access)
        db.commit()

        return {
            "message": f"Access level '{access_level.name}' assigned to user '{user.name}' successfully",
            "user_access_id": str(user_access.id)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign user access: {str(e)}"
        )

@router.get("/user_access/{user_id}")
async def get_user_access_levels(
    user_id: str,
    current_user: User = Depends(require_access_level(["view_users"])),
    db: Session = Depends(get_db)
):
    """Get all access levels for a user"""
    try:
        user_uuid = uuid.UUID(user_id)

        # Verify user exists
        user = db.query(User).filter(User.id == user_uuid).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Get user's access levels
        user_access_levels = db.query(UserAccess).filter(UserAccess.user_id == user_uuid).all()

        access_levels_data = []
        for ua in user_access_levels:
            access_level = db.query(AccessLevel).filter(AccessLevel.id == ua.access_level_id).first()
            if access_level:
                access_levels_data.append({
                    "id": str(access_level.id),
                    "name": access_level.name,
                    "user_actions": access_level.user_actions,
                    "assigned_at": ua.created_at.isoformat() if ua.created_at else None
                })

        return {
            "user_id": user_id,
            "user_name": user.name,
            "access_levels": access_levels_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve user access levels: {str(e)}"
        )

@router.delete("/user_access/{user_id}/{access_id}")
async def remove_user_access(
    user_id: str,
    access_id: str,
    current_user: User = Depends(require_access_level(["manage_users"])),
    db: Session = Depends(get_db)
):
    """Remove access level from user (admin only)"""
    try:
        user_uuid = uuid.UUID(user_id)
        access_uuid = uuid.UUID(access_id)

        # Find the user access assignment
        user_access = db.query(UserAccess).filter(
            UserAccess.user_id == user_uuid,
            UserAccess.access_level_id == access_uuid
        ).first()

        if not user_access:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User access assignment not found"
            )

        # Block super_admin revocation
        access_level = db.query(AccessLevel).filter(AccessLevel.id == access_uuid).first()
        if access_level and access_level.name == "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot revoke super_admin access level"
            )

        # Get access level name for response
        access_level = db.query(AccessLevel).filter(AccessLevel.id == access_uuid).first()
        access_level_name = access_level.name if access_level else "Unknown"

        # Get user name for response
        user = db.query(User).filter(User.id == user_uuid).first()
        user_name = user.name if user else "Unknown"

        db.delete(user_access)
        db.commit()

        return {
            "message": f"Access level '{access_level_name}' removed from user '{user_name}' successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove user access: {str(e)}"
        )

# Guild Request Management Endpoints
@router.get("/guild_requests")
async def get_guild_requests(
    guild_id: str = Query(..., description="Guild ID for filtering"),
    current_user: User = Depends(require_access_level(["manage_users"])),
    db: Session = Depends(get_db)
):
    """Get all guild requests for a guild (admin only)"""
    try:
        # Verify user belongs to the guild
        if str(current_user.guild_id) != guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        # Get guild requests for this guild
        guild_requests = db.query(GuildRequest).filter(GuildRequest.guild_id == uuid.UUID(guild_id)).all()

        requests_data = []
        for gr in guild_requests:
            # Get user info
            user = db.query(User).filter(User.id == gr.user_id).first()
            user_name = user.name if user else "Unknown User"

            # Get guild info
            guild = db.query(Guild).filter(Guild.id == gr.guild_id).first()
            guild_name = guild.name if guild else "Unknown Guild"

            requests_data.append({
                "id": str(gr.id),
                "user_id": str(gr.user_id),
                "user_name": user_name,
                "guild_id": str(gr.guild_id),
                "guild_name": guild_name,
                "status": gr.status,
                "created_at": gr.created_at.isoformat() if gr.created_at else None,
                "updated_at": gr.updated_at.isoformat() if gr.updated_at else None
            })

        return requests_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve guild requests: {str(e)}"
        )

@router.patch("/guild_requests/{request_id}")
async def update_guild_request(
    request_id: str,
    request_data: dict,
    current_user: User = Depends(require_access_level(["manage_users"])),
    db: Session = Depends(get_db)
):
    """Approve or deny a guild request (admin only)"""
    try:
        request_uuid = uuid.UUID(request_id)
        guild_request = db.query(GuildRequest).filter(GuildRequest.id == request_uuid).first()

        if not guild_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Guild request not found"
            )

        # Verify admin belongs to the guild
        if str(current_user.guild_id) != str(guild_request.guild_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        new_status = request_data.get("status")
        if new_status not in ["approved", "denied"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Status must be 'approved' or 'denied'"
            )

        # If approving, switch user to the guild
        if new_status == "approved":
            user = db.query(User).filter(User.id == guild_request.user_id).first()
            if user:
                user.current_guild_id = str(guild_request.guild_id)

        # Update the request status
        guild_request.status = new_status
        guild_request.updated_at = datetime.utcnow()

        # If approved, switch user to the guild
        if new_status == "approved":
            user = db.query(User).filter(User.id == guild_request.user_id).first()
            if user:
                user.current_guild_id = str(guild_request.guild_id)

        # Log: logging.debug(f"Approval: guild_request_id={request_id}, approved_count={approved_count}, user_guilds={user_guilds}")
        import logging
        logging.debug(f"Approval: guild_request_id={request_id}, approved_count={approved_count if 'approved_count' in locals() else 'N/A'}, user_guilds={user_guilds if 'user_guilds' in locals() else 'N/A'}")

        db.commit()

        return {
            "message": f"Guild request {new_status} successfully",
            "request_id": str(guild_request.id),
            "status": guild_request.status
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update guild request: {str(e)}"
        )

# Invite Management Endpoints
@router.get("/invites")
async def get_invites(
    guild_id: str = Query(..., description="Guild ID for filtering"),
    current_user: User = Depends(require_access_level(["manage_guilds"])),
    db: Session = Depends(get_db)
):
    """Get all invites for a guild (admin only)"""
    try:
        # Verify user belongs to the guild
        if str(current_user.guild_id) != guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        invites = db.query(Invite).filter(Invite.guild_id == uuid.UUID(guild_id)).all()

        return [
            {
                "id": str(invite.id),
                "code": invite.code,
                "guild_id": str(invite.guild_id),
                "expires_at": invite.expires_at.isoformat() if invite.expires_at else None,
                "uses_left": invite.uses_left,
                "created_at": invite.created_at.isoformat() if invite.created_at else None
            }
            for invite in invites
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve invites: {str(e)}"
        )

@router.delete("/invites/{invite_code}")
async def delete_invite(
    invite_code: str,
    current_user: User = Depends(require_access_level(["manage_guilds"])),
    db: Session = Depends(get_db)
):
    """Delete an invite (admin only)"""
    try:
        # Find the invite
        invite = db.query(Invite).filter(Invite.code == invite_code).first()

        if not invite:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invite not found"
            )

        # Verify user belongs to the guild that owns the invite
        if str(current_user.guild_id) != str(invite.guild_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        db.delete(invite)
        db.commit()

        return {
            "message": "Invite deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete invite: {str(e)}"
        )