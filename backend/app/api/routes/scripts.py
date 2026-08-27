from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.schemas.script import ScriptCreate, ScriptUpdate, ScriptResponse
from app.schemas.scene import SceneResponse
from app.repositories.script_repository import ScriptRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.scene_repository import SceneRepository
from app.services.script_service import ScriptService
from app.core.exceptions import ScenesAlreadyExistError, GeminiError, SegmentationError, EmptyScriptError

router = APIRouter()

def get_script_service(db: Session = Depends(get_db)) -> ScriptService:
    repo = ScriptRepository(db)
    project_repo = ProjectRepository(db)
    scene_repo = SceneRepository(db)
    return ScriptService(repo, project_repo, scene_repo)

@router.post("/projects/{project_id}/scripts", response_model=ScriptResponse, status_code=status.HTTP_201_CREATED)
def create_script(project_id: uuid.UUID, script_in: ScriptCreate, service: ScriptService = Depends(get_script_service)):
    return service.create_script(script_in, project_id=project_id)

@router.get("/projects/{project_id}/scripts", response_model=list[ScriptResponse])
def list_scripts(project_id: uuid.UUID, skip: int = 0, limit: int = 100, service: ScriptService = Depends(get_script_service)):
    return service.list_scripts(project_id=project_id, skip=skip, limit=limit)

@router.get("/scripts/{script_id}", response_model=ScriptResponse)
def get_script(script_id: uuid.UUID, service: ScriptService = Depends(get_script_service)):
    return service.get_script(script_id)

@router.patch("/scripts/{script_id}", response_model=ScriptResponse)
def update_script(script_id: uuid.UUID, script_in: ScriptUpdate, service: ScriptService = Depends(get_script_service)):
    return service.update_script(script_id, script_in)

@router.delete("/scripts/{script_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_script(script_id: uuid.UUID, service: ScriptService = Depends(get_script_service)):
    service.delete_script(script_id)

@router.post("/scripts/{script_id}/segment", response_model=list[SceneResponse], status_code=status.HTTP_201_CREATED)
def segment_script(script_id: uuid.UUID, service: ScriptService = Depends(get_script_service)):
    try:
        return service.segment_and_create_scenes(script_id)
    except EmptyScriptError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except ScenesAlreadyExistError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except (GeminiError, SegmentationError) as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
