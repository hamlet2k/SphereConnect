# Deployment Guide

This guide covers deploying SphereConnect to production environments with best practices for security, scalability, and monitoring.

## Deployment Options

### 1. Docker Deployment (Recommended)

#### Docker Compose Setup
Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  sphereconnect:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DB_HOST=db
      - DB_USER=sphereconnect
      - DB_PASS=${DB_PASS}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=sphereconnect
      - POSTGRES_USER=sphereconnect
      - POSTGRES_PASSWORD=${DB_PASS}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - sphereconnect
    restart: unless-stopped

volumes:
  postgres_data:
```

#### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

EXPOSE 8000

CMD ["python", "scripts/start_server.py"]
```

#### Build and Deploy
```bash
# Build and start services
docker-compose up -d --build

# View logs
docker-compose logs -f sphereconnect

# Scale services
docker-compose up -d --scale sphereconnect=3
```

### 2. Cloud Deployment

#### AWS Deployment
```bash
# Using AWS Elastic Beanstalk
eb init sphereconnect
eb create production-env

# Or using ECS
aws ecs create-cluster --cluster-name sphereconnect
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

#### Heroku Deployment
```bash
# Create Heroku app
heroku create sphereconnect-prod

# Set environment variables
heroku config:set DB_URL=postgresql://...
heroku config:set JWT_SECRET_KEY=...

# Deploy
git push heroku main
```

### 3. Manual Server Deployment

#### System Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python and pip
sudo apt install python3 python3-pip python3-venv -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

#### Application Setup
```bash
# Create application user
sudo useradd --system --shell /bin/bash --home /opt/sphereconnect sphereconnect

# Create directories
sudo mkdir -p /opt/sphereconnect
sudo chown sphereconnect:sphereconnect /opt/sphereconnect

# Clone repository
sudo -u sphereconnect git clone https://github.com/your-org/sphereconnect.git /opt/sphereconnect

# Setup virtual environment
sudo -u sphereconnect python3 -m venv /opt/sphereconnect/venv
sudo -u sphereconnect /opt/sphereconnect/venv/bin/pip install -r /opt/sphereconnect/requirements.txt
```

#### Database Setup
```bash
# Create database user
sudo -u postgres createuser --createdb --login sphereconnect

# Set password
sudo -u postgres psql -c "ALTER USER sphereconnect PASSWORD 'secure_password';"

# Create database
sudo -u postgres createdb -O sphereconnect sphereconnect
```

#### Systemd Service
Create `/etc/systemd/system/sphereconnect.service`:
```ini
[Unit]
Description=SphereConnect Application
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=sphereconnect
WorkingDirectory=/opt/sphereconnect
Environment=PATH=/opt/sphereconnect/venv/bin
ExecStart=/opt/sphereconnect/venv/bin/python scripts/start_server.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### Nginx Configuration
Create `/etc/nginx/sites-available/sphereconnect`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location = /favicon.ico { access_log off; log_not_found off; }

    location / {
        include proxy_params;
        proxy_pass http://unix:/opt/sphereconnect/sphereconnect.sock;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static {
        alias /opt/sphereconnect/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### SSL Configuration
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Environment Configuration

### Production Environment Variables
Create `/opt/sphereconnect/.env`:
```bash
# Database
DB_USER=sphereconnect
DB_PASS=secure_production_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sphereconnect

# Security
JWT_SECRET_KEY=256-bit-production-secret-here
SECRET_KEY=production-flask-secret-here

# Application
DEBUG=False
LOG_LEVEL=WARNING
ENVIRONMENT=production

# Email
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=secure-app-password
```

## Security Hardening

### Firewall Configuration
```bash
# UFW setup
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Or iptables
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -P INPUT DROP
```

### SSL/TLS Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
}
```

### Database Security
```sql
-- Create limited user for application
CREATE USER sphereconnect_app WITH PASSWORD 'app_password';
GRANT CONNECT ON DATABASE sphereconnect TO sphereconnect_app;
GRANT USAGE ON SCHEMA public TO sphereconnect_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sphereconnect_app;

-- Row Level Security (if using PostgreSQL 9.5+)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON users USING (guild_id = current_setting('app.guild_id')::uuid);
```

## Monitoring and Logging

### Application Logging
```python
import logging
from logging.handlers import RotatingFileHandler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler(
            '/var/log/sphereconnect/app.log',
            maxBytes=10485760,  # 10MB
            backupCount=5
        ),
        logging.StreamHandler()
    ]
)
```

### System Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop sysstat -y

# Log rotation
sudo cat > /etc/logrotate.d/sphereconnect << EOF
/var/log/sphereconnect/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 sphereconnect sphereconnect
    postrotate
        systemctl reload sphereconnect
    endscript
}
EOF
```

### Health Checks
```python
@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint"""
    health_status = {
        "status": "healthy",
        "checks": {
            "database": await check_database(),
            "redis": await check_redis(),  # if used
            "external_services": await check_external_apis()
        },
        "version": get_version(),
        "timestamp": datetime.utcnow().isoformat()
    }

    # Return unhealthy if any check fails
    if any(not check["healthy"] for check in health_status["checks"].values()):
        health_status["status"] = "unhealthy"
        raise HTTPException(status_code=503, detail=health_status)

    return health_status
```

## Backup Strategy

### Database Backup
```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/opt/sphereconnect/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
pg_dump -U sphereconnect -h localhost sphereconnect > "$BACKUP_DIR/sphereconnect_$DATE.sql"

# Compress
gzip "$BACKUP_DIR/sphereconnect_$DATE.sql"

# Keep only last 7 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
```

### Application Backup
```bash
# Backup configuration and data
tar -czf "/opt/sphereconnect/backups/app_$DATE.tar.gz" \
    /opt/sphereconnect/.env \
    /opt/sphereconnect/uploads/ \
    /opt/sphereconnect/logs/
```

### Automated Backups
```bash
# Add to crontab
0 2 * * * /opt/sphereconnect/scripts/backup.sh
```

## Scaling Considerations

### Horizontal Scaling
```bash
# Load balancer configuration (nginx)
upstream sphereconnect_backend {
    server 127.0.0.1:8000;
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
}

server {
    listen 80;
    location / {
        proxy_pass http://sphereconnect_backend;
    }
}
```

### Database Scaling
- Use read replicas for read-heavy operations
- Implement connection pooling
- Consider database sharding for multi-tenant growth

### Caching Strategy
```python
from cachetools import TTLCache
from functools import lru_cache

# In-memory cache for frequently accessed data
guild_cache = TTLCache(maxsize=1000, ttl=300)  # 5 minutes

@lru_cache(maxsize=500)
def get_user_permissions(user_id: str, guild_id: str):
    """Cache user permissions to reduce database queries"""
    # Implementation
```

## Performance Optimization

### Database Optimization
```sql
-- Create indexes for common queries
CREATE INDEX idx_users_guild_id ON users(guild_id);
CREATE INDEX idx_objectives_guild_id ON objectives(guild_id);
CREATE INDEX idx_tasks_objective_id ON tasks(objective_id);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE guild_id = 'uuid-here';
```

### Application Optimization
```python
# Use async database operations
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

async_engine = create_async_engine(DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"))

async def get_user_async(user_id: str):
    async with AsyncSession(async_engine) as session:
        result = await session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
```

## Troubleshooting Production Issues

### Common Problems

**High Memory Usage**
```bash
# Check memory usage
htop
# Or
ps aux --sort=-%mem | head

# Restart service if needed
sudo systemctl restart sphereconnect
```

**Database Connection Pool Exhausted**
```bash
# Check active connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Increase pool size in configuration
pool_size=20
max_overflow=30
```

**Slow Response Times**
```bash
# Profile application
python -m cProfile -s time scripts/start_server.py

# Check database slow queries
# Enable in postgresql.conf: log_min_duration_statement = 1000
```

**SSL Certificate Issues**
```bash
# Check certificate validity
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -text -noout

# Renew certificate
sudo certbot renew
```

## Maintenance Procedures

### Regular Updates
```bash
# Update application
cd /opt/sphereconnect
git pull origin main
sudo systemctl restart sphereconnect

# Update system packages
sudo apt update && sudo apt upgrade -y
sudo reboot  # if kernel updated
```

### Log Analysis
```bash
# View recent logs
sudo journalctl -u sphereconnect -f

# Search for errors
sudo journalctl -u sphereconnect | grep ERROR

# Log analysis with goaccess (if using nginx)
goaccess /var/log/nginx/access.log
```

This deployment guide provides a production-ready setup with security, monitoring, and scalability considerations. Adjust configurations based on your specific infrastructure and requirements.