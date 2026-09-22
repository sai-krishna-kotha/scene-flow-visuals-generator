import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import uuid

from app.main import app as fastapi_app
from app.db.session import get_db
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.core.security import get_password_hash
from app.api.routes.auth import hash_refresh_token
from app.db.base import Base

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import app.models

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

fastapi_app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client():
    return TestClient(fastapi_app)

@pytest.fixture
def db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_refresh_success(client: TestClient, db: Session):
    email = f"test_refresh_{uuid.uuid4()}@example.com"
    password = "testpassword123"
    
    # 1. Register
    response = client.post("/auth/register", json={"email": email, "password": password})
    assert response.status_code == 201
    
    # Refresh token should be in cookies
    assert "refresh_token" in client.cookies
    original_refresh_token = client.cookies["refresh_token"]
    
    # Check that cookie path is /auth
    # The fix we made should make this test pass, since the client hits /auth/refresh
    
    # 2. Refresh
    refresh_response = client.post("/auth/refresh")
    assert refresh_response.status_code == 200
    data = refresh_response.json()
    assert "access_token" in data
    
    # Cookie should be updated
    assert client.cookies["refresh_token"] != original_refresh_token

def test_invalid_refresh_token(client: TestClient, db: Session):
    client.cookies.set("refresh_token", "invalid_token_value", path="/auth")
    response = client.post("/auth/refresh")
    assert response.status_code == 401
    assert "Invalid refresh token" in response.json()["detail"]

def test_expired_refresh_token(client: TestClient, db: Session):
    email = f"test_expired_{uuid.uuid4()}@example.com"
    user = User(
        email=email,
        hashed_password=get_password_hash("test"),
        role="user",
        is_active=True
    )
    db.add(user)
    db.commit()
    
    raw_token = "expired_token_test"
    db_token = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(raw_token),
        expires_at=datetime.now(timezone.utc) - timedelta(days=1)
    )
    db.add(db_token)
    db.commit()
    
    client.cookies.set("refresh_token", raw_token, path="/auth")
    response = client.post("/auth/refresh")
    assert response.status_code == 401
    assert "Refresh token expired or revoked" in response.json()["detail"]

def test_authorization_isolation_jobs(client: TestClient, db: Session):
    # User 1 creates a project, script, scene, and job
    from app.models.project import Project
    from app.models.script import Script
    from app.models.scene import Scene
    from app.models.search_job import SearchJob, JobStatus
    
    # Register user 1
    email1 = f"u1_{uuid.uuid4()}@example.com"
    resp1 = client.post("/auth/register", json={"email": email1, "password": "password123"})
    token1 = resp1.json()["access_token"]
    user1_id = resp1.json()["user"]["id"]
    
    # Register user 2
    email2 = f"u2_{uuid.uuid4()}@example.com"
    resp2 = client.post("/auth/register", json={"email": email2, "password": "password123"})
    token2 = resp2.json()["access_token"]
    user2_id = resp2.json()["user"]["id"]
    
    proj = Project(name="U1 Proj", user_id=uuid.UUID(user1_id))
    db.add(proj)
    db.commit()
    db.refresh(proj)
    
    script = Script(title="U1 Script", project_id=proj.id)
    db.add(script)
    db.commit()
    db.refresh(script)
    
    scene = Scene(script_id=script.id, sentence_text="Test", order=1, status="analyzed", analysis={"summary": "test"})
    db.add(scene)
    db.commit()
    db.refresh(scene)
    
    job = SearchJob(scene_id=scene.id, status=JobStatus.FAILED, error_message="Failed intentionally")
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # User 1 can access job
    resp = client.get(f"/jobs/{job.id}", headers={"Authorization": f"Bearer {token1}"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "FAILED"
    
    # User 2 gets 403
    resp2 = client.get(f"/jobs/{job.id}", headers={"Authorization": f"Bearer {token2}"})
    assert resp2.status_code == 403
    
    # User 2 gets 403 on scene jobs
    resp3 = client.get(f"/scenes/{scene.id}/jobs", headers={"Authorization": f"Bearer {token2}"})
    assert resp3.status_code == 403
