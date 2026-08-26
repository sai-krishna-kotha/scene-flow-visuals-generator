from fastapi import FastAPI
from app.api.router import api_router
from app.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    docs_url=f"{settings.API_PREFIX}/docs",
    redoc_url=f"{settings.API_PREFIX}/redoc",
)

app.include_router(api_router, prefix=settings.API_PREFIX)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Semantic Visual Asset Generator API V2"}
