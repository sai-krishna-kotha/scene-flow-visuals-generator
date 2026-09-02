from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.schemas.scene import SceneCreate, SceneUpdate, SceneResponse
from app.schemas.pagination import PaginatedResponse
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

@router.get("/scripts/{script_id}/scenes", response_model=PaginatedResponse[SceneResponse])
def list_scenes(script_id: uuid.UUID, page: int = 1, page_size: int = 20, service: SceneService = Depends(get_scene_service)):
    return service.list_scenes(script_id=script_id, page=page, page_size=page_size)

@router.get("/scenes/{scene_id}", response_model=SceneResponse)
def get_scene(scene_id: uuid.UUID, service: SceneService = Depends(get_scene_service)):
    return service.get_scene(scene_id)

@router.patch("/scenes/{scene_id}", response_model=SceneResponse)
def update_scene(scene_id: uuid.UUID, scene_in: SceneUpdate, service: SceneService = Depends(get_scene_service)):
    return service.update_scene(scene_id, scene_in)

@router.delete("/scenes/{scene_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scene(scene_id: uuid.UUID, service: SceneService = Depends(get_scene_service)):
    service.delete_scene(scene_id)

from app.worker.tasks import process_search_job
from app.models.search_job import SearchJob, JobStatus
from app.schemas.search_job import SearchJobResponse
from fastapi import HTTPException

@router.post("/scenes/{scene_id}/search", response_model=SearchJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def search_scene_assets(
    scene_id: uuid.UUID,
    request: SearchRequest,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """
    Enqueues a background job to perform multi-provider asset search for a scene.
    """
    repo = SceneRepository(db)
    scene = repo.get_by_id(scene_id)
    if not scene:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scene not found")
    if scene.script.project.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this scene")
    if scene.status != "analyzed" or not scene.analysis:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scene must be analyzed before searching for visual assets")

    job = SearchJob(
        scene_id=scene_id, 
        status=JobStatus.PENDING,
        requested_query=request.query,
        ranking_version="v1"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Enqueue celery task
    process_search_job.delay(str(job.id))

    return SearchJobResponse(
        job_id=job.id,
        scene_id=scene_id,
        status=job.status,
        requested_query=job.requested_query,
        ranking_version=job.ranking_version
    )

@router.get("/scenes/{scene_id}/jobs", response_model=PaginatedResponse[SearchJobResponse])
def list_scene_jobs(
    scene_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """
    Returns historical SearchJobs for a scene, newest first.
    """
    from sqlalchemy import func
    repo = SceneRepository(db)
    scene = repo.get_by_id(scene_id)
    if not scene:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scene not found")
    if scene.script.project.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this scene")

    offset = (page - 1) * page_size
    stmt = db.query(SearchJob).filter(SearchJob.scene_id == scene_id)
    total = db.query(func.count(SearchJob.id)).filter(SearchJob.scene_id == scene_id).scalar() or 0
    
    jobs = stmt.order_by(SearchJob.created_at.desc(), SearchJob.id.desc()).offset(offset).limit(page_size).all()
    
    responses = []
    for job in jobs:
        responses.append(
            SearchJobResponse(
                job_id=job.id,
                scene_id=job.scene_id,
                status=job.status,
                requested_query=job.requested_query,
                ranking_version=job.ranking_version,
                created_at=job.created_at,
                updated_at=job.updated_at,
                error_message=job.error_message,
                result_count=len(job.assets)
            )
        )
        
    from app.api.pagination import paginate_query
    return paginate_query(page, page_size, total, responses)
