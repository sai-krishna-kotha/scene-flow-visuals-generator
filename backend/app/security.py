from datetime import datetime, timedelta, timezone
import hashlib, secrets, uuid
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
def hash_password(password: str) -> str: return pwd_context.hash(password)
def verify_password(password: str, password_hash: str) -> bool: return pwd_context.verify(password, password_hash)
def create_access_token(user_id: uuid.UUID) -> str:
    now=datetime.now(timezone.utc)
    payload={"sub":str(user_id),"type":"access","iat":int(now.timestamp()),"exp":int((now+timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)).timestamp())}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
def create_refresh_token() -> tuple[str,str]:
    raw=secrets.token_urlsafe(48); return raw, hashlib.sha256(raw.encode()).hexdigest()
def hash_refresh_token(raw_token: str) -> str: return hashlib.sha256(raw_token.encode()).hexdigest()
def decode_access_token(token: str) -> uuid.UUID:
    try:
        payload=jwt.decode(token,settings.JWT_SECRET_KEY,algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type")!="access" or not payload.get("sub"): raise JWTError("Invalid token type")
        return uuid.UUID(payload["sub"])
    except (JWTError,ValueError) as exc: raise ValueError("Invalid or expired access token") from exc
