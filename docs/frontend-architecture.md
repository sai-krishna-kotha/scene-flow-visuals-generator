# Frontend Architecture (V2)

The Semantic Visual Asset Generator V2 features a lightweight, robust React frontend built for professional storyboard generation.

## Technology Stack

- **Framework:** React 19 + TypeScript
- **Bundler:** Vite
- **Routing:** React Router v7
- **Styling:** Tailwind CSS + Lucide React icons
- **Data Fetching:** Axios (configured with VITE_API_BASE_URL)
- **Testing:** Vitest + React Testing Library

## Architectural Principles

1. **Strict API Contract Enforcement:** The frontend meticulously mirrors the FastAPI backend's Pydantic schemas. Types (`Project`, `Scene`, `SearchJobResponse`, `RankingFeatures`) precisely match backend structures. We do not invent arbitrary UI states.
2. **Stateless UI Logic:** Global state libraries (Redux, Zustand) are avoided entirely. We rely on URL-based routing (React Router) for global state and local React state (`useState`, `useEffect`) for isolated component data.
3. **Robust Asynchronous Polling:** Search requests dispatch background Celery jobs. The UI polls `GET /api/v1/jobs/{job_id}` every 2 seconds via a custom `useJobPolling` hook until a terminal `COMPLETED` or `FAILED` status is reached.
4. **Security by Isolation:** Zero provider tokens or AI API keys exist on the frontend. The Vite application only knows the base API URL.

## Route Map

- `/` → **DashboardPage:** Lists projects and allows creating new ones.
- `/projects/:projectId` → **ProjectPage:** Lists associated scripts and creates new scripts.
- `/projects/:projectId/scripts/:scriptId` → **ScriptPage:** Displays full script text and allows sequential scene creation.
- `/scenes/:sceneId` → **ScenePage:** The core workspace. Interfaces with Gemini for Scene Intelligence (displaying structured subject/mood/environment details) and triggers semantic asset searches.
- `/jobs/:jobId` → **JobPollingPage:** Intermediary processing screen communicating real-time job status (Queued, Processing, Completed).
- `/jobs/:jobId/results` → **JobResultsPage:** Presents the final deterministic visual asset gallery. Uses lazy loading and exposes explainable heuristic ranking scores.

## Error Handling

Standardized Axios interceptors or explicit try/catch blocks catch HTTP error responses (404, 422, 500) and present them via a dedicated `<ErrorMessage />` generic component rather than failing silently or exposing stack traces.
