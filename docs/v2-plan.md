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
**Note:** This document outlines the intended future state. Implementation of this V2 architecture will happen in later phases. The current Phase 1 focuses entirely on repository hygiene and preparation.

## Phase 2: FastAPI Backend Foundation
Phase 2 establishes the core FastAPI backend layout. It introduces a modular-monolith directory structure, integrating FastAPI, Pydantic settings, SQLAlchemy 2.x, and Alembic. The backend is placed in a separate `backend/` directory alongside the legacy Django app to allow for incremental feature migration. The foundational API exposes basic routing and health checks while maintaining a PostgreSQL-ready connection dependency.

## Phase 3: PostgreSQL Domain Model
Phase 3 focuses on establishing the core V2 relational database schema using SQLAlchemy 2.x and Alembic. It introduces a cleanly normalized domain hierarchy (User -> Project -> Script -> Scene -> SearchJob -> Asset), extracting execution status from scenes into jobs. UUIDs are used for secure identification, and strict PostgreSQL ENUMs govern state management. Initial database migrations have been successfully verified against the target PostgreSQL database.
