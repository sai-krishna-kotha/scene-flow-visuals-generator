from app.repositories.scene_repository import SceneRepository
from app.repositories.script_repository import ScriptRepository
from app.schemas.scene import SceneCreate, SceneUpdate
from app.models.scene import Scene
from fastapi import HTTPException
import uuid

class SceneService:
    def __init__(self, repository: SceneRepository, script_repository: ScriptRepository):
        self.repository = repository
        self.script_repository = script_repository

    def create_scene(self, scene_in: SceneCreate, script_id: uuid.UUID) -> Scene:
        if not self.script_repository.get_by_id(script_id):
            raise HTTPException(status_code=404, detail="Script not found")
        return self.repository.create(scene_in, script_id=script_id)

    def get_scene(self, scene_id: uuid.UUID) -> Scene:
        scene = self.repository.get_by_id(scene_id)
        if not scene:
            raise HTTPException(status_code=404, detail="Scene not found")
        return scene

    def list_scenes(self, script_id: uuid.UUID, skip: int = 0, limit: int = 100) -> list[Scene]:
        if not self.script_repository.get_by_id(script_id):
            raise HTTPException(status_code=404, detail="Script not found")
        return self.repository.list_by_script(script_id=script_id, skip=skip, limit=limit)

    def update_scene(self, scene_id: uuid.UUID, scene_in: SceneUpdate) -> Scene:
        scene = self.get_scene(scene_id)
        return self.repository.update(scene, scene_in)

    def delete_scene(self, scene_id: uuid.UUID) -> None:
        scene = self.get_scene(scene_id)
        self.repository.delete(scene)
