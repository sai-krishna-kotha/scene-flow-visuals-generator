from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.schemas.scene import SceneCreate, SceneUpdate, SceneResponse
from app.repositories.scene_repository import SceneRepository
from app.repositories.script_repository import ScriptRepository
from app.services.scene_service import SceneService
from app.services.search_service import SearchService
from app.schemas.search import SearchRequest, SearchResponse
from app.api.deps import get_current_user

router = APIRouter()

def get_scene_service(db: Session = Depends(get_db)) -> SceneService:
    repo = SceneRepository(db)
    script_repo = ScriptRepository(db)
    return SceneService(repo, script_repo)

def get_search_service(db: Session = Depends(get_db)) -> SearchService:
    return SearchService(db)

@router.post("/scripts/{script_id}/scenes", response_model=SceneResponse, status_code=status.HTTP_201_CREATED)
def create_scene(script_id: uuid.UUID, scene_in: SceneCreate, service: SceneService = Depends(get_scene_service)):
    return service.create_scene(scene_in, script_id=script_id)

@router.get("/scripts/{script_id}/scenes", response_model=list[SceneResponse])
def list_scenes(script_id: uuid.UUID, skip: int = 0, limit: int = 100, service: SceneService = Depends(get_scene_service)):
    return service.list_scenes(script_id=script_id, skip=skip, limit=limit)

@router.get("/scenes/{scene_id}", response_model=SceneResponse)
def get_scene(scene_id: uuid.UUID, service: SceneService = Depends(get_scene_service)):
    return service.get_scene(scene_id)

@router.patch("/scenes/{scene_id}", response_model=SceneResponse)
def update_scene(scene_id: uuid.UUID, scene_in: SceneUpdate, service: SceneService = Depends(get_scene_service)):
    return service.update_scene(scene_id, scene_in)

@router.delete("/scenes/{scene_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scene(scene_id: uuid.UUID, service: SceneService = Depends(get_scene_service)):
    service.delete_scene(scene_id)

@router.post("/scenes/{scene_id}/search", response_model=SearchResponse)
async def search_scene_assets(
    scene_id: uuid.UUID,
    request: SearchRequest,
    service: SearchService = Depends(get_search_service),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """
    Executes a multi-provider asset search for a scene and persists the candidates.
    """
    return await service.search_assets_for_scene(
        scene_id=scene_id,
        query=request.query,
        orientation=request.orientation,
        limit=request.limit,
        user_id=user_id
    )
