# Copyright 2025 Federico Arce. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import jwt
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os
import sys

# Rate limiting imports
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Import our models and routes
from .core.models import get_db, create_tables
from .api.routes import router
from .api.admin_routes import router as admin_router
from .api.middleware import GuildLimitMiddleware

load_dotenv()

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

logger.debug("Testing debug logger")
class Settings(BaseSettings):
    db_user: str = "postgres"
    db_pass: str
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "sphereconnect"
    cors_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env.local"
        extra = "ignore"

try:
    settings = Settings()
    logger.info("Configuration loaded successfully")
except ValidationError as e:
    logger.error(f"Configuration validation failed: {e}")
    raise

try:
    logger.info("Initializing SphereConnect API...")
    app = FastAPI(title="SphereConnect API")
    logger.info("FastAPI app initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize FastAPI app: {e}")
    raise

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(",") if "," in settings.cors_origins else [settings.cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Guild limit middleware
app.add_middleware(GuildLimitMiddleware)

# Rate limiting setup (disabled for now to avoid configuration issues)
# limiter = Limiter(key_func=get_remote_address)
# app.state.limiter = limiter
# app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
# app.add_middleware(SlowAPIMiddleware)

# Include the API routes
app.include_router(router, prefix="/api", tags=["sphereconnect"])
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])

# Health check endpoint
@app.get("/health", tags=["health"])
async def health_check():
    logger.debug("Health check endpoint called")
    return {"status": "healthy", "service": "SphereConnect API"}

# Create all database tables
try:
    logger.info("Attempting to create database tables...")
    create_tables()
    logger.info("Database tables created successfully")
except Exception as e:
    logger.error(f"Failed to create database tables: {e}")
    raise
