# Copyright 2025 Federico Arce. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.
import logging
logger = logging.getLogger(__name__)
import os
import re
import uuid
import json
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.requests import Request
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
        logger.debug(f"Middleware: Processing request {request.method} {request.url.path}")

        should_check = self._should_check_limits(request)
        body_bytes = None

        if should_check and request.method in ("POST", "PATCH"):
            logger.debug("Middleware: Capturing request body for downstream reuse")
            body_bytes = await request.body()

            async def receive():
                return {"type": "http.request", "body": body_bytes, "more_body": False}

            request = Request(request.scope, receive)
            request._body = body_bytes

        if should_check:
            logger.debug(f"Middleware: Request requires limit checking")
            user = self._get_current_user(request)
            if not user:
                logger.debug(f"Middleware: No authenticated user found")
                return await call_next(request)

            logger.debug(f"Middleware: Authenticated user {user.id} for guild {user.guild_id}")
            limit_exceeded = await self._check_limits(request, user, body_bytes)
            if limit_exceeded:
                logger.debug(f"Middleware: Limit exceeded: {limit_exceeded}")
                return JSONResponse(
                    status_code=402,
                    content={"detail": "Payment Required", "message": limit_exceeded}
                )
            logger.debug(f"Middleware: Limits check passed")

        response = await call_next(request)
        logger.debug(f"Middleware: Request completed with status {response.status_code}")
        return response

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

    async def _check_limits(self, request, user: User, body_bytes: Optional[bytes]) -> Optional[str]:
        path = request.url.path
        method = request.method
        logger.debug(f"Middleware: Checking limits for {method} {path}")
        db: Session = next(get_db())

        try:
            if path == "/api/guilds" and method == "POST":
                logger.debug(f"Middleware: Checking guild creation limits for user {user.id}")
                guild_count = db.query(Guild).filter(Guild.creator_id == user.id).count()
                logger.debug(f"Middleware: User has {guild_count} guilds, max is {user.max_guilds}")
                if guild_count >= user.max_guilds:
                    return f"Maximum guild limit of {user.max_guilds} reached (including personal)"

            elif re.match(r"/api/users/([^/]+)/join$", path) and method in ["PATCH", "POST"]:
                logger.debug(f"Middleware: Processing join request for user {user.id}")

                if body_bytes is None:
                    logger.debug("Middleware: Body bytes missing, reading from request")
                    body_bytes = await request.body()

                try:
                    logger.debug(f"Middleware: Parsing request body ({len(body_bytes)} bytes)")
                    body = json.loads(body_bytes.decode('utf-8'))
                    request._body = body_bytes  # Restore the body for endpoint consumption
                    logger.debug(f"Middleware: Restored body: {len(body_bytes)} bytes")
                except json.JSONDecodeError as e:
                    logger.error(f"Middleware: JSON decode error: {e}")
                    return "Invalid JSON in request body"
                except Exception as e:
                    logger.error(f"Middleware: Failed to read request body: {e}")
                    return "Invalid request body"

                invite_code = body.get('invite_code')
                logger.debug(f"Middleware: Invite code: {invite_code}")
                if not invite_code:
                    return "Invalid invite code"

                # Lookup invite
                logger.debug(f"Middleware: Looking up invite code {invite_code}")
                invite = db.query(Invite).filter(Invite.code == invite_code).first()
                if not invite:
                    logger.debug(f"Middleware: Invite code not found")
                    return "Invalid invite code"

                guild_id = invite.guild_id
                logger.debug(f"Middleware: Invite belongs to guild {guild_id}")

                # Query approved_count
                approved_count = db.query(GuildRequest).filter(
                    GuildRequest.guild_id == guild_id,
                    GuildRequest.status == "approved"
                ).count()
                logger.debug(f"Middleware: Guild {guild_id} has {approved_count} approved members")

                # Query user_guilds
                user_guilds = db.query(GuildRequest).filter(
                    GuildRequest.user_id == user.id,
                    GuildRequest.status == "approved"
                ).count()
                logger.debug(f"Middleware: User {user.id} has {user_guilds} approved guild memberships")

                # Get guild for member_limit
                guild = db.query(Guild).filter(Guild.id == guild_id).first()
                if not guild:
                    logger.debug(f"Middleware: Guild {guild_id} not found")
                    return "Guild not found"

                # Check member limit
                member_limit = guild.member_limit or 2
                logger.debug(f"Middleware: Guild member limit is {member_limit}")
                if approved_count >= member_limit:
                    logger.debug(f"Middleware: Guild at member limit ({approved_count}/{member_limit})")
                    return f"Guild at member limit ({approved_count}/{member_limit}). Upgrade plan."

                # Check user guild limit
                if user_guilds >= user.max_guilds:
                    logger.debug(f"Middleware: User at guild limit ({user_guilds}/{user.max_guilds})")
                    return f"User at guild limit ({user_guilds}/{user.max_guilds})."

                logger.debug(f"Middleware: Join validation passed for user {user.id}, guild {guild_id}")

            elif re.match(r"/api/admin/guild_requests/([^/]+)$", path) and method == "PATCH":
                logger.debug(f"Middleware: Processing guild request approval")
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

                logger.debug(f"Middleware: Approval validation passed for request {request_id}")

            elif path == "/api/invites" and method == "POST":
                logger.debug(f"Middleware: Checking invite creation limits")
                guild_count = db.query(Guild).filter(Guild.creator_id == user.id).count()
                if guild_count >= user.max_guilds:
                    return f"Maximum guild limit of {user.max_guilds} reached"

        finally:
            db.close()
            logger.debug(f"Middleware: Database closed")

        return None