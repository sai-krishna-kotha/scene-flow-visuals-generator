# Architecture Decisions

This document outlines the high-level decisions and tradeoffs for the V2 redesign.

## FastAPI vs Django
**Decision:** Migrate from Django to FastAPI.
**Reasoning:** The application's core functionality relies heavily on REST APIs for frontend integration and background task orchestration. FastAPI is designed natively for building high-performance APIs and supports asynchronous execution out of the box. Since the system is moving towards decoupled components with a separate frontend (React) and microservices-like architecture, Django's full-stack features (ORM, Templates) add unnecessary weight, while FastAPI's Pydantic integration will simplify data validation and serialization.

## PostgreSQL vs SQLite
**Decision:** Migrate from SQLite to PostgreSQL.
**Reasoning:** SQLite was suitable for early development and prototyping but lacks the concurrency capabilities required for production. With Celery workers actively writing scene states, candidate images, and scores simultaneously, SQLite may encounter database locks. PostgreSQL provides robust concurrency, better data integrity, and scales gracefully under multi-worker loads.

## Qdrant vs Storing Vectors Directly in PostgreSQL
**Decision:** Use Qdrant for vector storage.
**Reasoning:** While PostgreSQL has pgvector, Qdrant is a purpose-built vector database optimized for extremely fast similarity searches and filtering. Since the core feature of the application is semantic retrieval, Qdrant allows for storing image embeddings persistently, avoiding the expensive process of recalculating vector embeddings on the fly for every search request, as currently implemented in the V1 Django version.

## Celery + Redis for Background Processing
**Decision:** Retain Celery + Redis.
**Reasoning:** The existing architecture uses Celery and Redis to handle external API fetches and AI scoring to prevent blocking the web server. This remains a highly effective pattern. In V2, Celery will continue to act as the asynchronous task executor while Redis acts as the message broker, seamlessly integrating with the new FastAPI backend.

## React + TypeScript vs Vanilla JS
**Decision:** Migrate from Vanilla JS to React + TypeScript.
**Reasoning:** The current Vanilla JS frontend is difficult to maintain and scale, lacking robust state management and component reusability. Moving to React allows for building complex, interactive interfaces (such as the storyboard grid) cleanly. TypeScript introduces static typing, catching bugs during development and providing stronger contracts between the frontend and the FastAPI backend.

## Modular Monolith vs Microservices
**Decision:** Adopt a Modular Monolith.
**Reasoning:** While the system utilizes discrete technologies (FastAPI, Qdrant, Celery, React), fully separating them into independent microservices with separate repositories and deployments introduces premature operational complexity. A modular monolith, orchestrated via Docker Compose, provides the logical separation of concerns (API, Workers, AI, Vector DB) while maintaining the simplicity of unified source control and deployment.
