from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
import uuid
import secrets
import hashlib
from datetime import datetime, timezone, timedelta

from app.db.session import get_db
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.schemas.auth import UserCreate, UserLogin, UserResponse, TokenResponse
from app.core.security import verify_password, get_password_hash, create_access_token
from app.config import settings
from app.api.deps import get_current_active_user

router = APIRouter()

def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

def set_refresh_cookie(response: Response, token: str):
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/auth"
    )

def clear_refresh_cookie(response: Response):
    response.delete_cookie(
        key="refresh_token",
        path="/auth"
    )

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, response: Response, db: Session = Depends(get_db)):
    email_lower = user_in.email.lower()
    existing_user = db.query(User).filter(User.email == email_lower).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Invalid email or password")
        
    user = User(
        email=email_lower,
        hashed_password=get_password_hash(user_in.password),
        role="user",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Establish refresh session
    raw_refresh_token = secrets.token_urlsafe(32)
    refresh_hash = hash_refresh_token(raw_refresh_token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    db_token = RefreshToken(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=expires_at
    )
    db.add(db_token)
    db.commit()
    
    set_refresh_cookie(response, raw_refresh_token)
    
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=TokenResponse)
def login(user_in: UserLogin, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
        
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    raw_refresh_token = secrets.token_urlsafe(32)
    refresh_hash = hash_refresh_token(raw_refresh_token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    db_token = RefreshToken(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=expires_at
    )
    db.add(db_token)
    db.commit()
    
    set_refresh_cookie(response, raw_refresh_token)
    
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )

@router.post("/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token provided")
        
    token_hash = hash_refresh_token(token)
    
    db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    
    if not db_token:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    # Ensure tzinfo is set for SQLite naive datetimes before comparing
    expires_at_aware = db_token.expires_at
    if expires_at_aware.tzinfo is None:
        expires_at_aware = expires_at_aware.replace(tzinfo=timezone.utc)
        
    if db_token.revoked_at is not None or expires_at_aware < datetime.now(timezone.utc):
        # Already revoked or expired
        raise HTTPException(status_code=401, detail="Refresh token expired or revoked")
        
    user = db.query(User).filter(User.id == db_token.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=403, detail="User inactive or not found")
        
    # Rotate token
    db_token.revoked_at = datetime.now(timezone.utc)
    
    raw_refresh_token = secrets.token_urlsafe(32)
    new_refresh_hash = hash_refresh_token(raw_refresh_token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    new_db_token = RefreshToken(
        user_id=user.id,
        token_hash=new_refresh_hash,
        expires_at=expires_at,
        replaced_by_id=db_token.id
    )
    db.add(new_db_token)
    db.commit()
    
    set_refresh_cookie(response, raw_refresh_token)
    
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )

@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if token:
        token_hash = hash_refresh_token(token)
        db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
        if db_token and db_token.revoked_at is None:
            db_token.revoked_at = datetime.now(timezone.utc)
            db.commit()
            
    clear_refresh_cookie(response)
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_active_user)):
    return UserResponse.model_validate(current_user)
