# Copyright 2025 Federico Arce. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

import logging
logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# Rate limiting disabled for now
# from slowapi import Limiter, _rate_limit_exceeded_handler
# from slowapi.util import get_remote_address
# from slowapi.errors import RateLimitExceeded
# from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, ValidationError
from typing import Optional, List, Dict, Any, Set
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
    Objective,
    Task,
    Guild,
    Squad,
    AICommander,
    User,
    Rank,
    AccessLevel,
    UserAccess,
    UserSession,
    Invite,
    GuildRequest,
    ObjectiveCategory,
    Preference,
    UserPreference,
    get_db,
    create_tables,
)
from .utils import has_super_admin_access

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
    allowed_ranks: Optional[List[str]] = []
    guild_id: str
    squad_id: Optional[str] = None

class ObjectiveUpdate(BaseModel):
    description: Optional[Dict[str, Any]] = None
    progress: Optional[Dict[str, Any]] = None
    categories: Optional[List[str]] = None
    priority: Optional[str] = None
    allowed_ranks: Optional[List[str]] = None

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
    username_or_email: str
    password: str

class UserRegister(BaseModel):
    name: str
    username: str
    email: Optional[str] = None
    password: str
    pin: str
    invite_code: Optional[str] = None
    phonetic: Optional[str] = None

class PinVerification(BaseModel):
    user_id: str
    pin: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int
    user: Dict[str, Any]
    current_guild_id: str
    guild_name: str
    requires_mfa: bool = False

class TokenRefresh(BaseModel):
    refresh_token: str

class MFASetup(BaseModel):
    user_id: str

class MFAVerify(BaseModel):
    user_id: str
    totp_code: str

class GuildSwitch(BaseModel):
    guild_id: str

class JoinRequest(BaseModel):
    invite_code: str
    # Future fields: expires_at, custom_message, etc.


class UserPreferencesUpdate(BaseModel):
    preference_ids: List[str]

class AICommanderUpdate(BaseModel):
    system_prompt: Optional[str] = None
    user_prompt: Optional[str] = None
    phonetic: Optional[str] = None

# Category models
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    guild_id: str

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

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

async def update_tasks_on_objective_progress(db: Session, objective: Objective):
    """Update related tasks when objective progress changes"""
    try:
        # Get all tasks for this objective
        tasks = db.query(Task).filter(Task.objective_id == objective.id).all()

        objective_status = objective.progress.get("status", "active")

        for task in tasks:
            # If objective is completed, mark tasks as completed
            if objective_status == "completed":
                task.status = "Completed"
                task.progress = {**task.progress, "completed_via_objective": True}
            # If objective is cancelled, mark tasks as cancelled
            elif objective_status == "cancelled":
                task.status = "Failed"
                task.progress = {**task.progress, "cancelled_via_objective": True}

        db.commit()
    except Exception as e:
        # Log error but don't fail the objective update
        print(f"Warning: Failed to update tasks on objective progress: {str(e)}")

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

def check_objective_access(user: User, db: Session, action: str = "view") -> bool:
    """Check if user has objective access for their guild"""
    # Check for super_admin bypass - super_admin always has all permissions
    user_access_levels = db.query(UserAccess).filter(UserAccess.user_id == user.id).all()
    for ua in user_access_levels:
        access_level = db.query(AccessLevel).filter(AccessLevel.id == ua.access_level_id).first()
        if access_level and access_level.name == 'super_admin':
            return True

    # Check user access levels first (direct grants)
    for ua in user_access_levels:
        access_level = db.query(AccessLevel).filter(AccessLevel.id == ua.access_level_id).first()
        if access_level and action in access_level.user_actions:
            return True

    # Check rank-based access levels
    if user.rank:
        rank = db.query(Rank).filter(Rank.id == user.rank).first()
        if rank:
            for access_level_id in rank.access_levels:
                access_level = db.query(AccessLevel).filter(AccessLevel.id == access_level_id).first()
                if access_level and action in access_level.user_actions:
                    return True

    return False

def check_category_access(user: User, db: Session, action: str = "view") -> bool:
    """Check if user has category access for their guild"""
    # Check for super_admin bypass - super_admin always has all permissions
    user_access_levels = db.query(UserAccess).filter(UserAccess.user_id == user.id).all()
    for ua in user_access_levels:
        access_level = db.query(AccessLevel).filter(AccessLevel.id == ua.access_level_id).first()
        if access_level and access_level.name == 'super_admin':
            return True

    # Check user access levels first (direct grants)
    for ua in user_access_levels:
        access_level = db.query(AccessLevel).filter(AccessLevel.id == ua.access_level_id).first()
        if access_level and action in access_level.user_actions:
            return True

    # Check rank-based access levels
    if user.rank:
        rank = db.query(Rank).filter(Rank.id == user.rank).first()
        if rank:
            for access_level_id in rank.access_levels:
                access_level = db.query(AccessLevel).filter(AccessLevel.id == access_level_id).first()
                if access_level and action in access_level.user_actions:
                    return True

    return False
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
    """Authenticate user and return JWT tokens"""
    try:
        # Find user by username or email (global authentication)
        user = db.query(User).filter(
            (User.username == login_data.username_or_email) |
            (User.email == login_data.username_or_email)
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

        # Determine current guild (use personal guild if current_guild_id is null)
        current_guild_id = user.current_guild_id
        if not current_guild_id:
            current_guild_id = user.guild_id  # Fall back to personal guild

        # Get guild name
        guild = db.query(Guild).filter(Guild.id == current_guild_id).first()
        guild_name = guild.name if guild else "Unknown Guild"

        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id), "guild_id": str(current_guild_id)},
            expires_delta=access_token_expires
        )

        # Create refresh token (longer expiry)
        refresh_token_expires = timedelta(days=7)
        refresh_token = create_access_token(
            data={"sub": str(user.id), "type": "refresh"},
            expires_delta=refresh_token_expires
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
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user={
                "id": str(user.id),
                "name": user.name,
                "username": user.username,
                "email": user.email,
                "guild_id": str(user.guild_id),
                "current_guild_id": str(current_guild_id),
                "rank": str(user.rank) if user.rank else None
            },
            current_guild_id=str(current_guild_id),
            guild_name=guild_name,
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

@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user and auto-create personal guild"""
    try:
        # Input validation
        if len(user_data.name) < 3:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Display name must be at least 3 characters"
            )

        if len(user_data.username) < 3:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Username must be at least 3 characters"
            )

        if len(user_data.password) < 8:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Password must be at least 8 characters"
            )

        if not re.match(r'^\d{6}$', user_data.pin):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="PIN must be exactly 6 digits"
            )

        # Check if username already exists
        existing_username = db.query(User).filter(User.username == user_data.username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already exists"
            )

        # Check if email already exists (if provided)
        if user_data.email:
            existing_email = db.query(User).filter(User.email == user_data.email).first()
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email already exists"
                )

        # Handle invite code if provided
        target_guild_id = None
        if user_data.invite_code:
            invite = db.query(Invite).filter(
                Invite.code == user_data.invite_code,
                Invite.expires_at > datetime.utcnow()
            ).first()

            if invite and invite.uses_left > 0:
                target_guild_id = invite.guild_id
                invite.uses_left -= 1
                db.add(invite)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired invite code"
                )

        # Hash password and PIN
        hashed_password = hash_password(user_data.password)
        hashed_pin = hash_pin(user_data.pin)

        # Auto-create personal guild
        personal_guild_id = uuid.uuid4()
        personal_guild = Guild(
            id=personal_guild_id,
            name=f"{user_data.name}'s Personal Guild",
            creator_id=None,  # Will set after user creation
            member_limit=2,
            billing_tier='free',
            is_solo=True,
            is_active=True,
            is_deletable=False,
            type='game_star_citizen'
        )
        db.add(personal_guild)
        db.commit()  # Commit guild first to resolve ForeignKeyViolation

        # Create default access levels before ranks
        access_view = AccessLevel(
            id=uuid.uuid4(),
            guild_id=personal_guild_id,
            name='view_guilds',
            user_actions=['view_guilds']
        )
        access_manage = AccessLevel(
            id=uuid.uuid4(),
            guild_id=personal_guild_id,
            name='manage_guilds',
            user_actions=['manage_guilds', 'manage_users']
        )
        access_objectives = AccessLevel(
            id=uuid.uuid4(),
            guild_id=personal_guild_id,
            name='objectives',
            user_actions=['create_objective', 'manage_objectives']
        )
        access_rbac = AccessLevel(
            id=uuid.uuid4(),
            guild_id=personal_guild_id,
            name='manage_rbac',
            user_actions=['manage_rbac']
        )
        access_view_ranks = AccessLevel(
            id=uuid.uuid4(),
            guild_id=personal_guild_id,
            name='view_ranks',
            user_actions=['view_ranks']
        )
        access_manage_ranks = AccessLevel(
            id=uuid.uuid4(),
            guild_id=personal_guild_id,
            name='manage_ranks',
            user_actions=['manage_ranks']
        )
        # Create super_admin access level with ALL permissions including manage_ranks
        access_super = AccessLevel(
            id=uuid.uuid4(),
            guild_id=personal_guild_id,
            name='super_admin',
            user_actions=['view_guilds', 'manage_guilds', 'view_users', 'manage_users', 'manage_user_access', 'manage_rbac', 'view_objectives', 'create_objective', 'manage_objectives', 'view_ranks', 'manage_ranks', 'view_categories', 'create_category', 'manage_categories']
        )
        db.add_all([access_view, access_manage, access_objectives, access_rbac, access_view_ranks, access_manage_ranks, access_super])
        db.commit()

        # Create default CO rank with access levels (including manage_rbac, view_ranks, manage_ranks)
        co_rank = Rank(
            id=uuid.uuid4(),
            guild_id=personal_guild_id,
            name="CO",
            phonetic="Commander",
            hierarchy_level=1,  # CO is the highest rank (lowest number)
            access_levels=[access_view.id, access_manage.id, access_objectives.id, access_rbac.id, access_view_ranks.id, access_manage_ranks.id]
        )

        # Add CO rank first
        db.add(co_rank)

        # Create new user
        new_user = User(
            id=uuid.uuid4(),
            guild_id=personal_guild_id,  # Assign to personal guild
            name=user_data.name,
            username=user_data.username,
            email=user_data.email,
            password=hashed_password,
            pin=hashed_pin,
            phonetic=user_data.phonetic,
            availability="offline",
            rank=co_rank.id,  # Assign CO rank
            current_guild_id=personal_guild_id,  # Set to personal guild UUID
            max_guilds=3,
            is_system_admin=False
        )

        db.add(new_user)
        db.commit()

        # Update personal guild creator_id
        personal_guild.creator_id = new_user.id

        # Assign super_admin access level directly to user (non-revocable)
        user_access_super = UserAccess(
            id=uuid.uuid4(),
            user_id=new_user.id,
            access_level_id=access_super.id
        )
        db.add(user_access_super)

        # Create approved GuildRequest for creator in their personal guild
        creator_guild_request = GuildRequest(
            id=uuid.uuid4(),
            user_id=new_user.id,
            guild_id=personal_guild_id,
            status="approved"
        )
        db.add(creator_guild_request)
        db.commit()

        # If invite code was used, create guild request or join directly
        if target_guild_id:
            # Create a guild request for approval
            guild_request = GuildRequest(
                id=uuid.uuid4(),
                user_id=new_user.id,
                guild_id=target_guild_id,
                status="pending"
            )
            db.add(guild_request)
            db.commit()

        return {
            "message": "User registered successfully with personal guild",
            "user_id": str(new_user.id),
            "guild_id": str(personal_guild_id),
            "rank": "CO",
            "invite_processed": bool(user_data.invite_code)
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.get("/preferences")
async def list_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return the global preference catalog."""
    try:
        preferences = (
            db.query(Preference)
            .filter(Preference.is_active.is_(True))
            .order_by(Preference.name.asc())
            .all()
        )

        return [
            {
                "id": str(preference.id),
                "name": preference.name,
                "description": preference.description,
            }
            for preference in preferences
        ]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load preferences: {exc}"
        )


@router.get("/users/{user_id}/preferences")
async def get_user_preferences(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return the active preferences for a specific user."""
    try:
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")

        if str(current_user.id) != user_id and not has_super_admin_access(current_user, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot view preferences for this user"
            )

        user = (
            db.query(User)
            .options(joinedload(User.preferences))
            .filter(User.id == user_uuid)
            .first()
        )

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        preferences = [
            {
                "id": str(preference.id),
                "name": preference.name,
                "description": preference.description,
            }
            for preference in user.preferences
            if preference.is_active
        ]
        preferences.sort(key=lambda pref: pref["name"])

        return {"user_id": str(user.id), "preferences": preferences}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load user preferences: {exc}"
        )


@router.put("/users/{user_id}/preferences")
async def update_user_preferences(
    user_id: str,
    update: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allow a user (or super_admin) to update their preference set."""
    try:
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")

        if str(current_user.id) != user_id and not has_super_admin_access(current_user, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot update preferences for this user"
            )

        user = (
            db.query(User)
            .options(joinedload(User.preferences))
            .filter(User.id == user_uuid)
            .first()
        )

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        desired_ids: Set[uuid.UUID] = set()
        for pref_id in update.preference_ids:
            try:
                desired_ids.add(uuid.UUID(pref_id))
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid preference ID format")

        if desired_ids:
            existing_preferences = (
                db.query(Preference)
                .filter(Preference.id.in_(list(desired_ids)), Preference.is_active.is_(True))
                .all()
            )
            if len(existing_preferences) != len(desired_ids):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more preferences not found")

        existing_entries = db.query(UserPreference).filter(UserPreference.user_id == user_uuid).all()
        existing_ids = {entry.preference_id for entry in existing_entries}

        to_add = desired_ids - existing_ids
        to_remove = existing_ids - desired_ids

        if to_remove:
            db.query(UserPreference).filter(
                UserPreference.user_id == user_uuid,
                UserPreference.preference_id.in_(list(to_remove))
            ).delete(synchronize_session=False)

        for preference_id in to_add:
            db.add(UserPreference(user_id=user_uuid, preference_id=preference_id))

        db.commit()
        db.refresh(user)

        updated_preferences = [
            {
                "id": str(preference.id),
                "name": preference.name,
                "description": preference.description,
            }
            for preference in user.preferences
            if preference.is_active
        ]
        updated_preferences.sort(key=lambda pref: pref["name"])

        return {
            "message": "Preferences updated successfully",
            "preferences": updated_preferences,
        }
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update preferences: {exc}"
        )


@router.get("/users/{user_id}/guilds")
async def get_user_guilds(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all guilds for a user (personal + joined/created)"""
    try:
        # Verify user owns this account
        if str(current_user.id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Can only view your own guilds"
            )

        user_uuid = uuid.UUID(user_id)

        # Get user's personal guild (created by user)
        personal_guild = db.query(Guild).filter(Guild.creator_id == user_uuid).first()

        # Get guilds where user has approved guild requests
        approved_requests = db.query(GuildRequest).filter(
            GuildRequest.user_id == user_uuid,
            GuildRequest.status == "approved"
        ).all()

        guild_ids = set()
        if personal_guild:
            guild_ids.add(personal_guild.id)

        for request in approved_requests:
            guild_ids.add(request.guild_id)

        # Get all guilds user has access to
        all_guilds = db.query(Guild).filter(Guild.id.in_(guild_ids)).all()

        guilds_data = []
        for guild in all_guilds:
            # Count approved members (users with approved guild requests)
            approved_count = db.query(GuildRequest).filter(
                GuildRequest.guild_id == guild.id,
                GuildRequest.status == "approved"
            ).count()

            guilds_data.append({
                "id": str(guild.id),
                "name": guild.name,
                "creator_id": str(guild.creator_id) if guild.creator_id else None,
                "member_limit": guild.member_limit,
                "billing_tier": guild.billing_tier,
                "is_solo": guild.is_solo,
                "is_deletable": guild.is_deletable,
                "type": guild.type,
                "approved_count": approved_count
            })

        return guilds_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve user guilds: {str(e)}"
        )

@router.patch("/users/{user_id}/switch-guild")
async def switch_guild(
    user_id: str,
    switch_data: GuildSwitch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Switch user's current guild context"""
    try:
        # Verify user owns this account
        if str(current_user.id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Can only switch your own guild"
            )

        target_guild_id = uuid.UUID(switch_data.guild_id)

        # Verify target guild exists
        target_guild = db.query(Guild).filter(Guild.id == target_guild_id).first()
        if not target_guild:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target guild not found"
            )

        # Update current_guild_id
        current_user.current_guild_id = str(target_guild_id)
        db.commit()

        return {
            "message": "Guild switched successfully",
            "current_guild_id": str(target_guild_id),
            "guild_name": target_guild.name,
            "tts_response": f"Switched to guild: {target_guild.name}"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Guild switch failed: {str(e)}"
        )

@router.post("/users/{user_id}/join")
async def join_guild(
    user_id: str,
    join_data: JoinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Join a guild using an invite code"""
    logger.debug(f"Join request start: user_id={user_id}, invite_code={join_data.invite_code}")

    try:
        logger.debug(f"Verifying user owns account: current_user.id={current_user.id}, user_id={user_id}")
        # Verify user owns this account
        if str(current_user.id) != user_id:
            logger.warning(f"Join request denied: user {current_user.id} tried to join for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Can only join guilds for yourself"
            )
        logger.debug("User ownership verification passed")

        logger.debug(f"Looking up invite code: {join_data.invite_code}")
        # Find valid invite
        invite = db.query(Invite).filter(
            Invite.code == join_data.invite_code,
            Invite.expires_at > datetime.utcnow()
        ).first()
        logger.debug(f"Invite query result: {invite}")

        if not invite:
            logger.warning(f"Invite code not found or expired: {join_data.invite_code}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid or expired invite code"
            )

        logger.debug(f"Checking invite uses_left: {invite.uses_left}")
        if invite.uses_left <= 0:
            logger.warning(f"Invite code has no uses left: {join_data.invite_code}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invite code has no remaining uses"
            )

        logger.debug(f"Valid invite found: guild_id={invite.guild_id}, uses_left={invite.uses_left}")

        logger.debug("Updating invite uses")
        # Update invite uses
        invite.uses_left -= 1
        logger.debug(f"Decremented invite uses_left to: {invite.uses_left}")

        logger.debug("Creating guild request")
        # Create guild request for approval instead of direct join
        guild_request = GuildRequest(
            id=uuid.uuid4(),
            user_id=current_user.id,
            guild_id=invite.guild_id,
            status="pending"
        )
        logger.debug(f"GuildRequest object created: id={guild_request.id}, user_id={guild_request.user_id}, guild_id={guild_request.guild_id}, status={guild_request.status}")
        db.add(guild_request)
        logger.debug(f"Added guild request to session: id={guild_request.id}")

        logger.debug("Attempting database commit")
        # Attempt to commit with error handling
        try:
            db.commit()
            logger.debug("Database commit successful")
        except Exception as commit_error:
            logger.error(f"Database commit failed: {str(commit_error)}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save guild join request to database"
            )

        logger.debug(f"Querying guild for name: guild_id={invite.guild_id}")
        # Get guild name for response
        guild = db.query(Guild).filter(Guild.id == invite.guild_id).first()
        guild_name = guild.name if guild else "Unknown Guild"
        logger.debug(f"Guild query result: name={guild_name}")

        logger.debug(f"Join request completed successfully: user_id={current_user.id}, guild_id={invite.guild_id}, request_id={guild_request.id}")

        logger.debug("Preparing response data")
        response_data = {
            "message": f"Guild join request submitted for '{guild_name}'. Awaiting approval from guild leader.",
            "guild_request_id": str(guild_request.id),
            "guild_name": guild_name,
            "status": "pending",
            "tts_response": f"Guild join request submitted for: {guild_name}"
        }
        logger.debug(f"Response data prepared: {response_data}")

        return response_data

    except ValidationError as e:
        logger.error(f"Validation error in join request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid request body: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in join_guild: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to join guild: {str(e)}"
        )

@router.post("/users/{user_id}/leave")
async def leave_guild(
    user_id: str,
    leave_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leave a guild and switch to personal guild"""
    try:
        # Verify user owns this account
        if str(current_user.id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Can only leave guilds for yourself"
            )

        guild_id = leave_data.get("guild_id")
        if not guild_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Guild ID is required"
            )

        target_guild_id = uuid.UUID(guild_id)

        # Verify target guild exists
        target_guild = db.query(Guild).filter(Guild.id == target_guild_id).first()
        if not target_guild:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target guild not found"
            )

        # Cannot leave personal guild
        if target_guild.is_solo:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Cannot leave personal guild"
            )

        # Find user's personal guild
        personal_guild = db.query(Guild).filter(
            Guild.creator_id == current_user.id,
            Guild.is_solo == True
        ).first()

        if not personal_guild:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Personal guild not found"
            )

        # Switch to personal guild
        current_user.current_guild_id = str(personal_guild.id)

        db.commit()

        return {
            "message": f"Left guild and switched to: {personal_guild.name}",
            "current_guild_id": str(personal_guild.id),
            "guild_name": personal_guild.name,
            "tts_response": f"Left guild, switched to: {personal_guild.name}"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to leave guild: {str(e)}"
        )

@router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(refresh_data: TokenRefresh, db: Session = Depends(get_db)):
    """Refresh access token using refresh token"""
    try:
        # Verify refresh token
        payload = verify_token(refresh_data.refresh_token)

        if not payload or payload.get("type") != "refresh":
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

        # Determine current guild
        current_guild_id = user.current_guild_id
        if not current_guild_id:
            current_guild_id = user.guild_id

        # Get guild name
        guild = db.query(Guild).filter(Guild.id == current_guild_id).first()
        guild_name = guild.name if guild else "Unknown Guild"

        # Create new access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id), "guild_id": str(current_guild_id)},
            expires_delta=access_token_expires
        )

        # Create new refresh token
        refresh_token_expires = timedelta(days=7)
        new_refresh_token = create_access_token(
            data={"sub": str(user.id), "type": "refresh"},
            expires_delta=refresh_token_expires
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user={
                "id": str(user.id),
                "name": user.name,
                "username": user.username,
                "email": user.email,
                "guild_id": str(user.guild_id),
                "current_guild_id": str(current_guild_id),
                "rank": str(user.rank) if user.rank else None
            },
            current_guild_id=str(current_guild_id),
            guild_name=guild_name
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
        # Check access control
        if not check_objective_access(current_user, db, "create_objective"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Insufficient permissions to create objectives"
            )

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

        # Convert allowed_ranks from strings to UUIDs
        allowed_rank_uuids = []
        if objective.allowed_ranks:
            try:
                allowed_rank_uuids = [uuid.UUID(rank_id) for rank_id in objective.allowed_ranks]
            except ValueError as e:
                raise HTTPException(status_code=400, detail=f"Invalid rank ID format: {str(e)}")

        new_objective = Objective(
            id=obj_id,
            guild_id=guild_uuid,
            name=objective.name,
            description=objective.description,
            preferences=[],  # Will be set based on user preferences if needed
            priority=objective.priority,
            allowed_ranks=allowed_rank_uuids,
            squad_id=uuid.UUID(squad_id) if squad_id else None,
            lead_id=current_user.id  # Set creator as lead
        )

        # Link categories via junction table
        if objective.categories:
            for category_id in objective.categories:
                try:
                    category_uuid = uuid.UUID(category_id)
                    category = db.query(ObjectiveCategory).filter(
                        ObjectiveCategory.id == category_uuid,
                        ObjectiveCategory.guild_id == guild_uuid
                    ).first()
                    if category:
                        new_objective.categories.append(category)
                except ValueError:
                    # If it's not a valid UUID, try treating it as a name (backward compatibility)
                    category = db.query(ObjectiveCategory).filter(
                        ObjectiveCategory.guild_id == guild_uuid,
                        ObjectiveCategory.name == category_id
                    ).first()
                    if category:
                        new_objective.categories.append(category)

        db.add(new_objective)
        db.commit()
        db.refresh(new_objective)

        # Return the complete objective data
        return {
            "id": str(new_objective.id),
            "guild_id": str(new_objective.guild_id),
            "name": new_objective.name,
            "description": new_objective.description,
            "preferences": new_objective.preferences,
            "categories": [str(cat.id) for cat in new_objective.categories],
            "priority": new_objective.priority,
            "allowed_ranks": [str(rank_id) for rank_id in new_objective.allowed_ranks],
            "progress": new_objective.progress,
            "tasks": [str(task_id) for task_id in new_objective.tasks],
            "lead_id": str(new_objective.lead_id) if new_objective.lead_id else None,
            "squad_id": str(new_objective.squad_id) if new_objective.squad_id else None,
            "is_deleted": new_objective.is_deleted
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create objective: {str(e)}")

@router.get("/objectives/{objective_id}")
async def get_objective(
    objective_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get objective details"""
    try:
        # Check access control
        if not check_objective_access(current_user, db, "view_objectives"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Insufficient permissions to view objectives"
            )

        obj_uuid = uuid.UUID(objective_id)
        objective = db.query(Objective).filter(
            Objective.id == obj_uuid,
            Objective.is_deleted == False
        ).first()

        if not objective:
            raise HTTPException(status_code=404, detail="Objective not found")

        # Verify user belongs to the guild
        if str(current_user.guild_id) != str(objective.guild_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        # Get rank name mapping for this guild
        guild_uuid = objective.guild_id
        existing_ranks = db.query(Rank).filter(Rank.guild_id == guild_uuid).all()
        rank_id_to_name = {str(rank.id): rank.name for rank in existing_ranks}

        result = {
            "id": str(objective.id),
            "name": objective.name,
            "description": objective.description,
            "categories": [str(cat.id) for cat in objective.categories],
            "priority": objective.priority,
            "progress": objective.progress,
            "allowed_ranks": [rank_id_to_name.get(str(rank_id), str(rank_id)) for rank_id in objective.allowed_ranks],
            "allowed_rank_ids": [str(rank_id) for rank_id in objective.allowed_ranks],
            "tasks": objective.tasks,
            "lead_id": str(objective.lead_id) if objective.lead_id else None,
            "squad_id": str(objective.squad_id) if objective.squad_id else None,
            "guild_id": str(objective.guild_id)
        }

        logger.info(f"Returning single objective {objective_id}: allowed_ranks={result['allowed_ranks']}, allowed_rank_ids={result['allowed_rank_ids']}")
        return result
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid objective ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve objective: {str(e)}")


@router.put("/objectives/{objective_id}")
async def update_objective(
    objective_id: str,
    objective_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update objective details and progress"""
    try:
        # Check access control
        if not check_objective_access(current_user, db, "manage_objectives"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Insufficient permissions to update objectives"
            )

        obj_uuid = uuid.UUID(objective_id)
        objective = db.query(Objective).filter(
            Objective.id == obj_uuid,
            Objective.is_deleted == False
        ).first()

        if not objective:
            raise HTTPException(status_code=404, detail="Objective not found")

        # Verify user belongs to the guild
        if str(current_user.guild_id) != str(objective.guild_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        # Update fields from the objective_data dict
        if 'name' in objective_data:
            objective.name = objective_data['name']

        if 'description' in objective_data:
            objective.description = objective_data['description']

        if 'progress' in objective_data:
            objective.progress = objective_data['progress']
            # Progress tracking: update related tasks
            await update_tasks_on_objective_progress(db, objective)

        if 'categories' in objective_data:
            # Clear existing categories and add new ones
            objective.categories.clear()
            guild_uuid = objective.guild_id
            for category_id in objective_data['categories']:
                try:
                    category_uuid = uuid.UUID(category_id)
                    category = db.query(ObjectiveCategory).filter(
                        ObjectiveCategory.id == category_uuid,
                        ObjectiveCategory.guild_id == guild_uuid
                    ).first()
                    if category:
                        objective.categories.append(category)
                except ValueError:
                    # If it's not a valid UUID, try treating it as a name (backward compatibility)
                    category = db.query(ObjectiveCategory).filter(
                        ObjectiveCategory.guild_id == guild_uuid,
                        ObjectiveCategory.name == category_id
                    ).first()
                    if category:
                        objective.categories.append(category)

        if 'priority' in objective_data:
            objective.priority = objective_data['priority']

        if 'allowed_ranks' in objective_data:
            # Convert string UUIDs to UUID objects for database storage
            try:
                objective.allowed_ranks = [uuid.UUID(rank_id) for rank_id in objective_data['allowed_ranks']]
            except ValueError as e:
                raise HTTPException(status_code=400, detail=f"Invalid rank ID format: {str(e)}")

        db.commit()
        db.refresh(objective)

        # Return the updated objective data
        return {
            "id": str(objective.id),
            "guild_id": str(objective.guild_id),
            "name": objective.name,
            "description": objective.description,
            "preferences": objective.preferences,
            "categories": [str(cat.id) for cat in objective.categories],
            "priority": objective.priority,
            "allowed_ranks": [str(rank_id) for rank_id in objective.allowed_ranks],
            "progress": objective.progress,
            "tasks": [str(task_id) for task_id in objective.tasks],
            "lead_id": str(objective.lead_id) if objective.lead_id else None,
            "squad_id": str(objective.squad_id) if objective.squad_id else None,
            "is_deleted": objective.is_deleted
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid objective ID format")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update objective: {str(e)}")

@router.patch("/objectives/{objective_id}")
async def patch_objective(objective_id: str, update: ObjectiveUpdate, db: Session = Depends(get_db)):
    """Update objective progress or description (partial update)"""
    try:
        obj_uuid = uuid.UUID(objective_id)
        objective = db.query(Objective).filter(Objective.id == obj_uuid).first()

        # Log the patch request for debugging
        logger.info(f"PATCH objective update request for {objective_id}: allowed_ranks={update.allowed_ranks}")

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

        if update.allowed_ranks is not None:
            logger.info(f"PATCH: Updating allowed_ranks for objective {objective_id}: {update.allowed_ranks}")
            # Convert string UUIDs to UUID objects for database storage
            try:
                objective.allowed_ranks = [uuid.UUID(rank_id) for rank_id in update.allowed_ranks]
            except ValueError as e:
                raise HTTPException(status_code=400, detail=f"Invalid rank ID format: {str(e)}")

        db.commit()
        db.refresh(objective)

        # Return the updated objective data
        return {
            "id": str(objective.id),
            "guild_id": str(objective.guild_id),
            "name": objective.name,
            "description": objective.description,
            "preferences": objective.preferences,
            "categories": [str(cat.id) for cat in objective.categories],
            "priority": objective.priority,
            "allowed_ranks": [str(rank_id) for rank_id in objective.allowed_ranks],
            "progress": objective.progress,
            "tasks": [str(task_id) for task_id in objective.tasks],
            "lead_id": str(objective.lead_id) if objective.lead_id else None,
            "squad_id": str(objective.squad_id) if objective.squad_id else None,
            "is_deleted": objective.is_deleted
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid objective ID format")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update objective: {str(e)}")

@router.delete("/objectives/{objective_id}")
async def delete_objective(
    objective_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Soft delete an objective"""
    try:
        # Check access control
        if not check_objective_access(current_user, db, "manage_objectives"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Insufficient permissions to delete objectives"
            )

        obj_uuid = uuid.UUID(objective_id)
        objective = db.query(Objective).filter(
            Objective.id == obj_uuid,
            Objective.is_deleted == False
        ).first()

        if not objective:
            raise HTTPException(status_code=404, detail="Objective not found")

        # Verify user belongs to the guild
        if str(current_user.guild_id) != str(objective.guild_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        # Soft delete
        objective.is_deleted = True
        db.commit()

        return {
            "message": "Objective deleted successfully",
            "tts_response": "Objective deleted"
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid objective ID format")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete objective: {str(e)}")

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
async def get_objectives(
    guild_id: str = None,
    status: str = None,
    category: str = None,
    category_id: str = None,
    rank_filter: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get objectives for a guild with optional filtering"""
    try:
        # Check access control
        if not check_objective_access(current_user, db, "view_objectives"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Insufficient permissions to view objectives"
            )

        # guild_id is required for multitenancy
        if not guild_id:
            raise HTTPException(status_code=400, detail="guild_id parameter required")

        # Verify user belongs to the guild
        if str(current_user.guild_id) != guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        guild_uuid = uuid.UUID(guild_id)
        query = db.query(Objective).filter(
            Objective.guild_id == guild_uuid,
            Objective.is_deleted == False
        )

        # Filter by category name if provided (join with categories)
        if category:
            query = query.join(Objective.categories).filter(ObjectiveCategory.name == category)

        # Filter by category_id if provided (join with categories)
        if category_id:
            category_uuid = uuid.UUID(category_id)
            query = query.join(Objective.categories).filter(ObjectiveCategory.id == category_uuid)

        objectives = query.all()

        # Filter by status if provided (status derived from progress)
        if status:
            filtered_objectives = []
            for obj in objectives:
                obj_status = obj.progress.get("status", "active")  # Default to active
                if obj_status == status:
                    filtered_objectives.append(obj)
            objectives = filtered_objectives

        # Filter by rank_filter if provided (admin only)
        if rank_filter:
            # Check if user has admin access for rank filtering
            if not check_admin_access(current_user, db):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Admin access required for rank filtering"
                )
            rank_uuid = uuid.UUID(rank_filter)
            filtered_objectives = []
            for obj in objectives:
                # Convert UUIDs to strings for comparison
                allowed_ranks_str = [str(rank_id) for rank_id in obj.allowed_ranks]
                if str(rank_uuid) in allowed_ranks_str:
                    filtered_objectives.append(obj)
            objectives = filtered_objectives

        # Apply rank-based visibility filtering (non-admin users)
        # Check for super_admin bypass
        user_access_levels = db.query(UserAccess).filter(UserAccess.user_id == current_user.id).all()
        has_super_admin = any(
            db.query(AccessLevel).filter(AccessLevel.id == ua.access_level_id, AccessLevel.name == 'super_admin').first()
            for ua in user_access_levels
        )

        if not has_super_admin:
            # Filter objectives where user's rank is in allowed_ranks
            user_rank_id = str(current_user.rank) if current_user.rank else None
            if user_rank_id:
                filtered_objectives = []
                for obj in objectives:
                    # Convert UUIDs to strings for comparison
                    allowed_ranks_str = [str(rank_id) for rank_id in obj.allowed_ranks]
                    if user_rank_id in allowed_ranks_str:
                        filtered_objectives.append(obj)
                objectives = filtered_objectives
            else:
                # User has no rank, show only objectives with empty allowed_ranks (shouldn't happen normally)
                objectives = [obj for obj in objectives if not obj.allowed_ranks]

        # Get all existing ranks for this guild for name resolution and sanitization
        existing_ranks = db.query(Rank).filter(Rank.guild_id == guild_uuid).all()
        existing_rank_ids = {str(rank.id) for rank in existing_ranks}
        rank_id_to_name = {str(rank.id): rank.name for rank in existing_ranks}

        result = []
        for obj in objectives:
            sanitized_rank_ids = []
            allowed_rank_names = []
            for rank_id in obj.allowed_ranks:
                rank_id_str = str(rank_id)
                if rank_id_str in existing_rank_ids:
                    sanitized_rank_ids.append(rank_id_str)
                    allowed_rank_names.append(rank_id_to_name.get(rank_id_str, rank_id_str))

            result.append({
                "id": str(obj.id),
                "name": obj.name,
                "description": obj.description,
                "categories": [str(cat.id) for cat in obj.categories],
                "priority": obj.priority,
                "progress": obj.progress,
                "allowed_ranks": allowed_rank_names,
                "allowed_rank_ids": sanitized_rank_ids,
                "guild_id": str(obj.guild_id),
                "lead_id": str(obj.lead_id) if obj.lead_id else None,
                "squad_id": str(obj.squad_id) if obj.squad_id else None
            })

        return result
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid guild ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve objectives: {str(e)}")

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
                "categories": [str(cat.id) for cat in obj.categories],
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

@router.get("/guilds/{guild_id}")
async def get_guild(guild_id: str, db: Session = Depends(get_db)):
    """Get guild details"""
    try:
        guild_uuid = uuid.UUID(guild_id)
        guild = db.query(Guild).filter(Guild.id == guild_uuid).first()

        if not guild:
            raise HTTPException(status_code=404, detail="Guild not found")

        return {
            "id": str(guild.id),
            "name": guild.name,
            "member_limit": guild.member_limit,
            "billing_tier": guild.billing_tier,
            "is_solo": guild.is_solo,
            "is_active": guild.is_active,
            "type": guild.type
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid guild ID format")

@router.post("/invites")
async def create_invite(invite_data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new invite for a guild"""
    try:
        guild_uuid = uuid.UUID(invite_data["guild_id"])

        # Verify user has access to the guild
        if str(current_user.guild_id) != invite_data["guild_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        # Check member limit before creating invite
        guild = db.query(Guild).filter(Guild.id == guild_uuid).first()
        if not guild:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Guild not found"
            )

        # Count approved members (users with approved guild requests)
        approved_count = db.query(GuildRequest).filter(
            GuildRequest.guild_id == guild.id,
            GuildRequest.status == "approved"
        ).count()

        if approved_count >= guild.member_limit:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Guild member limit reached ({approved_count}/{guild.member_limit}). Upgrade to add more members."
            )

        # Generate unique invite code
        import secrets
        invite_code = secrets.token_urlsafe(8)

        # Set default expiration to 7 days if not provided
        expires_at = invite_data.get("expires_at")
        if not expires_at:
            expires_at = datetime.utcnow() + timedelta(days=7)

        invite = Invite(
            id=uuid.uuid4(),
            guild_id=guild_uuid,
            code=invite_code,
            expires_at=expires_at,
            uses_left=invite_data.get("uses_left", 1)
        )

        db.add(invite)
        db.commit()

        # Get guild name for response
        guild = db.query(Guild).filter(Guild.id == invite.guild_id).first()
        guild_name = guild.name if guild else "Unknown Guild"

        return {
            "id": str(invite.id),
            "code": invite_code,
            "guild_id": str(invite.guild_id),
            "guild_name": guild_name,
            "expires_at": invite.expires_at.isoformat() if invite.expires_at else None,
            "uses_left": invite.uses_left
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create invite: {str(e)}"
        )

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

# Category Endpoints
@router.post("/categories")
async def create_category(
    category: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new category"""
    try:
        # Check access control
        if not check_category_access(current_user, db, "create_category"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Insufficient permissions to create categories"
            )

        # Verify user belongs to the guild
        if str(current_user.guild_id) != category.guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        cat_id = uuid.uuid4()
        guild_uuid = uuid.UUID(category.guild_id)

        new_category = ObjectiveCategory(
            id=cat_id,
            guild_id=guild_uuid,
            name=category.name,
            description=category.description
        )

        db.add(new_category)
        db.commit()

        return {
            "id": str(cat_id),
            "message": f"Category '{category.name}' created successfully",
            "tts_response": f"Category created: {category.name}"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create category: {str(e)}")

@router.get("/categories/{category_id}")
async def get_category(
    category_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get category details"""
    try:
        # Check access control
        if not check_category_access(current_user, db, "view_categories"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Insufficient permissions to view categories"
            )

        cat_uuid = uuid.UUID(category_id)
        category = db.query(ObjectiveCategory).filter(ObjectiveCategory.id == cat_uuid).first()

        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

        # Verify user belongs to the guild
        if str(current_user.guild_id) != str(category.guild_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        return {
            "id": str(category.id),
            "name": category.name,
            "description": category.description,
            "guild_id": str(category.guild_id)
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid category ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve category: {str(e)}")

@router.put("/categories/{category_id}")
async def update_category(
    category_id: str,
    update: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update category details"""
    try:
        # Check access control
        if not check_category_access(current_user, db, "manage_categories"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Insufficient permissions to update categories"
            )

        cat_uuid = uuid.UUID(category_id)
        category = db.query(ObjectiveCategory).filter(ObjectiveCategory.id == cat_uuid).first()

        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

        # Verify user belongs to the guild
        if str(current_user.guild_id) != str(category.guild_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        # Update fields
        if update.name is not None:
            category.name = update.name
        if update.description is not None:
            category.description = update.description

        db.commit()

        return {
            "message": "Category updated successfully",
            "tts_response": "Category updated"
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid category ID format")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update category: {str(e)}")

@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a category and unlink it from all objectives"""
    try:
        # Check access control
        if not check_category_access(current_user, db, "manage_categories"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Insufficient permissions to delete categories"
            )

        cat_uuid = uuid.UUID(category_id)
        category = db.query(ObjectiveCategory).filter(ObjectiveCategory.id == cat_uuid).first()

        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

        # Verify user belongs to the guild
        if str(current_user.guild_id) != str(category.guild_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        # Unlink category from all objectives (clear relationships)
        objectives_with_category = db.query(Objective).join(Objective.categories).filter(ObjectiveCategory.id == cat_uuid).all()
        for objective in objectives_with_category:
            objective.categories.remove(category)

        # Delete the category
        db.delete(category)
        db.commit()

        return {
            "message": "Category deleted successfully",
            "tts_response": "Category deleted"
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid category ID format")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete category: {str(e)}")

@router.get("/categories")
async def get_categories(
    guild_id: str = None,
    name: str = None,
    description: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get categories for a guild with optional filtering"""
    try:
        # Check access control
        if not check_category_access(current_user, db, "view_categories"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Insufficient permissions to view categories"
            )

        # guild_id is required for multitenancy
        if not guild_id:
            raise HTTPException(status_code=400, detail="guild_id parameter required")

        # Verify user belongs to the guild
        if str(current_user.guild_id) != guild_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User does not belong to this guild"
            )

        guild_uuid = uuid.UUID(guild_id)
        query = db.query(ObjectiveCategory).filter(ObjectiveCategory.guild_id == guild_uuid)

        # Apply filters
        if name:
            query = query.filter(ObjectiveCategory.name.ilike(f"%{name}%"))
        if description:
            query = query.filter(ObjectiveCategory.description.ilike(f"%{description}%"))

        categories = query.all()

        return [
            {
                "id": str(cat.id),
                "name": cat.name,
                "description": cat.description,
                "guild_id": str(cat.guild_id)
            }
            for cat in categories
        ]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid guild ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve categories: {str(e)}")
