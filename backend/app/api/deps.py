from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uuid
from jose import JWTError
from sqlalchemy.orm import Session
from app.config import settings
from app.db.session import get_db
from app.models.user import User
from app.core.security import decode_access_token

security = HTTPBearer()

def get_current_user(
    db: Session = Depends(get_db),
    token: HTTPAuthorizationCredentials = Depends(security)
) -> uuid.UUID:
    """
    Validates the bearer token and returns the current user's ID.
    Raises 401 if invalid.
    """
    try:
        payload = decode_access_token(token.credentials)
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    # We do a quick DB check to ensure user actually exists and is active,
    # though for high scale one might rely purely on the JWT (if revokes are handled elsewhere).
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
        
    return user_id

def get_current_active_user(
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user)
) -> User:
    """
    Returns the full User model of the currently authenticated user.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def require_role(required_role: str):
    def role_checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role != required_role and current_user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
        return current_user
    return role_checker
