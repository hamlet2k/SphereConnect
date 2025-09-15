# Configuration Guide

This guide explains how to configure SphereConnect for different environments and use cases.

## Environment Variables

### Core Configuration

#### Database Settings
```bash
# PostgreSQL connection parameters
DB_USER=postgres                    # Database username
DB_PASS=your_secure_password        # Database password
DB_HOST=localhost                   # Database host
DB_PORT=5432                        # Database port
DB_NAME=sphereconnect               # Database name
```

#### Security Settings
```bash
# JWT token configuration
JWT_SECRET_KEY=your-256-bit-secret  # Must be strong for production
JWT_ALGORITHM=HS256                 # HS256 recommended
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30  # Token lifetime

# General security
SECRET_KEY=another-strong-secret    # Flask/Django style secret
```

#### Email Configuration (Optional)
```bash
# SMTP settings for notifications
EMAIL_USER=your-email@gmail.com     # SMTP username
EMAIL_PASS=your-app-password        # SMTP password/app password
EMAIL_HOST=smtp.gmail.com           # SMTP server
EMAIL_PORT=587                      # SMTP port
```

### Advanced Settings

#### Rate Limiting
```bash
# Request rate limits (requests per minute)
LOGIN_RATE_LIMIT=5                  # Login attempts
REGISTER_RATE_LIMIT=3               # Registration attempts
```

#### Security Policies
```bash
# Account security
MAX_FAILED_ATTEMPTS=5               # Before lockout
LOCKOUT_DURATION_MINUTES=15         # Lockout period
MAX_CONCURRENT_SESSIONS=3           # Per user
```

#### AI Commander Settings
```bash
# Default AI personality
DEFAULT_AI_NAME=UEE Commander
DEFAULT_SYSTEM_PROMPT=Act as a UEE Commander coordinating Star Citizen guild missions
DEFAULT_USER_PROMPT=Be formal and strategic in responses
```

## Configuration Files

### .env.local (Development)
Create this file in the project root for local development:
```bash
# Development configuration
DB_USER=postgres
DB_PASS=dev_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sphereconnect_dev

JWT_SECRET_KEY=dev-secret-key-change-in-production
SECRET_KEY=dev-flask-secret

# Development features
DEBUG=True
LOG_LEVEL=DEBUG
```

### .env (Production)
For production deployment:
```bash
# Production database
DB_USER=sphereconnect_prod
DB_PASS=strong_production_password
DB_HOST=prod-db-server.internal
DB_PORT=5432
DB_NAME=sphereconnect

# Strong production secrets (generate randomly)
JWT_SECRET_KEY=256-bit-production-secret-here
SECRET_KEY=production-flask-secret-here

# Production settings
DEBUG=False
LOG_LEVEL=WARNING

# Email for notifications
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=secure-app-password
```

## Guild-Specific Configuration

### Creating a New Guild
```python
from app.core.models import Guild, AICommander
from app.utils.db_utils import get_db_session

# Create guild
guild = Guild(
    name="My Star Citizen Fleet",
    description="Elite squadron for deep space operations"
)

# Create AI commander for the guild
commander = AICommander(
    guild_id=guild.id,
    name="Fleet Admiral",
    system_prompt="You are the Fleet Admiral commanding operations",
    user_prompt="Be decisive and tactical"
)
```

### Guild Settings
Each guild can have custom:
- AI Commander personality
- Rank hierarchies
- Access level definitions
- Notification preferences
- Time zone settings

## Wingman-AI Integration

### Skill Configuration
Update `wingman-ai/configs/_SphereConnect/UEE Commander.yaml`:
```yaml
name: "UEE Commander"
description: "SphereConnect coordination assistant"
api_endpoint: "http://localhost:8000"
voice_settings:
  tts_provider: "elevenlabs"
  stt_provider: "whisper"
  voice: "male_commander"
```

### Voice Command Customization
Modify intent patterns in `app/api/src/wingman_skill_poc.py`:
```python
intent_patterns = {
    'create_objective': r'create objective: (.+)',
    'assign_task': r'assign task (.+) to (.+)',
    # Add custom patterns
    'custom_command': r'your custom pattern here'
}
```

## Database Configuration

### Connection Pooling
```python
# In app/core/models.py
from sqlalchemy import create_engine

engine = create_engine(
    DATABASE_URL,
    pool_size=10,          # Connection pool size
    max_overflow=20,       # Max overflow connections
    pool_timeout=30,       # Connection timeout
    pool_recycle=3600      # Recycle connections hourly
)
```

### Schema Initialization
```bash
# Initialize database schema
python scripts/db_init.py

# Populate with sample data
python scripts/test_data.py
```

## Frontend Configuration

### API Endpoint Configuration
Update `frontend/src/config/api.js`:
```javascript
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};
```

### Environment Variables for Frontend
Create `frontend/.env.local`:
```bash
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
REACT_APP_VERSION=1.0.0
```

## Deployment Configurations

### Docker Configuration
`docker-compose.yml`:
```yaml
version: '3.8'
services:
  sphereconnect:
    build: .
    environment:
      - DB_HOST=db
      - DB_USER=sphereconnect
      - DB_PASS=secure_password
    ports:
      - "8000:8000"
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=sphereconnect
      - POSTGRES_USER=sphereconnect
      - POSTGRES_PASSWORD=secure_password
```

### Nginx Configuration
For production web server:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring and Logging

### Log Configuration
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/sphereconnect.log'),
        logging.StreamHandler()
    ]
)
```

### Health Check Endpoints
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": check_db_connection(),
        "version": "1.0.0"
    }
```

## Security Best Practices

### Secret Management
- Never commit secrets to version control
- Use environment variables for all sensitive data
- Rotate secrets regularly
- Use different secrets for different environments

### Network Security
- Use HTTPS in production
- Implement proper CORS settings
- Rate limit all public endpoints
- Use firewalls and security groups

### Data Protection
- Encrypt sensitive data at rest
- Use prepared statements to prevent SQL injection
- Implement proper input validation
- Regular security audits

## Troubleshooting Configuration Issues

### Database Connection Problems
```bash
# Test connection
python -c "import psycopg2; psycopg2.connect(DATABASE_URL)"

# Check environment variables
echo $DATABASE_URL
```

### JWT Token Issues
- Verify `JWT_SECRET_KEY` is set
- Check token expiration settings
- Ensure clock synchronization between services

### CORS Errors
```javascript
// Frontend CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
};
```

## Next Steps

After configuration:
- [Deploy your instance](deployment.md)
- [Set up monitoring](deployment.md#monitoring)
- [Configure backups](deployment.md#backup)