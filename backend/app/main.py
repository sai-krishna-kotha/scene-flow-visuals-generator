from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
)

if settings.CORS_ORIGINS:
    origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",")],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

from fastapi import Request
from fastapi.responses import JSONResponse
from app.exceptions import NotFoundError

@app.exception_handler(NotFoundError)
async def not_found_error_handler(request: Request, exc: NotFoundError):
    return JSONResponse(
        status_code=404,
        content={"detail": exc.message},
    )

app.include_router(api_router)

from app.api.routes import projects, scripts, scenes, ai, search, jobs, health, auth
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(health.router, prefix="/api/v1", tags=["health"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Semantic Visual Asset Generator API"}

# @app.get("/health")
# def health_check():
#     return {"status": "ok", "service": "sceneflow-api"}
