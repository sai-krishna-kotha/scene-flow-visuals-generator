# V2 Plan

## Intended Future Stack
The V2 redesign will migrate the application to a more modern, scalable, and decoupled stack.

- **Frontend**: React + TypeScript
- **Backend API**: FastAPI
- **Database**: PostgreSQL (with SQLAlchemy and Alembic for migrations)
- **Background Task Queue**: Celery + Redis
- **Vector Database**: Qdrant
- **Machine Learning**: Sentence Transformers
- **Infrastructure**: Docker Compose
- **Testing**: pytest

## Scope
The core scope remains focused on the semantic visual asset workflow: taking scripts, extracting context, generating semantic embeddings, and retrieving top candidate visual assets from external APIs.

## Implementation Timeline
**Note:** This document outlines the intended future state. Implementation of this V2 architecture will happen in later phases.

- [x] **Phase 1:** Repository hygiene and initialization
- [x] **Phase 2:** FastAPI backend foundation
- [x] **Phase 3:** PostgreSQL domain model and migrations
- [x] **Phase 4:** FastAPI application layer + Gemini Scene Intelligence
- [x] **Phase 5:** Async provider aggregation + Asset retrieval foundations
- [x] **Phase 6:** Semantic Vector Search + Qdrant Integration
- [x] **Phase 7:** Deterministic Semantic Reranking + Explainable Scoring

- [x] **Phase 8:** Celery + Redis Background Processing
- [x] **Phase 9:** React + TypeScript Frontend
- [ ] **Phase 10:** Authentication + Authorization

## Completed Phases

**Phase 1 through 9** are finalized. The V2 backend is cleanly layered (Router -> Service -> Repository), interacts dynamically with PostgreSQL, natively integrates with Google GenAI for structured AI Storyboard Scene Intelligence, executes highly-concurrent async provider searches, vectorizes text using Sentence Transformers, retrieves candidates from Qdrant, deterministically reranks candidates using a pure heuristic algorithm, orchestrates all long-running tasks asynchronously via Celery and Redis, and provides a full-stack React UI.

## Next Phase: Phase 10 — Authentication + Authorization

- [ ] Implement JWT Verification Dependency
- [ ] Add OAuth2/SSO Login
- [ ] Secure all API routes
- [ ] Implement User Scopes (Ownership of Projects)

## Phase 2: FastAPI Backend Foundation
Phase 2 establishes the core FastAPI backend layout. It introduces a modular-monolith directory structure, integrating FastAPI, Pydantic settings, SQLAlchemy 2.x, and Alembic. The backend is placed in a separate `backend/` directory alongside the legacy Django app to allow for incremental feature migration. The foundational API exposes basic routing and health checks while maintaining a PostgreSQL-ready connection dependency.

## Phase 3: PostgreSQL Domain Model
Phase 3 focuses on establishing the core V2 relational database schema using SQLAlchemy 2.x and Alembic. It introduces a cleanly normalized domain hierarchy (User -> Project -> Script -> Scene -> SearchJob -> Asset), extracting execution status from scenes into jobs. UUIDs are used for secure identification, and strict PostgreSQL ENUMs govern state management. Initial database migrations have been successfully verified against the target PostgreSQL database.
