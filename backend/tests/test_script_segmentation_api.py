import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.models.script import Script
from app.models.scene import Scene
from app.models.project import Project
from app.schemas.ai import ScriptSegmentation, SceneSegment
import uuid

from app.main import app as fastapi_app
from app.db.session import get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.base import Base

@pytest.fixture(scope="module")
def module_engine():
    engine = create_engine(
        "sqlite:///:memory:", 
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session(module_engine):
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=module_engine)
    db = TestingSessionLocal()
    yield db
    db.close()

@pytest.fixture
def client(module_engine):
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=module_engine)
    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()
    
    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as c:
        yield c
    fastapi_app.dependency_overrides.pop(get_db, None)

@pytest.fixture
def test_project(db_session):
    project = Project(user_id=uuid.uuid4(), name="Segmentation Test", description="")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project

@pytest.fixture
def test_script(db_session, test_project):
    script = Script(project_id=test_project.id, title="Test Script", full_text="Scene 1 text. Scene 2 text.")
    db_session.add(script)
    db_session.commit()
    db_session.refresh(script)
    return script

@pytest.fixture
def mock_segmenter():
    with patch("app.services.script_service.GeminiScriptSegmenter") as mock_segmenter_class:
        mock_instance = MagicMock()
        mock_segmenter_class.return_value = mock_instance
        yield mock_instance

def test_segment_script_api_success(client, test_script, mock_segmenter, db_session):
    mock_segmentation = ScriptSegmentation(
        scenes=[
            SceneSegment(order=1, title="Scene 1", scene_text="Scene 1 text."),
            SceneSegment(order=2, title="Scene 2", scene_text="Scene 2 text.")
        ]
    )
    mock_segmenter.segment_script.return_value = mock_segmentation

    response = client.post(f"/api/v1/scripts/{test_script.id}/segment")
    
    assert response.status_code == 201
    data = response.json()
    assert len(data) == 2
    assert data[0]["order"] == 1
    assert data[0]["title"] == "Scene 1"
    
    # Verify in DB
    scenes = db_session.query(Scene).filter(Scene.script_id == test_script.id).order_by(Scene.order).all()
    assert len(scenes) == 2
    assert scenes[0].title == "Scene 1"
    
def test_segment_script_already_exists(client, test_script, mock_segmenter, db_session):
    # Pre-create a scene
    scene = Scene(script_id=test_script.id, sentence_text="Existing", order=1, title="Old")
    db_session.add(scene)
    db_session.commit()
    
    response = client.post(f"/api/v1/scripts/{test_script.id}/segment")
    
    assert response.status_code == 409
    assert "Scenes already exist" in response.json()["detail"]
    assert mock_segmenter.segment_script.call_count == 0

def test_segment_script_empty_text(client, test_project, db_session, mock_segmenter):
    empty_script = Script(project_id=test_project.id, title="Empty", full_text="   ")
    db_session.add(empty_script)
    db_session.commit()
    
    response = client.post(f"/api/v1/scripts/{empty_script.id}/segment")
    
    assert response.status_code == 422
    assert "no content" in response.json()["detail"]

def test_segment_script_not_found(client, mock_segmenter):
    fake_id = uuid.uuid4()
    response = client.post(f"/api/v1/scripts/{fake_id}/segment")
    
    assert response.status_code == 404

def test_segment_script_gemini_error(client, test_script, mock_segmenter):
    from app.core.exceptions import GeminiError
    mock_segmenter.segment_script.side_effect = GeminiError("Gemini is down")
    
    response = client.post(f"/api/v1/scripts/{test_script.id}/segment")
    
    assert response.status_code == 502
    assert "Gemini is down" in response.json()["detail"]
