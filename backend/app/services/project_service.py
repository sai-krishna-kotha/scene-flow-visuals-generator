from app.repositories.project_repository import ProjectRepository
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.models.project import Project
from fastapi import HTTPException
from app.exceptions import ProjectNotFoundError
import uuid

class ProjectService:
    def __init__(self, repository: ProjectRepository):
        self.repository = repository

    def create_project(self, project_in: ProjectCreate, user_id: uuid.UUID) -> Project:
        return self.repository.create(project_in, user_id=user_id)

    def get_project(self, project_id: uuid.UUID) -> Project:
        project = self.repository.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError()
        return project

    def list_projects(self, user_id: uuid.UUID, page: int = 1, page_size: int = 20):
        items, total = self.repository.list_by_user(user_id=user_id, page=page, page_size=page_size)
        from app.api.pagination import paginate_query
        return paginate_query(page, page_size, total, items)

    def update_project(self, project_id: uuid.UUID, project_in: ProjectUpdate) -> Project:
        project = self.get_project(project_id)
        return self.repository.update(project, project_in)

    def delete_project(self, project_id: uuid.UUID) -> None:
        project = self.get_project(project_id)
        self.repository.delete(project)
