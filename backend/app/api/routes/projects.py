from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.schemas.pagination import PaginatedResponse
from app.repositories.project_repository import ProjectRepository
from app.services.project_service import ProjectService
from app.api.deps import get_current_user

router = APIRouter()

def get_project_service(db: Session = Depends(get_db)) -> ProjectService:
    repo = ProjectRepository(db)
    return ProjectService(repo)

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(project_in: ProjectCreate, service: ProjectService = Depends(get_project_service), user_id: uuid.UUID = Depends(get_current_user)):
    return service.create_project(project_in, user_id=user_id)

@router.get("/", response_model=PaginatedResponse[ProjectResponse])
def list_projects(page: int = 1, page_size: int = 20, service: ProjectService = Depends(get_project_service), user_id: uuid.UUID = Depends(get_current_user)):
    return service.list_projects(user_id=user_id, page=page, page_size=page_size)

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: uuid.UUID, service: ProjectService = Depends(get_project_service)):
    return service.get_project(project_id)

@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: uuid.UUID, project_in: ProjectUpdate, service: ProjectService = Depends(get_project_service)):
    return service.update_project(project_id, project_in)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: uuid.UUID, service: ProjectService = Depends(get_project_service)):
    service.delete_project(project_id)
