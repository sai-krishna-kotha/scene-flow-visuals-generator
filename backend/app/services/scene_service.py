from app.repositories.scene_repository import SceneRepository
from app.repositories.script_repository import ScriptRepository
from app.schemas.scene import SceneCreate, SceneUpdate
from app.models.scene import Scene
from fastapi import HTTPException
from app.schemas.ai import SceneAnalysis
from app.exceptions import SceneNotFoundError, ScriptNotFoundError
from sqlalchemy.sql import func
import uuid

class SceneService:
    def __init__(self, repository: SceneRepository, script_repository: ScriptRepository):
        self.repository = repository
        self.script_repository = script_repository

    def create_scene(self, scene_in: SceneCreate, script_id: uuid.UUID) -> Scene:
        if not self.script_repository.get_by_id(script_id):
            raise ScriptNotFoundError()
        return self.repository.create(scene_in, script_id=script_id)

    def get_scene(self, scene_id: uuid.UUID) -> Scene:
        scene = self.repository.get_by_id(scene_id)
        if not scene:
            raise SceneNotFoundError()
        return scene

    def list_scenes(self, script_id: uuid.UUID, page: int = 1, page_size: int = 20):
        if not self.script_repository.get_by_id(script_id):
            raise ScriptNotFoundError()
        items, total = self.repository.list_by_script(script_id=script_id, page=page, page_size=page_size)
        from app.api.pagination import paginate_query
        return paginate_query(page, page_size, total, items)

    def update_scene(self, scene_id: uuid.UUID, scene_in: SceneUpdate) -> Scene:
        scene = self.get_scene(scene_id)
        return self.repository.update(scene, scene_in)

    def delete_scene(self, scene_id: uuid.UUID) -> None:
        scene = self.get_scene(scene_id)
        self.repository.delete(scene)
        
    def update_scene_analysis(self, scene_id: uuid.UUID, analysis: SceneAnalysis) -> Scene:
        scene = self.get_scene(scene_id)
        
        # Validate visual_queries before saving (User requirement #3)
        if not analysis.visual_queries:
            analysis.visual_queries = [analysis.summary] if analysis.summary else []
            
        scene.analysis = analysis.model_dump()
        scene.status = "analyzed"
        scene.analyzed_at = func.now()
        
        self.repository.session.commit()
        self.repository.session.refresh(scene)
        return scene
