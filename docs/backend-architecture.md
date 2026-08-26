# Backend Architecture (V2)

## Why FastAPI
FastAPI was chosen to replace Django due to its native support for asynchronous programming, incredibly fast performance, and built-in type validation via Pydantic. It allows for a clean separation between the backend API and the frontend (React), without the overhead of Django's templating engine and monolithic ORM which is heavier than required for a microservice-style decoupled architecture.

## Application Entry Point
The FastAPI application is instantiated in `app/main.py`. This serves as the root entry point for uvicorn, configuring the app's title, version, and wiring up the primary `api_router`.

## API Routing
Routing is modularized under `app/api/router.py`. All API endpoints are prefixed with `/api/v1` to allow seamless versioning. Sub-routers (such as `health.py`) are included into the main `api_router`, keeping `main.py` clean as the application grows.

## Configuration
We use `pydantic-settings` in `app/config.py`. It securely loads environment variables (like `DATABASE_URL`) with type validation. An example configuration is stored in `.env.example`.

## Database Layer
The database layer uses SQLAlchemy 2.x configured in `app/db/session.py`. It provides a session factory and a FastAPI dependency (`get_db`) to inject database sessions into route handlers. The schema base is defined in `app/db/base.py`. PostgreSQL is the primary target database.

## Alembic
Alembic handles database migrations. It is explicitly configured in `alembic/env.py` to draw the `DATABASE_URL` dynamically from the Pydantic configuration (`app.config.settings`), preventing hardcoded credentials in `alembic.ini`.

## Testing Strategy
Tests are written using `pytest`. The testing suite clearly separates concerns:
1. **API / Routing Tests**: Validates HTTP status codes and JSON responses via `fastapi.testclient.TestClient` (e.g., the `/health` endpoint).
2. **Unit / Model Tests**: Validates SQLAlchemy schema configurations, relationship bindings, and `cascade` behaviors using an isolated SQLite in-memory database to prevent accidental data destruction.
3. **Integration / Schema Tests**: Connects strictly in a read-only mode to the live PostgreSQL `DATABASE_URL` via SQLAlchemy Inspector to validate the schema, constraints, and ENUM types are successfully generated and intact, ensuring migration fidelity without risking live data.

## Why Alongside Django?
This V2 backend foundation is being introduced alongside the old Django application temporarily to allow a phased migration. The Django application remains fully intact as a reference to preserve the existing business logic (Semantic search, Celery workflows) until they are properly ported and validated in the FastAPI environment.
