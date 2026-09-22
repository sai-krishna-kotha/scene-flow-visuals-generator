import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import uuid
from datetime import datetime, timedelta

from app.main import app as fastapi_app
from app.db.session import get_db
from app.db.base import Base
from app.core.security import verify_password
from app.models.user import User
from app.models.refresh_token import RefreshToken

# Use an in-memory SQLite DB for tests
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session(setup_db):
    db = TestingSessionLocal()
    yield db
    db.close()

@pytest.fixture
def client():
    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()

    fastapi_app.dependency_overrides.clear()
    fastapi_app.dependency_overrides[get_db] = override_get_db
    # NO overrides for get_current_user! We want to test real auth.
    
    with TestClient(fastapi_app) as c:
        yield c

    fastapi_app.dependency_overrides.clear()

def test_auth_register_and_login(client, db_session):
    email = "realuser@example.com"
    password = "securepassword"
    
    # 1. Register
    reg_response = client.post("/auth/register", json={"email": email, "password": password})
    assert reg_response.status_code == 201
    
    # Verify in DB
    user = db_session.query(User).filter(User.email == email).first()
    assert user is not None
    assert verify_password(password, user.hashed_password)
    
    # 2. Login
    login_response = client.post("/auth/login", json={"email": email, "password": password})
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert "access_token" in login_data
    assert login_data["user"]["email"] == email
    
    # Verify cookie
    cookies = login_response.cookies
    assert "refresh_token" in cookies
    
    # 3. /me (with access token)
    access_token = login_data["access_token"]
    me_response = client.get("/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me_response.status_code == 200
    assert me_response.json()["email"] == email

def test_auth_refresh_rotation_and_logout(client, db_session):
    email = "refresh@example.com"
    password = "securepassword"
    
    client.post("/auth/register", json={"email": email, "password": password})
    login_response = client.post("/auth/login", json={"email": email, "password": password})
    
    original_refresh_cookie = login_response.cookies.get("refresh_token")
    assert original_refresh_cookie
    
    # Raw token not in DB (only hashed version is stored)
    user = db_session.query(User).filter(User.email == email).first()
    db_tokens = db_session.query(RefreshToken).filter(RefreshToken.user_id == user.id).all()
    assert len(db_tokens) == 2  # one from register, one from login
    assert db_tokens[0].token_hash != original_refresh_cookie  # Must be hashed/different
    
    # 1. Refresh
    refresh_response = client.post("/auth/refresh", cookies={"refresh_token": original_refresh_cookie})
    assert refresh_response.status_code == 200
    new_access_token = refresh_response.json()["access_token"]
    new_refresh_cookie = refresh_response.cookies.get("refresh_token")
    
    assert new_refresh_cookie != original_refresh_cookie
    
    # 2. Reuse old refresh token (should fail or revoke, for now just fail)
    reuse_response = client.post("/auth/refresh", cookies={"refresh_token": original_refresh_cookie})
    assert reuse_response.status_code == 401
    
    # 3. Logout
    logout_response = client.post("/auth/logout", cookies={"refresh_token": new_refresh_cookie})
    assert logout_response.status_code == 200
    
    # Verify session is dead
    refresh_after_logout = client.post("/auth/refresh", cookies={"refresh_token": new_refresh_cookie})
    assert refresh_after_logout.status_code == 401
    
def test_inactive_user_login(client, db_session):
    email = "inactive@example.com"
    password = "securepassword"
    
    client.post("/auth/register", json={"email": email, "password": password})
    
    # Make user inactive
    user = db_session.query(User).filter(User.email == email).first()
    user.is_active = False
    db_session.commit()
    
    login_response = client.post("/auth/login", json={"email": email, "password": password})
    assert login_response.status_code == 403
    assert "Account is inactive" in login_response.json()["detail"]
