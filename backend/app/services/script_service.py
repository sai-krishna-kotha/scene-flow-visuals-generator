from app.repositories.script_repository import ScriptRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.script import ScriptCreate, ScriptUpdate
from app.models.script import Script
from fastapi import HTTPException
import uuid

class ScriptService:
    def __init__(self, repository: ScriptRepository, project_repository: ProjectRepository):
        self.repository = repository
        self.project_repository = project_repository

    def create_script(self, script_in: ScriptCreate, project_id: uuid.UUID) -> Script:
        if not self.project_repository.get_by_id(project_id):
            raise HTTPException(status_code=404, detail="Project not found")
        return self.repository.create(script_in, project_id=project_id)

    def get_script(self, script_id: uuid.UUID) -> Script:
        script = self.repository.get_by_id(script_id)
        if not script:
            raise HTTPException(status_code=404, detail="Script not found")
        return script

    def list_scripts(self, project_id: uuid.UUID, skip: int = 0, limit: int = 100) -> list[Script]:
        if not self.project_repository.get_by_id(project_id):
            raise HTTPException(status_code=404, detail="Project not found")
        return self.repository.list_by_project(project_id=project_id, skip=skip, limit=limit)

    def update_script(self, script_id: uuid.UUID, script_in: ScriptUpdate) -> Script:
        script = self.get_script(script_id)
        return self.repository.update(script, script_in)

    def delete_script(self, script_id: uuid.UUID) -> None:
        script = self.get_script(script_id)
        self.repository.delete(script)
