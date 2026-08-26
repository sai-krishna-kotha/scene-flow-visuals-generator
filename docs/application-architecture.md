# Application Architecture (V2)

The V2 backend introduces a cleanly layered application architecture on top of FastAPI to strictly separate concerns, improve testability, and decouple HTTP routing from core business and AI logic.

## Layered Flow
Requests flow predictably through the application layers:

```
HTTP Router
    ↓
Service  →  Provider Aggregator (Pexels, Pixabay, Openverse)
    ↓
Repository
    ↓
SQLAlchemy
    ↓
PostgreSQL
```

### HTTP Router (`app/api/routes/`)
- **Responsibilities:** Handles only HTTP concerns.
- Deals with request parsing, status codes, Pydantic HTTP schema validation, dependency injection (FastAPI `Depends`), and mapping HTTP methods to Service layer methods.
- **Rule:** Contains NO core business logic and NO direct SQLAlchemy calls.
- **Identity & Authentication:** All routers rely on a clean dependency injection point: `get_current_user()` (located in `app/api/deps.py`). Currently, this is a development-only abstraction that resolves to a safe, configuration-driven `DEV_USER_ID`. In Phase 6 (Authentication), this single dependency will be swapped for a real JWT verifier, instantly securing all routes without requiring any route refactoring.

### Service Layer (`app/services/`)
- **Responsibilities:** Contains the core application orchestration and business logic.
- Validates data state (e.g., checking if a parent Project exists before adding a Script).
- Responsible for transforming Domain concepts and coordinating between distinct repositories or external AI services.

### Repository Layer (`app/repositories/`)
- **Responsibilities:** Encapsulates all data access.
- Executes SQLAlchemy statements and returns native Domain Models (e.g., `Project`, `Script`).
- **Rule:** Contains NO AI logic, NO HTTP concepts, and NO cross-domain orchestration.

---

## AI Services

### Gemini Scene Intelligence (`app/services/ai/gemini_service.py`)

The Gemini integration is strictly isolated as an application service (`GeminiSceneAnalyzer`) decoupled from database models. 

**Flow:**
```
Scene Text (from DB via Service)
    ↓
Gemini Service (`GeminiSceneAnalyzer`)
    ↓
Structured `SceneAnalysis` (Pydantic Model)
    ↓
visual_queries
    ↓
Provider Aggregator (`AssetSearchService`)
 ├── Pexels
 ├── Pixabay
 └── Openverse
    ↓
Normalized Candidates
    ↓
PostgreSQL Persistence (via `SearchService`)
```

**Design Decisions:**
1. **Isolated Service:** Gemini is isolated to prevent leakage of LLM-specific exception handling or prompt manipulation into the HTTP routers or the DB repository.
2. **Structured Output:** We explicitly enforce Google GenAI's `response_schema` feature to force Gemini to output a strict Pydantic `SceneAnalysis` model (summary, subjects, actions, mood, visual queries). This completely eliminates the fragility of parsing free-form LLM text.
3. **Stateless Intelligence:** The Gemini service is responsible *only* for natural language scene intelligence. It does NOT generate images, search the web, or persist to PostgreSQL. It simply accepts a string and returns a typed visual blueprint.
