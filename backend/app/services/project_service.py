from app.repositories.project_repository import ProjectRepository
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.models.project import Project
from fastapi import HTTPException
import uuid

class ProjectService:
    def __init__(self, repository: ProjectRepository):
        self.repository = repository

    def create_project(self, project_in: ProjectCreate, user_id: uuid.UUID) -> Project:
        return self.repository.create(project_in, user_id=user_id)

    def get_project(self, project_id: uuid.UUID) -> Project:
        project = self.repository.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return project

    def list_projects(self, user_id: uuid.UUID, skip: int = 0, limit: int = 100) -> list[Project]:
        return self.repository.list_by_user(user_id=user_id, skip=skip, limit=limit)

    def update_project(self, project_id: uuid.UUID, project_in: ProjectUpdate) -> Project:
        project = self.get_project(project_id)
        return self.repository.update(project, project_in)

    def delete_project(self, project_id: uuid.UUID) -> None:
        project = self.get_project(project_id)
        self.repository.delete(project)
