import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app as fastapi_app
from app.db.session import get_db
from app.db.base import Base

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
def client():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    fastapi_app.dependency_overrides[get_db] = override_get_db
    # NO overrides for get_current_user!
    
    with TestClient(fastapi_app) as c:
        yield c

    fastapi_app.dependency_overrides.pop(get_db, None)

def test_user_isolation(client, setup_db):
    # Setup User A
    client.post("/auth/register", json={"email": "a@example.com", "password": "securepassword"})
    res_a = client.post("/auth/login", json={"email": "a@example.com", "password": "securepassword"})
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    
    # Setup User B
    client.post("/auth/register", json={"email": "b@example.com", "password": "securepassword"})
    res_b = client.post("/auth/login", json={"email": "b@example.com", "password": "securepassword"})
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    # 1. User A creates a Project
    p_res = client.post("/projects", json={"name": "Project A"}, headers=headers_a)
    assert p_res.status_code == 201
    project_id = p_res.json()["id"]
    
    # 2. User B tries to GET User A's project
    b_get_p = client.get(f"/projects/{project_id}", headers=headers_b)
    assert b_get_p.status_code == 404 # Isolated
    
    # User B tries to DELETE User A's project
    b_del_p = client.delete(f"/projects/{project_id}", headers=headers_b)
    assert b_del_p.status_code == 404
    
    # 3. User A creates a Script in Project A
    s_res = client.post(f"/projects/{project_id}/scripts", json={"title": "Script A", "full_text": "hello"}, headers=headers_a)
    script_id = s_res.json()["id"]
    
    # User B tries to GET Script A
    b_get_s = client.get(f"/scripts/{script_id}", headers=headers_b)
    assert b_get_s.status_code == 404
    
    # 4. User A creates a Scene in Script A
    sc_res = client.post(f"/scripts/{script_id}/scenes", json={"order": 1, "title": "Sc 1", "sentence_text": "text"}, headers=headers_a)
    scene_id = sc_res.json()["id"]
    
    # User B tries to GET Scene A
    b_get_sc = client.get(f"/scenes/{scene_id}", headers=headers_b)
    assert b_get_sc.status_code == 404
    
    # User B tries to Analyze User A's Scene
    b_analyze_sc = client.post(f"/scenes/{scene_id}/analyze", headers=headers_b)
    assert b_analyze_sc.status_code == 404
