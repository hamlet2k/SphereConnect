# Installation Guide

This guide covers the installation and initial setup of SphereConnect for development and production environments.

## System Requirements

### Minimum Requirements
- **Operating System**: Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **Python**: 3.9 or higher
- **Memory**: 4GB RAM
- **Storage**: 2GB free space
- **Database**: PostgreSQL 12+

### Recommended Requirements
- **Operating System**: Windows 11, macOS 12+, Ubuntu 20.04+
- **Python**: 3.11 or higher
- **Memory**: 8GB RAM
- **Storage**: 5GB free space
- **Database**: PostgreSQL 15+

## Backend Installation

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/sphereconnect.git
cd sphereconnect
```

### 2. Create Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Database Setup
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Install PostgreSQL (macOS with Homebrew)
brew install postgresql
brew services start postgresql

# Install PostgreSQL (Windows)
# Download from https://www.postgresql.org/download/windows/
```

### 5. Create Database
```bash
# Create database
createdb sphereconnect

# Or using psql
psql -U postgres -c "CREATE DATABASE sphereconnect;"
```

### 6. Environment Configuration
Create `.env.local` file:
```bash
# Database Configuration
DB_USER=postgres
DB_PASS=your_password_here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sphereconnect

# JWT Configuration
JWT_SECRET_KEY=your-production-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email Configuration (optional)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Other settings
SECRET_KEY=your-secret-key-here
```

### 7. Initialize Database
```bash
# Run database initialization script
python scripts/db_init.py

# Create test data (optional)
python scripts/test_data.py
```

## Frontend Installation

### 1. Navigate to Frontend Directory
```bash
cd frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm start
```

The frontend will be available at `http://localhost:3000`.

## Wingman-AI Setup

### 1. Install Wingman-AI
Download and install Wingman-AI from the official repository.

### 2. Configure Custom Skill
- Copy the skill files from `wingman-ai/skills/sphereconnect/` to your Wingman-AI skills directory
- Update skill configuration with your API endpoints

### 3. Test Voice Integration
```bash
python scripts/test_standalone.py
```

## Production Deployment

### Using Docker (Recommended)
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Production Setup
```bash
# Install production WSGI server
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app.main:app

# Or use the start script
python scripts/start_server.py
```

## Verification

### Backend Tests
```bash
# Run all tests
python -m pytest tests/

# Run specific test
python -m pytest tests/test_auth.py -v
```

### API Health Check
```bash
curl http://localhost:8000/health
```

### Database Connection
```bash
python -c "from app.core.models import engine; print('Database connected successfully')"
```

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Verify PostgreSQL is running
- Check credentials in `.env.local`
- Ensure database exists

**Import Errors**
- Activate virtual environment
- Reinstall dependencies: `pip install -r requirements.txt`

**Port Already in Use**
- Change port in configuration
- Kill existing processes: `lsof -ti:8000 | xargs kill`

**Wingman-AI Not Responding**
- Check skill configuration
- Verify API endpoints are accessible
- Review Wingman-AI logs

## Next Steps

After successful installation:
1. [Configure your environment](configuration.md)
2. [Read the user manual](../user-manual/getting-started.md)
3. [Explore API documentation](../api-reference/)