import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import uuid

from app.config import settings
from app.models.project import Project
import app.models  # noqa: F401

# We explicitly test against the live PostgreSQL database to ensure CRUD operations 
# actually succeed with PostgreSQL constraints (UUIDs, ENUMs, timestamps).
# Note: This connects to the database specified in DATABASE_URL.
# It creates a temporary project and deletes it to remain safe.

@pytest.fixture(scope="module")
def pg_session():
    # If no database URL is provided (e.g. CI without PG), skip the test
    if not settings.DATABASE_URL or "sqlite" in str(settings.DATABASE_URL):
        pytest.skip("PostgreSQL DATABASE_URL not configured. Skipping integration tests.")

    engine = create_engine(str(settings.DATABASE_URL))
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_postgresql_project_crud_integration(pg_session):
    # 1. Create a safe temporary user and project to satisfy Foreign Keys
    dev_user_id = settings.DEV_USER_ID
    test_project_id = uuid.uuid4()
    
    from app.models.user import User
    
    # Try to safely create the dev user if it doesn't exist just for the test
    # Or generate a new random user for complete safety
    test_user_id = uuid.uuid4()
    new_user = User(
        id=test_user_id,
        email=f"test_integration_{test_user_id}@example.com",
        hashed_password="fakehash_integration_test"
    )
    
    new_project = Project(
        id=test_project_id,
        user_id=test_user_id,
        name="Postgres Integration Test Project",
        description="Safe temporary test data"
    )
    
    try:
        pg_session.add(new_user)
        pg_session.add(new_project)
        pg_session.commit()
        
        # 2. Read the project back from the actual PostgreSQL database
        pg_session.refresh(new_project)
        assert new_project.id == test_project_id
        assert new_project.name == "Postgres Integration Test Project"
        
        # We've proven that the python domain model successfully maps to PostgreSQL
        # types, the insert didn't violate constraints, and data was retrieved correctly.
    except Exception as e:
        pg_session.rollback()
        raise e
    finally:
        # 3. Clean up the test project and user to leave no trace
        from sqlalchemy import delete
        stmt_proj = delete(Project).where(Project.id == test_project_id)
        stmt_user = delete(User).where(User.id == test_user_id)
        pg_session.execute(stmt_proj)
        pg_session.execute(stmt_user)
        pg_session.commit()
