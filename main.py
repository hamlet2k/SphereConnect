from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import jwt
import logging
from datetime import datetime, timedelta
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Sphere-Connect API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
SECRET_KEY = "your-secret-key"  # Use env var later
ENGINE = create_engine("sqlite:///connectsphere.db")
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    email = Column(String)
    password = Column(String)  # Hash in production

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

Base.metadata.create_all(bind=ENGINE)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(hours=24)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")

def send_email(to_email: str, token: str):
    try:
        from email.mime.text import MIMEText
        from smtplib import SMTP
        msg = MIMEText(f"Your token: {token}\nhttp://sphere-connect.org")
        msg["Subject"] = "Sphere-Connect Registration"
        msg["From"] = os.getenv("EMAIL_USER")  # From .env
        msg["To"] = to_email
        with SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(os.getenv("EMAIL_USER"), os.getenv("EMAIL_PASS"))  # From .env
            server.send_message(msg)
        logger.info(f"Email sent to {to_email}")
    except Exception as e:
        logger.error(f"Email failed: {e}")

@app.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    try:
        db_user = User(username=request.username, email=request.email, password=request.password)
        db.add(db_user)
        db.commit()
        token = create_token({"sub": request.username})
        send_email(request.email, token)
        return {"message": "Registered, check email"}
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        raise HTTPException(status_code=500, detail="Registration error")

@app.post("/token")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if user and user.password == request.password:
        token = create_token({"sub": request.username})
        return {"access_token": token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Invalid credentials")