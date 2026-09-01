from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import uuid

class Settings(BaseSettings):
    # Minimum required variables
    DATABASE_URL: str = Field(default="postgresql+psycopg2://postgres:postgres@localhost:5432/semantic_assets")
    ENVIRONMENT: str = Field(default="development")
    API_PREFIX: str = Field(default="/api/v1")

    # CORS
    CORS_ORIGINS: str = Field(default="http://localhost:5173")

    # FastAPI configs
    PROJECT_NAME: str = "Semantic Visual Asset Generator API"
    PROJECT_VERSION: str = "2.0.0"

    # Authentication / Identity
    # Temporary fallback user for development (00000000-0000-0000-0000-000000000000)
    DEV_USER_ID: uuid.UUID = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Gemini
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"

    # Providers
    PEXELS_API_KEY: str | None = None
    PIXABAY_API_KEY: str | None = None
    OPENVERSE_CLIENT_ID: str | None = None
    OPENVERSE_CLIENT_SECRET: str | None = None

    # Vector Search & ML
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str | None = None
    QDRANT_COLLECTION: str = "semantic_assets_v2"
    REDIS_URL: str = "redis://localhost:6379/0"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
