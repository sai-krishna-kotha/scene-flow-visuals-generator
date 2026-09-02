from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate
import uuid

class ProjectRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, project_in: ProjectCreate, user_id: uuid.UUID) -> Project:
        project = Project(
            user_id=user_id,
            name=project_in.name,
            description=project_in.description
        )
        self.session.add(project)
        self.session.commit()
        self.session.refresh(project)
        return project

    def get_by_id(self, project_id: uuid.UUID) -> Project | None:
        return self.session.get(Project, project_id)

    def list_by_user(self, user_id: uuid.UUID, page: int = 1, page_size: int = 20) -> tuple[list[Project], int]:
        from sqlalchemy import func
        offset = (page - 1) * page_size
        
        stmt = select(Project).where(Project.user_id == user_id)
        total = self.session.execute(select(func.count()).select_from(stmt.subquery())).scalar() or 0
        
        items_stmt = stmt.order_by(Project.created_at.desc(), Project.id.desc()).offset(offset).limit(page_size)
        items = list(self.session.execute(items_stmt).scalars().all())
        return items, total

    def update(self, project: Project, project_in: ProjectUpdate) -> Project:
        update_data = project_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(project, field, value)
        self.session.add(project)
        self.session.commit()
        self.session.refresh(project)
        return project

    def delete(self, project: Project) -> None:
        self.session.delete(project)
        self.session.commit()
