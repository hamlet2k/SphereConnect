# Copyright 2025 Federico Arce. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

import os
import re
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional
import jwt

from ..core.models import get_db, User, Guild, Invite, GuildRequest
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

        if re.match(r"/api/admin/guild_requests/[^/]+$", path) and method == "PATCH":
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
                # Get body = await request.json()
                import json
                try:
                    body = json.loads(request._body.decode('utf-8')) if hasattr(request, '_body') and request._body else {}
                except:
                    return "Invalid request body"

                invite_code = body.get('invite_code')
                if not invite_code:
                    return "Invalid invite code"

                # Lookup invite = db.query(Invite).filter(Invite.code == invite_code).first()
                invite = db.query(Invite).filter(Invite.code == invite_code).first()
                if not invite:
                    return "Invalid invite code"

                guild_id = invite.guild_id

                # Query approved_count = db.execute("SELECT COUNT(*) FROM guild_requests WHERE guild_id=:guild_id AND status='approved'").scalar()
                approved_count = db.query(GuildRequest).filter(
                    GuildRequest.guild_id == guild_id,
                    GuildRequest.status == "approved"
                ).count()

                # Query user_guilds = db.execute("SELECT COUNT(*) FROM guild_requests WHERE user_id=:user_id AND status='approved'").scalar()
                user_guilds = db.query(GuildRequest).filter(
                    GuildRequest.user_id == user.id,
                    GuildRequest.status == "approved"
                ).count()

                # Get guild for member_limit
                guild = db.query(Guild).filter(Guild.id == guild_id).first()
                if not guild:
                    return "Guild not found"

                # If approved_count >= (guild.member_limit or 2): return f"Guild at member limit ({approved_count}/{(guild.member_limit or 2)}). Upgrade plan."
                member_limit = guild.member_limit or 2
                if approved_count >= member_limit:
                    return f"Guild at member limit ({approved_count}/{member_limit}). Upgrade plan."

                # If user_guilds >= user.max_guilds: return f"User at guild limit ({user_guilds}/{user.max_guilds})."
                if user_guilds >= user.max_guilds:
                    return f"User at guild limit ({user_guilds}/{user.max_guilds})."

                # Log: logging.debug(f"Middleware: Join, user_id={user.id}, guild_id={guild_id}, invite_code={invite_code}, approved_count={approved_count}, user_guilds={user_guilds}")
                logging.debug(f"Middleware: Join, user_id={user.id}, guild_id={guild_id}, invite_code={invite_code}, approved_count={approved_count}, user_guilds={user_guilds}")

            elif re.match(r"/api/admin/guild_requests/([^/]+)$", path) and method == "PATCH":
                # Get guild_request = db.query(GuildRequest).filter(GuildRequest.id == id).first()
                request_id = re.match(r"/api/admin/guild_requests/([^/]+)$", path).group(1)
                try:
                    request_uuid = uuid.UUID(request_id)
                except ValueError:
                    return "Invalid request ID"

                guild_request = db.query(GuildRequest).filter(GuildRequest.id == request_uuid).first()
                if not guild_request:
                    return "Guild request not found"

                guild_id = guild_request.guild_id

                # Query approved_count and user_guilds, return 402 if over limits
                approved_count = db.query(GuildRequest).filter(
                    GuildRequest.guild_id == guild_id,
                    GuildRequest.status == "approved"
                ).count()

                user_guilds = db.query(GuildRequest).filter(
                    GuildRequest.user_id == guild_request.user_id,
                    GuildRequest.status == "approved"
                ).count()

                # Get guild for member_limit
                guild = db.query(Guild).filter(Guild.id == guild_id).first()
                if not guild:
                    return "Guild not found"

                member_limit = guild.member_limit or 2
                if approved_count >= member_limit:
                    return f"Guild at member limit ({approved_count}/{member_limit}). Upgrade plan."

                if user_guilds >= user.max_guilds:
                    return f"User at guild limit ({user_guilds}/{user.max_guilds})."

                logging.debug(f"Middleware: Approval, request_id={request_id}, user_id={guild_request.user_id}, guild_id={guild_id}, approved_count={approved_count}, user_guilds={user_guilds}")

            elif path == "/api/invites" and method == "POST":
                # Placeholder: check user's max_guilds, assuming invite leads to joining
                guild_count = db.query(Guild).filter(Guild.creator_id == user.id).count()
                if guild_count >= user.max_guilds:
                    return f"Maximum guild limit of {user.max_guilds} reached"

        finally:
            db.close()

        return None