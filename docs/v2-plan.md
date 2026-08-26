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
