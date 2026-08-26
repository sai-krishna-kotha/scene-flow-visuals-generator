# Background Processing Architecture

## Overview
Phase 8 introduced Celery and Redis to decouple the long-running semantic search pipeline from the FastAPI request-response lifecycle.

## Why Celery & Redis?
- **Redis** is used as an in-memory message broker to reliably queue tasks between FastAPI and the worker pool.
- **Celery** is used to orchestrate complex background work asynchronously. 

## SearchJob Lifecycle
1. `PENDING`: FastAPI receives the request, inserts a `SearchJob`, and enqueues the Celery task. HTTP 202 Accepted is returned.
2. `RUNNING`: The Celery worker picks up the job and begins orchestration.
3. `COMPLETED`: Analysis, provider search, PostgreSQL hydration, and Qdrant indexing are finished successfully.
4. `FAILED`: The job could not be completed (e.g. all providers failed, or database error). A safe application-level `error_message` is persisted.

## Idempotency
Workers check if a `SearchJob` is already `RUNNING` or `COMPLETED` at startup. If so, they abort to prevent duplicate execution and corruption.

## Transaction Boundaries
Database connections are strictly managed. The PostgreSQL session is opened, used, and explicitly committed and closed *before* any external network call (Gemini, Qdrant, Providers) occurs. A new session is created when persistence is required.

## Failure Handling & Retries
- Bounded retries are supported (e.g. 3 max retries with exponential backoff).
- Qdrant indexing failure does not fail the entire job; the system falls back to database hydration.
- The system handles partial provider failures by using whichever providers succeed.

## Scaling
Currently running `pool=solo` for local development. In production, this can scale horizontally to multiple Celery worker instances consuming from the central Redis broker.
