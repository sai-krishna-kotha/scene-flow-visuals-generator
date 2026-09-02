import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from uuid import uuid4

from app.main import app as fastapi_app
from app.db.session import get_db
from app.services.ai.gemini_service import GeminiSceneAnalyzer
from app.schemas.ai import SceneAnalysis

client = TestClient(fastapi_app)

# SQLite in-memory database is strictly used here for FAST, ISOLATED Unit/API tests.
# This validates HTTP parsing, Pydantic serialization, and FastAPI dependency wiring.
# It does NOT validate PostgreSQL-specific constraints like Enums or Indexes.
# See test_postgres_integration.py for actual PostgreSQL schema tests.
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.base import Base
import app.models  # noqa: F401 - ensure models are registered

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

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_project_crud():
    # Create Project
    response = client.post("/api/v1/projects/", json={"name": "Test Project", "description": "Desc"})
    assert response.status_code == 201
    project_id = response.json()["id"]

    # Get Project
    response = client.get(f"/api/v1/projects/{project_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Test Project"

    # Update Project
    response = client.patch(f"/api/v1/projects/{project_id}", json={"name": "Updated Project"})
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Project"

    # List Projects
    response = client.get("/api/v1/projects/")
    assert response.status_code == 200
    assert len(response.json()) == 1

def test_script_crud():
    # Setup Project
    proj_res = client.post("/api/v1/projects/", json={"name": "P1"})
    project_id = proj_res.json()["id"]

    # Create Script
    response = client.post(
        f"/api/v1/projects/{project_id}/scripts", 
        json={"title": "Script 1", "full_text": "Hello world", "orientation_preference": "landscape"}
    )
    assert response.status_code == 201
    script_id = response.json()["id"]

    # Get Script
    response = client.get(f"/api/v1/scripts/{script_id}")
    assert response.status_code == 200
    assert response.json()["title"] == "Script 1"
    
    # Update Script
    response = client.patch(f"/api/v1/scripts/{script_id}", json={"title": "Updated Script"})
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Script"

    # Delete Script
    response = client.delete(f"/api/v1/scripts/{script_id}")
    assert response.status_code == 204

    # Verify Delete
    response = client.get(f"/api/v1/scripts/{script_id}")
    assert response.status_code == 404

def test_scene_crud():
    proj_res = client.post("/api/v1/projects/", json={"name": "P1"})
    project_id = proj_res.json()["id"]
    script_res = client.post(f"/api/v1/projects/{project_id}/scripts", json={"title": "S1", "full_text": "T"})
    script_id = script_res.json()["id"]

    # Create Scene
    response = client.post(f"/api/v1/scripts/{script_id}/scenes", json={"sentence_text": "A boy walks.", "order": 1})
    assert response.status_code == 201
    scene_id = response.json()["id"]

    # List Scenes
    response = client.get(f"/api/v1/scripts/{script_id}/scenes")
    assert response.status_code == 200
    assert len(response.json()) == 1

def test_gemini_analysis_endpoint():
    # Setup DB state
    proj_res = client.post("/api/v1/projects/", json={"name": "P1"})
    project_id = proj_res.json()["id"]
    script_res = client.post(f"/api/v1/projects/{project_id}/scripts", json={"title": "S1", "full_text": "T"})
    script_id = script_res.json()["id"]
    scene_res = client.post(f"/api/v1/scripts/{script_id}/scenes", json={"sentence_text": "A boy walks.", "order": 1})
    scene_id = scene_res.json()["id"]

    # Mock the Gemini service
    mock_analyzer = MagicMock()
    mock_analysis = SceneAnalysis(
        summary="A summary",
        subjects=["boy"],
        actions=["walks"],
        environment=["outside"],
        mood="neutral",
        time_context="day",
        visual_queries=["boy walking"]
    )
    mock_analyzer.analyze_scene.return_value = mock_analysis

    from app.api.routes.ai import get_gemini_service
    fastapi_app.dependency_overrides[get_gemini_service] = lambda: mock_analyzer

    response = client.post(f"/api/v1/scenes/{scene_id}/analyze")
    
    assert response.status_code == 200
    data = response.json()
    assert data["scene_id"] == scene_id
    assert data["analysis"]["subjects"] == ["boy"]
    
    # Verify persistence
    get_response = client.get(f"/api/v1/scenes/{scene_id}")
    assert get_response.status_code == 200
    scene_data = get_response.json()
    assert scene_data["status"] == "analyzed"
    assert scene_data["analysis"]["subjects"] == ["boy"]
    assert scene_data["analyzed_at"] is not None

def test_gemini_reanalyze_failure_preserves_analysis():
    # Setup DB state
    proj_res = client.post("/api/v1/projects/", json={"name": "P1"})
    project_id = proj_res.json()["id"]
    script_res = client.post(f"/api/v1/projects/{project_id}/scripts", json={"title": "S1", "full_text": "T"})
    script_id = script_res.json()["id"]
    scene_res = client.post(f"/api/v1/scripts/{script_id}/scenes", json={"sentence_text": "A boy walks.", "order": 1})
    scene_id = scene_res.json()["id"]

    # Mock the Gemini service (success)
    mock_analyzer = MagicMock()
    mock_analysis = SceneAnalysis(
        summary="A summary", subjects=["boy"], actions=["walks"],
        environment=["outside"], mood="neutral", time_context="day",
        visual_queries=["boy walking"]
    )
    mock_analyzer.analyze_scene.return_value = mock_analysis

    from app.api.routes.ai import get_gemini_service
    fastapi_app.dependency_overrides[get_gemini_service] = lambda: mock_analyzer

    # First analyze succeeds
    client.post(f"/api/v1/scenes/{scene_id}/analyze")

    # Mock the Gemini service (failure)
    mock_analyzer.analyze_scene.side_effect = Exception("Gemini API Error")
    
    # Second analyze fails
    with pytest.raises(Exception):
        client.post(f"/api/v1/scenes/{scene_id}/analyze")

    # Verify previous analysis is preserved
    get_response = client.get(f"/api/v1/scenes/{scene_id}")
    assert get_response.status_code == 200
    scene_data = get_response.json()
    assert scene_data["status"] == "analyzed"
    assert scene_data["analysis"]["subjects"] == ["boy"]

def test_search_requires_analysis():
    # Setup DB state
    proj_res = client.post("/api/v1/projects/", json={"name": "P1"})
    project_id = proj_res.json()["id"]
    script_res = client.post(f"/api/v1/projects/{project_id}/scripts", json={"title": "S1", "full_text": "T"})
    script_id = script_res.json()["id"]
    scene_res = client.post(f"/api/v1/scripts/{script_id}/scenes", json={"sentence_text": "A boy walks.", "order": 1})
    scene_id = scene_res.json()["id"]

    # Try searching before analysis
    search_res = client.post(f"/api/v1/scenes/{scene_id}/search", json={"query": "test"})
    assert search_res.status_code == 400
    assert "analyzed before searching" in search_res.json()["detail"]
