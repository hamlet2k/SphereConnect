"""Shared security helpers for API modules."""

from sqlalchemy.orm import Session

from app.core.models import AccessLevel, User, UserAccess


def has_super_admin_access(user: User, db: Session) -> bool:
    """Return True if the user has the global super_admin access level."""
    user_access_levels = db.query(UserAccess).filter(UserAccess.user_id == user.id).all()
    for user_access in user_access_levels:
        access_level = (
            db.query(AccessLevel)
            .filter(AccessLevel.id == user_access.access_level_id)
            .first()
        )
        if access_level and access_level.name == "super_admin":
            return True
    return False
