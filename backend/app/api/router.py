from fastapi import APIRouter
from app.api.routes import health, projects, scripts, scenes, ai

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(scripts.router, tags=["scripts"])
api_router.include_router(scenes.router, tags=["scenes"])
api_router.include_router(ai.router, tags=["ai"])
