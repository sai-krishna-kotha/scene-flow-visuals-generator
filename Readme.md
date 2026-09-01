# Semantic Visual Asset Generator (SceneFlow)

The Semantic Visual Asset Generator is an intelligent web application designed to transform text-based scripts into structured visual storyboards. Unlike traditional keyword-based search engines, this system utilizes Natural Language Processing (NLP), Gemini, and Vector Embeddings to understand the contextual meaning of sentences and retrieve the most relevant visual assets from multiple professional APIs.

## Technical Architecture

The application is built using a modern, decoupled architecture:

```text
React + TypeScript
        |
      FastAPI
        |
  PostgreSQL / Redis / Qdrant
        |
 Celery + external APIs + Gemini
```

1. **Frontend**: React + TypeScript, Vite, and Tailwind CSS.
2. **Backend**: FastAPI (Python) handles the business logic, API orchestration, and background task management.
3. **AI Layer**: Gemini for scene segmentation and semantic analysis.
4. **Vector Database**: Qdrant stores image embeddings persistently for extremely fast similarity searches.
5. **Worker Layer**: Celery and Redis handle concurrent fetching from external APIs (Pexels, Pixabay, Openverse).
6. **Relational Database**: PostgreSQL stores Projects, Scripts, Scenes, and Search Jobs.

## Tech Stack

* **Frontend**: React, TypeScript, TailwindCSS
* **Backend**: FastAPI, Pydantic, SQLAlchemy, Alembic
* **Task Management**: Celery, Redis
* **Databases**: PostgreSQL, Qdrant
* **AI/Analysis**: Gemini, Sentence-Transformers
* **Containerization**: Docker

## Prerequisites

* Python 3.10+
* Node.js & npm
* Docker (for Redis, PostgreSQL, Qdrant)

## Installation and Setup

### 1. Services (Docker)

Start the required infrastructure services:
```bash
docker-compose up -d
```
*(This starts PostgreSQL, Redis, and Qdrant)*

### 2. Backend Setup

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in `backend/` with the required API keys:
- `PEXELS_API_KEY`
- `PIXABAY_API_KEY`
- `OPENVERSE_CLIENT_ID`
- `OPENVERSE_CLIENT_SECRET`
- `GEMINI_API_KEY`

Run database migrations:
```bash
alembic upgrade head
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

## Running the Application

To run the full system, you must have the infrastructure, backend, worker, and frontend running.

### Terminal 1: FastAPI Backend
```bash
cd backend
uvicorn app.main:app --reload
```

### Terminal 2: Celery Worker
```bash
cd backend
celery -A app.worker.celery_app worker --loglevel=info
```

### Terminal 3: React Frontend
```bash
cd frontend
npm run dev
```

## Deployment

SceneFlow is designed for production deployment on modern platforms.

### 1. Database & Infrastructure
- **PostgreSQL**: Deploy a managed PostgreSQL instance (e.g., Railway).
- **Redis**: Deploy a managed Redis instance (e.g., Railway).
- **Qdrant**: Deploy a managed Qdrant Cloud cluster and obtain the URL and API Key.

### 2. Backend API (Railway)
Use the provided `Dockerfile`. Railway will automatically build and deploy it.
- **Service Name**: FastAPI API
- **Command**: `uvicorn app.main:app --host 0.0.0.0 --port ${PORT}`
- **Required Environment Variables**:
  - `DATABASE_URL` (Reference your managed PostgreSQL)
  - `REDIS_URL` (Reference your managed Redis)
  - `QDRANT_URL` and `QDRANT_API_KEY`
  - `GEMINI_API_KEY`, `PEXELS_API_KEY`, `PIXABAY_API_KEY`, `OPENVERSE_CLIENT_ID`, `OPENVERSE_CLIENT_SECRET`
  - `CORS_ORIGINS`: Set to your deployed frontend URL (e.g., `https://my-sceneflow-frontend.vercel.app`).
  - `DEV_USER_ID`: A valid UUID for the default user identity.
- **Database Migrations**: Run `alembic upgrade head` on the deployed environment before initial use.
- **Health Check**: `GET /health` is available to confirm service status.

### 3. Celery Worker (Railway)
Deploy the exact same repository and `Dockerfile` as a secondary worker service.
- **Service Name**: Celery Worker
- **Command**: `celery -A app.worker.celery_app worker --loglevel=info`
- **Required Environment Variables**: Same as the API service.

### 4. Frontend (Vercel)
Deploy the `frontend/` directory to Vercel.
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Required Environment Variables**:
  - `VITE_API_BASE_URL`: The deployed API URL (e.g., `https://my-api-service.up.railway.app/api/v1`).


## License

This project was developed for technical evaluation and educational purposes.