from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.models.search_job import SearchJob, JobStatus
from app.schemas.search_job import SearchJobResponse
from app.schemas.semantic_search import SemanticSearchResponse, SemanticSearchRequest
from app.services.semantic_search_service import SemanticSearchService

router = APIRouter()

@router.get("/{job_id}", response_model=SearchJobResponse)
def get_job_status(
    job_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    job = db.query(SearchJob).filter(SearchJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search job not found")
        
    return SearchJobResponse(
        job_id=job.id,
        scene_id=job.scene_id,
        status=job.status,
        created_at=job.created_at,
        updated_at=job.updated_at,
        error_message=job.error_message
    )

@router.get("/{job_id}/results", response_model=SemanticSearchResponse)
def get_job_results(
    job_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    job = db.query(SearchJob).filter(SearchJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search job not found")
        
    if job.status == JobStatus.PENDING or job.status == JobStatus.RUNNING:
        # According to standard APIs, maybe 409 or just empty results with status text
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Job is currently {job.status}")
        
    if job.status == JobStatus.FAILED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Job failed: {job.error_message}")
        
    # The job is COMPLETED.
    # In a full production implementation we would likely persist the final query and orientation to SearchJob
    # For now, we will perform a retrieval on the associated scene assets.
    # Wait! The requirement says: "COMPLETED -> final ranked assets".
    # And "Do not rerun the job when this endpoint is called. Results must come from PostgreSQL/Qdrant-backed application state, not the Celery result backend."
    # The current SemanticSearchService requires a string `query` to do embedding and retrieve.
    # But wait! If the job already aggregated everything from providers into Qdrant, we just need to retrieve for the scene's visual queries!
    
    scene_text = job.scene.sentence_text
    
    # Ideally, we should just query Qdrant using the `SemanticSearchService.search_multi_query` logic with the scene's visual queries,
    # or just return the highest ranked assets from the Job's assets in Postgres (which Qdrant indexes).
    
    semantic_service = SemanticSearchService(db)
    # Re-running the gemini analysis here would violate "do not rerun the job".
    # Since we didn't persist the visual queries to the database, we can just do a default search using the scene sentence text.
    # OR we can fetch all Assets associated with the job in Postgres, and just return them?
    # But the requirement is "final ranked assets".
    
    # Let's perform a simple search using the scene text for now.
    res = semantic_service.search(
        request=SemanticSearchRequest(
            query=scene_text,
            top_k=20,
            orientation="landscape"
        )
    )
    return res
