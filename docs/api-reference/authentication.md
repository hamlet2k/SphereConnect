# SphereConnect Authentication System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [API Endpoints](#api-endpoints)
4. [Security Features](#security-features)
5. [Database Schema](#database-schema)
6. [Implementation Details](#implementation-details)
7. [Testing](#testing)
8. [Deployment](#deployment)

## Overview

The SphereConnect authentication system provides enterprise-grade security with seamless integration between web-based login and voice PIN verification. The system supports multi-factor authentication (MFA), session management, rate limiting, and comprehensive security monitoring.

### Key Features
- **Dual Authentication**: Web login + Voice PIN verification
- **Multi-Factor Authentication**: TOTP-based 2FA
- **Session Management**: JWT tokens with refresh mechanism
- **Security Protections**: Rate limiting, failed attempt tracking, account lockout
- **Guild-Based Access**: Multitenant architecture with data isolation
- **Role-Based Permissions**: Admin access for AI Commander management

## Authentication Flow

### 1. User Registration Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant D as Database

    U->>F: Submit registration form
    F->>A: POST /auth/register
    A->>A: Validate input data
    A->>D: Check existing user
    D-->>A: User availability
    A->>A: Hash password & PIN
    A->>D: Create user record
    D-->>A: User created
    A-->>F: Registration success
    F-->>U: Success message
```

### 2. Login Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant D as Database

    U->>F: Enter credentials
    F->>A: POST /auth/login
    A->>A: Check rate limiting
    A->>D: Find user by name + guild
    D-->>A: User data
    A->>A: Check account lockout
    A->>A: Verify password
    A->>A: Reset failed attempts
    A->>A: Create JWT token
    A->>D: Store session record
    A-->>F: JWT token + user info
    F-->>U: Login success
```

### 3. Voice PIN Verification Flow

```mermaid
sequenceDiagram
    participant U as User
    participant W as Wingman-AI
    participant A as API
    participant D as Database

    U->>W: "UEE Commander, authenticate with PIN 123456"
    W->>W: Parse voice command
    W->>A: Extract PIN + user context
    A->>D: Verify PIN hash
    D-->>A: PIN validation result
    A-->>W: Success/Failure response
    W-->>U: Voice confirmation
```

### 4. MFA Setup & Verification Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant D as Database

    U->>F: Request MFA setup
    F->>A: POST /auth/mfa/setup (JWT required)
    A->>A: Generate TOTP secret
    A->>D: Store secret in user record
    A-->>F: QR code provisioning URI
    F-->>U: Display QR code
    U->>U: Scan with authenticator app
    U->>F: Enter TOTP code
    F->>A: POST /auth/mfa/verify
    A->>A: Validate TOTP code
    A-->>F: MFA verification result
```

## API Endpoints

### Authentication Endpoints

#### `POST /auth/register`
Register a new user account.

**Request Body:**
```json
{
  "name": "johndoe",
  "password": "securepassword123",
  "pin": "123456",
  "guild_id": "550e8400-e29b-41d4-a716-446655440000",
  "phonetic": "john doe"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "tts_response": "User john doe registered successfully"
}
```

**Rate Limit:** 3 requests per minute

#### `POST /auth/login`
Authenticate user and return JWT token.

**Request Body:**
```json
{
  "name": "johndoe",
  "password": "securepassword123",
  "guild_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "johndoe",
    "guild_id": "550e8400-e29b-41d4-a716-446655440000",
    "rank": "550e8400-e29b-41d4-a716-446655440002"
  },
  "requires_mfa": false
}
```

**Rate Limit:** 5 requests per minute

#### `POST /auth/verify-pin`
Verify user's PIN for voice authentication.

**Request Body:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "pin": "123456"
}
```

**Response (200):**
```json
{
  "message": "PIN verified successfully",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "tts_response": "Authentication confirmed"
}
```

#### `POST /auth/refresh`
Refresh access token using existing token.

**Request Body:**
```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Response (200):** Same as login response

#### `POST /auth/mfa/setup`
Setup TOTP MFA for user account.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Response (200):**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "provisioning_uri": "otpauth://totp/SphereConnect:john@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SphereConnect",
  "message": "MFA setup initiated. Scan QR code with authenticator app."
}
```

#### `POST /auth/mfa/verify`
Verify TOTP code for MFA.

**Request Body:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "totp_code": "123456"
}
```

**Response (200):**
```json
{
  "message": "MFA verification successful",
  "user_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

### Protected Endpoints

All API endpoints except authentication routes require JWT token:

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Example:**
```bash
curl -X GET "http://localhost:8000/api/objectives" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
```

## Security Features

### JWT Token Security
- **Algorithm:** HS256
- **Expiration:** 30 minutes
- **Refresh Mechanism:** Token refresh endpoint
- **Payload:** Contains user ID and guild ID
- **Validation:** Automatic verification on protected routes

### Password Security
- **Hashing:** bcrypt with salt
- **Storage:** Hashed passwords only
- **Verification:** Secure comparison without timing attacks

### PIN Security
- **Separate from Password:** Independent authentication factor
- **Hashing:** bcrypt with unique salt
- **Length:** 6-digit numeric
- **Voice Integration:** Seamless with Wingman-AI

### Multi-Factor Authentication (MFA)
- **Standard:** TOTP (RFC 6238)
- **Apps:** Compatible with Google Authenticator, Authy, etc.
- **QR Codes:** Automatic provisioning URI generation
- **Backup:** Optional backup codes (not implemented)

### Session Management
- **Tracking:** All active sessions stored in database
- **Limits:** Maximum concurrent sessions per user
- **Cleanup:** Automatic expiration of old sessions
- **Audit:** IP address and user agent logging

### Rate Limiting
- **Login Attempts:** 5 per minute per IP
- **Registration:** 3 per minute per IP
- **Global Protection:** Prevents brute force attacks
- **Headers:** Rate limit status in response headers

### Failed Attempt Protection
- **Tracking:** Increment counter on failed login
- **Lockout:** Account locked for 15 minutes after 5 failures
- **Reset:** Counter reset on successful login
- **Permanent:** Escalation to admin review after repeated violations

### Account Lockout
- **Temporary:** 15-minute lockout after 5 failed attempts
- **Detection:** Automatic unlock after timeout
- **Notification:** Clear error messages to user
- **Logging:** Security events recorded for monitoring

## Database Schema

### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    guild_id UUID NOT NULL,
    name TEXT NOT NULL,
    phonetic TEXT,
    availability TEXT DEFAULT 'offline',
    rank UUID,
    preferences TEXT[] DEFAULT '{}',
    password TEXT,
    pin TEXT,
    squad_id UUID,
    -- Security fields
    last_login TIMESTAMP,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    totp_secret VARCHAR(32),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    -- Foreign keys
    FOREIGN KEY (guild_id) REFERENCES guilds(id),
    FOREIGN KEY (rank) REFERENCES ranks(id),
    FOREIGN KEY (squad_id) REFERENCES squads(id)
);
```

**Field Descriptions:**
- `id`: Unique user identifier (UUID)
- `guild_id`: Associated guild (multitenant isolation)
- `name`: Display name for login
- `phonetic`: Voice recognition name
- `availability`: Online/offline status
- `rank`: User role/rank reference
- `preferences`: User preference settings
- `password`: bcrypt-hashed password
- `pin`: bcrypt-hashed 6-digit PIN
- `squad_id`: Associated squad
- `last_login`: Timestamp of last successful login
- `failed_attempts`: Counter for failed login attempts
- `locked_until`: Account lockout expiration
- `totp_secret`: TOTP secret for MFA
- `created_at/updated_at`: Audit timestamps

### User Sessions Table

```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Performance indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
```

**Field Descriptions:**
- `id`: Unique session identifier
- `user_id`: Associated user
- `token_hash`: SHA256 hash of session token
- `expires_at`: Session expiration timestamp
- `created_at`: Session creation timestamp
- `ip_address`: Client IP address (IPv4/IPv6)
- `user_agent`: Client browser/device info

## Implementation Details

### Dependencies

```txt
# Core authentication
fastapi==0.104.1
uvicorn==0.24.0
python-jose[cryptography]==3.3.0
bcrypt==4.1.2

# Multi-factor authentication
pyotp==2.9.0

# Rate limiting
slowapi==0.1.9

# Database
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
```

### Configuration

```python
# JWT Configuration
SECRET_KEY = "your-production-secret-key-here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Rate Limiting
LOGIN_RATE_LIMIT = "5/minute"
REGISTER_RATE_LIMIT = "3/minute"

# Security Settings
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15
MAX_CONCURRENT_SESSIONS = 3
```

### Helper Functions

#### Password Hashing
```python
import bcrypt

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
```

#### JWT Token Management
```python
from datetime import datetime, timedelta
import jwt

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
    except jwt.JWTError:
        return None
```

#### TOTP MFA
```python
import pyotp

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
```

### Middleware Setup

#### Rate Limiting Middleware
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
```

#### Authentication Middleware
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
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
```

## Testing

### Test Script Usage

```bash
# Run authentication tests
python scripts/test_auth.py
```

### Test Coverage

#### Unit Tests
- Password hashing/verification
- JWT token creation/validation
- TOTP code generation/verification
- Rate limiting functionality

#### Integration Tests
- User registration flow
- Login with various scenarios
- MFA setup and verification
- Session management
- Failed attempt handling

#### API Tests
- All authentication endpoints
- Protected resource access
- Error handling scenarios
- Rate limiting validation

### Manual Testing Checklist

#### Registration
- [ ] Valid user registration
- [ ] Duplicate user prevention
- [ ] Password strength validation
- [ ] PIN format validation

#### Authentication
- [ ] Successful login
- [ ] Invalid credentials handling
- [ ] Account lockout testing
- [ ] Rate limiting verification

#### MFA
- [ ] TOTP setup process
- [ ] QR code generation
- [ ] Code verification
- [ ] Invalid code handling

#### Session Management
- [ ] Token refresh functionality
- [ ] Session expiration
- [ ] Concurrent session limits
- [ ] Logout functionality

## Deployment

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET_KEY=your-production-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database
DATABASE_URL=postgresql://user:password@localhost/sphereconnect

# Security Settings
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
MAX_CONCURRENT_SESSIONS=3

# Rate Limiting
LOGIN_RATE_LIMIT=5/minute
REGISTER_RATE_LIMIT=3/minute
```

### Production Checklist

#### Security
- [ ] Strong JWT secret key configured
- [ ] HTTPS enabled
- [ ] Database credentials secured
- [ ] CORS properly configured
- [ ] Security headers implemented

#### Monitoring
- [ ] Failed login attempt logging
- [ ] Rate limiting metrics
- [ ] Session tracking
- [ ] Performance monitoring

#### Backup & Recovery
- [ ] Database backup strategy
- [ ] Session cleanup procedures
- [ ] User data export capabilities
- [ ] MFA recovery options

### Scaling Considerations

#### Database
- Connection pooling
- Read replicas for session queries
- Index optimization
- Query performance monitoring

#### Session Management
- Redis for session storage (future enhancement)
- Session cleanup jobs
- Distributed session handling

#### Rate Limiting
- Redis backend for distributed rate limiting
- IP-based vs user-based limits
- Dynamic rate limit adjustment

This comprehensive authentication system provides enterprise-grade security while maintaining seamless integration with the voice-driven Wingman-AI interface. The modular design allows for easy extension and customization based on specific security requirements.