from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # Minimum required variables
    DATABASE_URL: str = Field(default="postgresql+psycopg2://postgres:postgres@localhost:5432/semantic_assets")
    ENVIRONMENT: str = Field(default="development")
    API_PREFIX: str = Field(default="/api/v1")

    # FastAPI configs
    PROJECT_NAME: str = "Semantic Visual Asset Generator API"
    PROJECT_VERSION: str = "2.0.0"

    # Gemini
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
