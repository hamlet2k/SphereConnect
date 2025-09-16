# Copyright 2025 Federico Arce. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

import os
import re
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional
import jwt

from ..core.models import get_db, User, Guild
from .routes import SECRET_KEY, ALGORITHM

class GuildLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.default_member_limit = int(os.getenv('STAR_CITIZEN_FREE_MEMBERS', '2'))
        self.default_max_guilds = 3

    async def dispatch(self, request, call_next):
        if self._should_check_limits(request):
            user = self._get_current_user(request)
            if not user:
                return await call_next(request)

            limit_exceeded = self._check_limits(request, user)
            if limit_exceeded:
                return JSONResponse(
                    status_code=402,
                    content={"detail": "Payment Required", "message": limit_exceeded}
                )

        return await call_next(request)

    def _should_check_limits(self, request) -> bool:
        path = request.url.path
        method = request.method

        if path == "/api/guilds" and method == "POST":
            return True

        if re.match(r"/api/users/[^/]+/join$", path) and method in ["PATCH", "POST"]:
            return True

        if path == "/api/invites" and method == "POST":
            return True

        return False

    def _get_current_user(self, request) -> Optional[User]:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ")[1]
        payload = self._verify_token(token)
        if not payload:
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        db: Session = next(get_db())
        try:
            user = db.query(User).filter(User.id == user_id).first()
            return user
        finally:
            db.close()

    def _verify_token(self, token: str) -> Optional[dict]:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except (jwt.ExpiredSignatureError, jwt.DecodeError, jwt.PyJWTError):
            return None

    def _check_limits(self, request, user: User) -> Optional[str]:
        path = request.url.path
        method = request.method
        db: Session = next(get_db())

        try:
            if path == "/api/guilds" and method == "POST":
                guild_count = db.query(Guild).filter(Guild.creator_id == user.id).count()
                if guild_count >= user.max_guilds:
                    return f"Maximum guild limit of {user.max_guilds} reached (including personal)"

            elif re.match(r"/api/users/([^/]+)/join$", path) and method in ["PATCH", "POST"]:
                guild_id = re.match(r"/api/users/([^/]+)/join$", path).group(1)
                try:
                    guild_uuid = uuid.UUID(guild_id)
                except ValueError:
                    return "Invalid guild ID"

                guild = db.query(Guild).filter(Guild.id == guild_uuid).first()
                if not guild:
                    return "Guild not found"

                member_count = db.query(User).filter(User.guild_id == guild.id).count()
                member_limit = guild.member_limit or self.default_member_limit
                if member_count >= member_limit:
                    return f"Guild member limit of {member_limit} reached"

            elif path == "/api/invites" and method == "POST":
                # Placeholder: check user's max_guilds, assuming invite leads to joining
                guild_count = db.query(Guild).filter(Guild.creator_id == user.id).count()
                if guild_count >= user.max_guilds:
                    return f"Maximum guild limit of {user.max_guilds} reached"

        finally:
            db.close()

        return None