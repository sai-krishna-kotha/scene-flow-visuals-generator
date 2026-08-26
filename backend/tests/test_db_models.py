# SQLite in-memory database is strictly used here for FAST, ISOLATED Unit Model tests.
# This validates pure SQLAlchemy python-level logic (e.g. relationships, cascaded deletes).
# It does NOT validate actual PostgreSQL constraints (like ENUMs).
# For real schema verification, see test_postgres_schema.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.models.user import User
from app.models.project import Project
from app.models.script import Script, Orientation
from app.models.scene import Scene
from app.models.search_job import SearchJob, JobStatus
from app.models.asset import Asset

# Use an in-memory SQLite database for isolated, deterministic model tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

def test_create_user(db):
    user = User(email="test@example.com", hashed_password="hashed_pw")
    db.add(user)
    db.commit()
    assert user.id is not None
    assert user.created_at is not None

def test_full_domain_model_creation(db):
    # 1. Create User
    user = User(email="test2@example.com", hashed_password="pw")
    db.add(user)
    db.flush()

    # 2. Create Project
    project = Project(user_id=user.id, name="My Project", description="Test Description")
    db.add(project)
    db.flush()

    # 3. Create Script
    script = Script(
        project_id=project.id, 
        title="My Script", 
        full_text="This is a test script.",
        orientation_preference=Orientation.LANDSCAPE
    )
    db.add(script)
    db.flush()

    # 4. Create Scene
    scene = Scene(script_id=script.id, sentence_text="This is a test script.", order=1)
    db.add(scene)
    db.flush()

    # 5. Create SearchJob
    job = SearchJob(scene_id=scene.id, status=JobStatus.COMPLETED)
    db.add(job)
    db.flush()

    # 6. Create Asset
    asset = Asset(
        search_job_id=job.id,
        provider_name="pexels",
        asset_url="http://example.com/image.jpg",
        width=1920,
        height=1080,
        relevance_score=0.95
    )
    db.add(asset)
    db.commit()

    # Verify relationships
    assert len(user.projects) == 1
    assert user.projects[0].name == "My Project"
    
    assert len(project.scripts) == 1
    assert project.scripts[0].orientation_preference == Orientation.LANDSCAPE
    
    assert len(script.scenes) == 1
    assert script.scenes[0].sentence_text == "This is a test script."
    
    assert len(scene.search_jobs) == 1
    assert scene.search_jobs[0].status == JobStatus.COMPLETED
    
    assert len(job.assets) == 1
    assert job.assets[0].provider_name == "pexels"
    assert job.assets[0].relevance_score == 0.95
