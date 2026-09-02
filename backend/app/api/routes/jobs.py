from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.models.search_job import SearchJob, JobStatus
from app.schemas.search_job import SearchJobResponse
from app.schemas.semantic_search import SemanticSearchResponse, SemanticSearchRequest
from app.models.asset import Asset

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
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    from sqlalchemy import func
    job = db.query(SearchJob).filter(SearchJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search job not found")
        
    if job.status == JobStatus.PENDING or job.status == JobStatus.RUNNING:
        # According to standard APIs, maybe 409 or just empty results with status text
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Job is currently {job.status}")
        
    if job.status == JobStatus.FAILED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Job failed: {job.error_message}")
        
    offset = (page - 1) * page_size
    
    # Fetch historically persisted results with pagination
    stmt = db.query(Asset).filter(Asset.search_job_id == job_id)
    total = db.query(func.count(Asset.id)).filter(Asset.search_job_id == job_id).scalar() or 0
    
    assets = stmt.order_by(
        Asset.final_score.desc(),
        Asset.semantic_score.desc(),
        (Asset.width * Asset.height).desc(),
        Asset.provider_name.asc(),
        Asset.provider_asset_id.asc(),
        Asset.id.asc()
    ).offset(offset).limit(page_size).all()
    
    # Map back to SemanticSearchResult
    from app.schemas.semantic_search import SemanticSearchResultItem
    from app.services.ranking.ranking_service import RankingFeatures
    from app.schemas.provider import ProviderAsset
    
    final_results = []
    for asset in assets:
        provider_asset = ProviderAsset(
            provider=asset.provider_name,
            provider_asset_id=asset.provider_asset_id,
            image_url=asset.asset_url,
            thumbnail_url=asset.thumbnail_url or "",
            alt_text=asset.alt_text,
            width=asset.width,
            height=asset.height,
            license=asset.license_type,
            source_url=asset.source_url
        )
        
        features = RankingFeatures(
            semantic_score=asset.semantic_score,
            resolution_score=asset.resolution_score,
            orientation_score=asset.orientation_score,
            final_score=asset.final_score
        )
        
        final_results.append(
            SemanticSearchResultItem(
                asset=provider_asset,
                similarity=asset.semantic_score,
                features=features
            )
        )
        
    import math
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return SemanticSearchResponse(
        query=job.requested_query,
        results=final_results,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages
    )
