from app.repositories.script_repository import ScriptRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.scene_repository import SceneRepository
from app.schemas.script import ScriptCreate, ScriptUpdate
from app.models.script import Script
from app.models.scene import Scene
from app.core.exceptions import ScenesAlreadyExistError, EmptyScriptError
from app.services.ai.gemini_script_segmenter import GeminiScriptSegmenter
from fastapi import HTTPException
from app.exceptions import ScriptNotFoundError, ProjectNotFoundError
import uuid

class ScriptService:
    def __init__(self, repository: ScriptRepository, project_repository: ProjectRepository, scene_repository: SceneRepository = None):
        self.repository = repository
        self.project_repository = project_repository
        self.scene_repository = scene_repository

    def create_script(self, script_in: ScriptCreate, project_id: uuid.UUID) -> Script:
        if not self.project_repository.get_by_id(project_id):
            raise ProjectNotFoundError()
        return self.repository.create(script_in, project_id=project_id)

    def get_script(self, script_id: uuid.UUID) -> Script:
        script = self.repository.get_by_id(script_id)
        if not script:
            raise ScriptNotFoundError()
        return script

    def list_scripts(self, project_id: uuid.UUID, page: int = 1, page_size: int = 20):
        if not self.project_repository.get_by_id(project_id):
            raise ProjectNotFoundError()
        items, total = self.repository.list_by_project(project_id=project_id, page=page, page_size=page_size)
        from app.api.pagination import paginate_query
        return paginate_query(page, page_size, total, items)

    def update_script(self, script_id: uuid.UUID, script_in: ScriptUpdate) -> Script:
        script = self.get_script(script_id)
        return self.repository.update(script, script_in)

    def delete_script(self, script_id: uuid.UUID) -> None:
        script = self.get_script(script_id)
        self.repository.delete(script)

    def segment_and_create_scenes(self, script_id: uuid.UUID) -> list[Scene]:
        script = self.get_script(script_id)
        
        if not script.full_text or not script.full_text.strip():
            raise EmptyScriptError("Script has no content to segment.")

        if not self.scene_repository:
            raise RuntimeError("SceneRepository not injected into ScriptService")

        existing_scenes, _ = self.scene_repository.list_by_script(script_id, page_size=1)
        if existing_scenes:
            raise ScenesAlreadyExistError(str(script_id))

        segmenter = GeminiScriptSegmenter()
        segmentation = segmenter.segment_script(script.full_text)
        
        created_scenes = self.scene_repository.bulk_create_from_segments(script_id, segmentation.scenes)
        return created_scenes
