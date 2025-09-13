#!/usr/bin/env python3
"""
SphereConnect Server Startup Script

This script starts the FastAPI server for ConnectSphere with Wingman-AI integration.

Usage:
    python scripts/start_server.py

The server will start on http://localhost:8000 with the following endpoints:
- FastAPI: http://localhost:8000/docs (Swagger UI)
- Flask Alternative: http://localhost:5000 (if needed)

Wingman-AI Skill Endpoints:
- POST /api/objectives - Create objectives
- GET /api/objectives/{id} - Get objective details
- PATCH /api/objectives/{id} - Update objective
- PATCH /api/objectives/{id}/progress - Update progress
- POST /api/tasks - Create tasks
- POST /api/tasks/assign - Assign tasks
- PATCH /api/tasks/{id}/schedule - Schedule tasks
- GET /api/guilds/{id}/ai_commanders - Get AI commander
- POST /api/voice_command - Process voice commands
"""

import uvicorn
import os
import sys

# Add the project root to Python path so we can import app modules
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from app.core.models import create_tables

def main():
    print("🚀 Starting SphereConnect Server...")
    print("=" * 50)

    # Create database tables
    print("📊 Creating database tables...")
    create_tables()
    print("✅ Database tables created/verified")

    # Start the FastAPI server
    print("🌐 Starting FastAPI server on http://localhost:8000")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🎯 Wingman-AI Skill Ready!")
    print()
    print("Voice Commands Supported:")
    print("  • 'Create objective: Collect 500 SCU Gold'")
    print("  • 'Assign task Scout Route to Pilot X'")
    print("  • 'Delivered 100 SCU Gold'")
    print("  • 'Schedule task for 20 minutes now'")
    print("=" * 50)

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    main()
