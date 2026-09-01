import pytest
from fastapi.testclient import TestClient
from app.models import Project, Script, Scene, SearchJob, Asset
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.base import Base
from app.main import app as fastapi_app
from app.db.session import get_db

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
    project = Project(id=uuid.uuid4(), name="Test Project", description="Test", user_id=uuid.uuid4())
    db_session.add(project)
    db_session.commit()
    return project

@pytest.fixture
def test_script(db_session, test_project):
    script = Script(id=uuid.uuid4(), title="Test Script", full_text="Text", project_id=test_project.id)
    db_session.add(script)
    db_session.commit()
    return script

@pytest.fixture
def test_scene(db_session, test_script):
    scene = Scene(id=uuid.uuid4(), script_id=test_script.id, order=1, sentence_text="Text")
    db_session.add(scene)
    db_session.commit()
    return scene

@pytest.fixture
def test_job(db_session, test_scene):
    job = SearchJob(id=uuid.uuid4(), scene_id=test_scene.id, requested_query="Query", status="PENDING")
    db_session.add(job)
    db_session.commit()
    return job

def test_delete_project_cascades(client: TestClient, db_session, test_project, test_script, test_scene, test_job):
    proj_id = test_project.id
    script_id = test_script.id
    scene_id = test_scene.id
    job_id = test_job.id

    # Verify records exist
    assert db_session.query(Project).filter_by(id=proj_id).first() is not None
    assert db_session.query(Script).filter_by(id=script_id).first() is not None
    assert db_session.query(Scene).filter_by(id=scene_id).first() is not None
    assert db_session.query(SearchJob).filter_by(id=job_id).first() is not None

    response = client.delete(f"/api/v1/projects/{proj_id}")
    assert response.status_code == 204

    # Verify cascades
    assert db_session.query(Project).filter_by(id=proj_id).first() is None
    assert db_session.query(Script).filter_by(id=script_id).first() is None
    assert db_session.query(Scene).filter_by(id=scene_id).first() is None
    assert db_session.query(SearchJob).filter_by(id=job_id).first() is None

def test_delete_script_cascades(client: TestClient, db_session, test_project, test_script, test_scene, test_job):
    proj_id = test_project.id
    script_id = test_script.id
    scene_id = test_scene.id
    job_id = test_job.id

    response = client.delete(f"/api/v1/scripts/{script_id}")
    assert response.status_code == 204

    # Verify cascades
    assert db_session.query(Project).filter_by(id=proj_id).first() is not None
    assert db_session.query(Script).filter_by(id=script_id).first() is None
    assert db_session.query(Scene).filter_by(id=scene_id).first() is None
    assert db_session.query(SearchJob).filter_by(id=job_id).first() is None

def test_delete_scene_cascades(client: TestClient, db_session, test_project, test_script, test_scene, test_job):
    proj_id = test_project.id
    script_id = test_script.id
    scene_id = test_scene.id
    job_id = test_job.id

    response = client.delete(f"/api/v1/scenes/{scene_id}")
    assert response.status_code == 204

    # Verify cascades
    assert db_session.query(Project).filter_by(id=proj_id).first() is not None
    assert db_session.query(Script).filter_by(id=script_id).first() is not None
    assert db_session.query(Scene).filter_by(id=scene_id).first() is None
    assert db_session.query(SearchJob).filter_by(id=job_id).first() is None

def test_delete_missing_returns_404(client: TestClient):
    fake_id = str(uuid.uuid4())
    res1 = client.delete(f"/api/v1/projects/{fake_id}")
    assert res1.status_code == 404
    
    res2 = client.delete(f"/api/v1/scripts/{fake_id}")
    assert res2.status_code == 404
    
    res3 = client.delete(f"/api/v1/scenes/{fake_id}")
    assert res3.status_code == 404
