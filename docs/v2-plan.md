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
- [ ] **Phase 6:** Semantic Vector Search + Authentication

## Completed Phases

**Phase 1, 2, 3, 4, & 5** are finalized. The V2 backend is cleanly layered (Router -> Service -> Repository), interacts dynamically with PostgreSQL, natively integrates with Google GenAI for structured AI Storyboard Scene Intelligence, and executes highly-concurrent async provider searches across Pexels, Pixabay, and Openverse with normalized Postgres persistence.

## Next Phase: Phase 6 — Semantic Vector Search + Authentication

- Integrate `Qdrant` for vector embedding storage.
- Introduce `Sentence Transformers` for semantic representation.
- Calculate semantic scoring for the normalized asset candidates gathered during Phase 5.
- Setup JWT Authentication to secure the V2 backend fully for user-scoped workflows.

## Phase 2: FastAPI Backend Foundation
Phase 2 establishes the core FastAPI backend layout. It introduces a modular-monolith directory structure, integrating FastAPI, Pydantic settings, SQLAlchemy 2.x, and Alembic. The backend is placed in a separate `backend/` directory alongside the legacy Django app to allow for incremental feature migration. The foundational API exposes basic routing and health checks while maintaining a PostgreSQL-ready connection dependency.

## Phase 3: PostgreSQL Domain Model
Phase 3 focuses on establishing the core V2 relational database schema using SQLAlchemy 2.x and Alembic. It introduces a cleanly normalized domain hierarchy (User -> Project -> Script -> Scene -> SearchJob -> Asset), extracting execution status from scenes into jobs. UUIDs are used for secure identification, and strict PostgreSQL ENUMs govern state management. Initial database migrations have been successfully verified against the target PostgreSQL database.
