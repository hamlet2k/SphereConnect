# Copyright 2025 [Your Legal Name]. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import jwt
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os

# Import our models and routes
from .core.models import get_db, create_tables
from .api.routes import router

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SphereConnect API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the API routes
app.include_router(router, prefix="/api", tags=["sphereconnect"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
SECRET_KEY = "your-secret-key"  # Use env var later

# Create all database tables
create_tables()

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

def create_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(hours=24)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")

def send_email(to_email: str, token: str):
    try:
        from email.mime.text import MIMEText
        from smtplib import SMTP
        msg = MIMEText(f"Your token: {token}\nhttp://localhost:3000")  # Updated URL
        msg["Subject"] = "SphereConnect Registration"
        msg["From"] = os.getenv("EMAIL_USER")
        msg["To"] = to_email
        with SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(os.getenv("EMAIL_USER"), os.getenv("EMAIL_PASS"))
            server.send_message(msg)
        logger.info(f"Email sent to {to_email}")
    except Exception as e:
        logger.error(f"Email failed: {e}")

@app.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    from .core.models import User
    try:
        existing_user = db.query(User).filter(User.username == request.username).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        db_user = User(username=request.username, email=request.email, password=request.password)
        db.add(db_user)
        db.commit()
        token = create_token({"sub": request.username})
        send_email(request.email, token)
        return {"message": "Registered, check email"}
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")

@app.post("/token")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    from .core.models import User
    user = db.query(User).filter(User.username == request.username).first()
    if user and user.password == request.password:
        token = create_token({"sub": request.username})
        return {"access_token": token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Invalid credentials")
