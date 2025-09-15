# Copyright 2025 Federico Arce. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# Rate limiting disabled for now
# from slowapi import Limiter, _rate_limit_exceeded_handler
# from slowapi.util import get_remote_address
# from slowapi.errors import RateLimitExceeded
# from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid
from datetime import datetime, timedelta
import re
import jwt
import bcrypt
import pyotp
from datetime import datetime, timedelta
import secrets
import hashlib
from ..core.models import (
    Objective, Task, Guild, Squad, AICommander, User, Rank, AccessLevel, UserSession,
    get_db, create_tables
)

router = APIRouter()

# JWT Configuration
SECRET_KEY = "your-secret-key-change-in-production"  # TODO: Move to environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Rate Limiting (disabled for now)
# limiter = Limiter(key_func=get_remote_address)

security = HTTPBearer()

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
    schedule: Dict[str, Any]

class ProgressUpdate(BaseModel):
    objective_id: Optional[str] = None
    task_id: Optional[str] = None
    metrics: Dict[str, Any]

# Authentication models
class UserLogin(BaseModel):
    name: str
    password: str
    guild_id: str

class UserRegister(BaseModel):
    name: str
    password: str
    pin: str
    guild_id: str
    phonetic: Optional[str] = None

class PinVerification(BaseModel):
    user_id: str
    pin: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: Dict[str, Any]
    requires_mfa: bool = False

class TokenRefresh(BaseModel):
    refresh_token: str

class MFASetup(BaseModel):
    user_id: str

class MFAVerify(BaseModel):
    user_id: str
    totp_code: str

class AICommanderUpdate(BaseModel):
    system_prompt: Optional[str] = None
    user_prompt: Optional[str] = None
    phonetic: Optional[str] = None

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

# Authentication helper functions
def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def hash_pin(pin: str) -> str:
    """Hash PIN using bcrypt"""
    return bcrypt.hashpw(pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_pin(pin: str, hashed: str) -> bool:
    """Verify PIN against hash"""
    return bcrypt.checkpw(pin.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.DecodeError:
        return None
    except jwt.PyJWTError:
        return None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Get current authenticated user from JWT token"""
    token = credentials.credentials
    payload = verify_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user

def check_admin_access(user: User, db: Session) -> bool:
    """Check if user has admin access for their guild"""
    if not user.rank:
        return False

    rank = db.query(Rank).filter(Rank.id == user.rank).first()
    if not rank:
        return False

    # Check if rank has admin access levels
    return "Admin" in rank.access_levels or "manage_prompts" in rank.access_levels

def create_session_token(user_id: str, token: str, expires_at: datetime) -> str:
    """Create a hash for session token storage"""
    return hashlib.sha256(f"{user_id}:{token}:{expires_at.isoformat()}".encode()).hexdigest()

def track_failed_attempt(db: Session, user: User):
    """Track failed login attempt and implement lockout"""
    user.failed_attempts = (user.failed_attempts or 0) + 1

    # Lock account after 5 failed attempts for 15 minutes
    if user.failed_attempts >= 5:
        user.locked_until = datetime.utcnow() + timedelta(minutes=15)

    db.commit()

def reset_failed_attempts(db: Session, user: User):
    """Reset failed attempts on successful login"""
    user.failed_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()
    db.commit()

def is_account_locked(user: User) -> bool:
    """Check if account is currently locked"""
    if user.locked_until and datetime.utcnow() < user.locked_until:
        return True
    return False

def generate_totp_secret() -> str:
    """Generate a new TOTP secret"""
    return pyotp.random_base32()

def verify_totp_code(secret: str, code: str) -> bool:
    """Verify TOTP code"""
    if not secret:
        return False

    totp = pyotp.TOTP(secret)
    return totp.verify(code)

def get_totp_uri(secret: str, name: str, issuer: str = "SphereConnect") -> str:
    """Generate TOTP URI for QR code"""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=name, issuer_name=issuer)

# Authentication Endpoints
@router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token"""
    try:
        # Find user by name and guild
        user = db.query(User).filter(
            User.name == login_data.name,
            User.guild_id == uuid.UUID(login_data.guild_id)
        ).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # Check if account is locked
        if is_account_locked(user):
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Account is temporarily locked due to too many failed attempts"
            )

        # Verify password
        if not user.password or not verify_password(login_data.password, user.password):
            track_failed_attempt(db, user)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # Reset failed attempts on successful login
        reset_failed_attempts(db, user)

        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id), "guild_id": str(user.guild_id)},
            expires_delta=access_token_expires
        )

        # Create session record
        session_token_hash = create_session_token(
            str(user.id), access_token, datetime.utcnow() + access_token_expires
        )

        user_session = UserSession(
            user_id=user.id,
            token_hash=session_token_hash,
            expires_at=datetime.utcnow() + access_token_expires
        )
        db.add(user_session)
        db.commit()

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user={
                "id": str(user.id),
                "name": user.name,
                "guild_id": str(user.guild_id),
                "rank": str(user.rank) if user.rank else None
            },
            requires_mfa=bool(user.totp_secret)
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )

@router.post("/auth/verify-pin")
async def verify_pin_endpoint(pin_data: PinVerification, db: Session = Depends(get_db)):
    """Verify user's PIN for voice authentication"""
    try:
        user = db.query(User).filter(User.id == uuid.UUID(pin_data.user_id)).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if not user.pin or not verify_pin(pin_data.pin, user.pin):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid PIN"
            )

        return {
            "message": "PIN verified successfully",
            "user_id": str(user.id),
            "tts_response": "Authentication confirmed"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PIN verification failed: {str(e)}"
        )

@router.post("/auth/register")
async def register_user(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
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

        # Hash password and PIN
        hashed_password = hash_password(user_data.password)
        hashed_pin = hash_pin(user_data.pin)

        # Create new user
        new_user = User(
            id=uuid.uuid4(),
            guild_id=uuid.UUID(user_data.guild_id),
            name=user_data.name,
            password=hashed_password,
            pin=hashed_pin,
            phonetic=user_data.phonetic,
            availability="offline"
        )

        db.add(new_user)
        db.commit()

        return {
            "message": "User registered successfully",
            "user_id": str(new_user.id),
            "tts_response": f"User {user_data.name} registered successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(refresh_data: TokenRefresh, db: Session = Depends(get_db)):
    """Refresh access token"""
    try:
        # Verify refresh token (simplified - in production use separate refresh tokens)
        payload = verify_token(refresh_data.refresh_token)

        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        # Create new access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id), "guild_id": str(user.guild_id)},
            expires_delta=access_token_expires
        )

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user={
                "id": str(user.id),
                "name": user.name,
                "guild_id": str(user.guild_id),
                "rank": str(user.rank) if user.rank else None
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token refresh failed: {str(e)}"
        )

@router.post("/auth/mfa/setup")
async def setup_mfa(mfa_data: MFASetup, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Setup TOTP MFA for user"""
    try:
        user = db.query(User).filter(User.id == uuid.UUID(mfa_data.user_id)).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Verify user owns this account
        if str(user.id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Generate TOTP secret
        secret = generate_totp_secret()
        user.totp_secret = secret
        db.commit()

        # Generate provisioning URI for QR code
        provisioning_uri = get_totp_uri(secret, user.name)

        return {
            "secret": secret,
            "provisioning_uri": provisioning_uri,
            "message": "MFA setup initiated. Scan QR code with authenticator app."
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"MFA setup failed: {str(e)}"
        )

@router.post("/auth/mfa/verify")
async def verify_mfa(mfa_data: MFAVerify, db: Session = Depends(get_db)):
    """Verify TOTP code for MFA"""
    try:
        user = db.query(User).filter(User.id == uuid.UUID(mfa_data.user_id)).first()

        if not user or not user.totp_secret:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="MFA not configured for this user"
            )

        # Verify TOTP code
        if not verify_totp_code(user.totp_secret, mfa_data.totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid MFA code"
            )

        return {
            "message": "MFA verification successful",
            "user_id": str(user.id)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"MFA verification failed: {str(e)}"
        )

# API Endpoints
@router.post("/objectives")
async def create_objective(
    objective: ObjectiveCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new objective"""
    try:
        # Verify user belongs to the guild
        if str(current_user.guild_id) != objective.guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        obj_id = uuid.uuid4()
        guild_uuid = uuid.UUID(objective.guild_id)

        # Create ad-hoc squad if not provided
        squad_id = objective.squad_id
        if not squad_id:
            squad_id = create_adhoc_squad(db, objective.guild_id, str(current_user.id))

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

@router.get("/objectives")
async def get_objectives(guild_id: str = None, db: Session = Depends(get_db)):
    """Get objectives for a guild"""
    try:
        if not guild_id:
            raise HTTPException(status_code=400, detail="guild_id parameter required")

        guild_uuid = uuid.UUID(guild_id)
        objectives = db.query(Objective).filter(Objective.guild_id == guild_uuid).all()

        return [
            {
                "id": str(obj.id),
                "name": obj.name,
                "description": obj.description,
                "categories": obj.categories,
                "priority": obj.priority,
                "progress": obj.progress,
                "guild_id": str(obj.guild_id)
            }
            for obj in objectives
        ]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid guild ID format")

@router.get("/guilds/{guild_id}/objectives/recent")
async def get_recent_objectives(guild_id: str, limit: int = 5, db: Session = Depends(get_db)):
    """Get recent objectives for a guild"""
    try:
        if not guild_id:
            raise HTTPException(status_code=400, detail="guild_id parameter required")

        guild_uuid = uuid.UUID(guild_id)
        objectives = db.query(Objective).filter(
            Objective.guild_id == guild_uuid
        ).limit(limit).all()

        return [
            {
                "id": str(obj.id),
                "name": obj.name,
                "description": obj.description,
                "categories": obj.categories,
                "priority": obj.priority,
                "guild_id": str(obj.guild_id)
            }
            for obj in objectives
        ]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid guild ID format")

@router.get("/tasks")
async def get_tasks(guild_id: str = None, assignee: str = None, db: Session = Depends(get_db)):
    """Get tasks for a guild, optionally filtered by assignee"""
    try:
        if not guild_id:
            raise HTTPException(status_code=400, detail="guild_id parameter required")

        guild_uuid = uuid.UUID(guild_id)
        query = db.query(Task).filter(Task.guild_id == guild_uuid)

        if assignee:
            assignee_uuid = uuid.UUID(assignee)
            query = query.filter(Task.lead_id == assignee_uuid)

        tasks = query.all()

        return [
            {
                "id": str(task.id),
                "name": task.name,
                "description": task.description,
                "status": task.status,
                "priority": task.priority,
                "progress": task.progress,
                "schedule": task.schedule,
                "guild_id": str(task.guild_id),
                "lead_id": str(task.lead_id) if task.lead_id else None
            }
            for task in tasks
        ]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

@router.get("/guilds/{guild_id}/ai-commander")
async def get_ai_commander(guild_id: str, db: Session = Depends(get_db)):
    """Get AI Commander configuration for guild"""
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
            "user_prompt": commander.user_prompt,
            "phonetic": commander.phonetic
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid guild ID format")

@router.put("/guilds/{guild_id}/ai-commander")
async def update_ai_commander(
    guild_id: str,
    update_data: AICommanderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update AI Commander configuration (admin only)"""
    try:
        # Check if user has admin access
        if not check_admin_access(current_user, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required to modify AI Commander configuration"
            )

        # Verify user belongs to the guild
        if str(current_user.guild_id) != guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        guild_uuid = uuid.UUID(guild_id)
        commander = db.query(AICommander).filter(AICommander.guild_id == guild_uuid).first()

        if not commander:
            # Create commander if none exists
            commander = AICommander(
                id=uuid.uuid4(),
                guild_id=guild_uuid,
                name="UEE Commander"
            )
            db.add(commander)

        # Update fields
        if update_data.system_prompt is not None:
            commander.system_prompt = update_data.system_prompt
        if update_data.user_prompt is not None:
            commander.user_prompt = update_data.user_prompt
        if update_data.phonetic is not None:
            commander.phonetic = update_data.phonetic

        db.commit()

        return {
            "message": "AI Commander configuration updated successfully",
            "id": str(commander.id),
            "system_prompt": commander.system_prompt,
            "user_prompt": commander.user_prompt,
            "phonetic": commander.phonetic
        }

    except HTTPException:
        raise
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid guild ID format")
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update AI Commander: {str(e)}"
        )
