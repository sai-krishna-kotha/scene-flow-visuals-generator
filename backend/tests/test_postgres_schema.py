import pytest
from sqlalchemy import create_engine, inspect, text
from app.config import settings

# This test only inspects the schema and does not write data, 
# ensuring safety against the development/production database.
engine = create_engine(settings.DATABASE_URL)

def test_postgresql_tables_exist():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    expected_tables = {'users', 'projects', 'scripts', 'scenes', 'search_jobs', 'assets'}
    assert expected_tables.issubset(set(tables)), f"Missing tables. Found: {tables}"

def test_postgresql_enums_exist():
    # PostgreSQL specific check for custom enum types
    with engine.connect() as conn:
        result = conn.execute(text("SELECT typname FROM pg_type WHERE typname IN ('orientation_enum', 'jobstatus_enum');"))
        enums = {row[0] for row in result.fetchall()}
        
    assert 'orientation_enum' in enums, "orientation_enum missing from PostgreSQL"
    assert 'jobstatus_enum' in enums, "jobstatus_enum missing from PostgreSQL"

def test_users_table_schema():
    inspector = inspect(engine)
    columns = {c['name']: c for c in inspector.get_columns('users')}
    
    assert 'email' in columns
    assert 'hashed_password' in columns
    
    # Check unique constraint on email via indexes
    indexes = inspector.get_indexes('users')
    email_index = next((idx for idx in indexes if idx['column_names'] == ['email']), None)
    assert email_index is not None
    assert email_index['unique'] is True

def test_foreign_keys_and_cascades():
    inspector = inspect(engine)
    
    # Check projects -> users FK
    project_fks = inspector.get_foreign_keys('projects')
    assert len(project_fks) > 0
    assert project_fks[0]['referred_table'] == 'users'
    assert project_fks[0]['options'].get('ondelete') == 'CASCADE'
