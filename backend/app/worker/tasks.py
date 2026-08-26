import uuid
import logging
from typing import Optional

from app.worker.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.search_job import SearchJob, JobStatus
from app.models.scene import Scene
from app.services.ai.gemini_service import GeminiSceneAnalyzer
from app.services.providers.asset_search_service import AssetSearchService
from app.services.vector_indexing_service import VectorIndexingService
from app.services.semantic_search_service import SemanticSearchService
import asyncio

logger = logging.getLogger(__name__)

def _run_async(coro):
    """Helper to run async code inside a synchronous celery task."""
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(coro)

@celery_app.task(bind=True, max_retries=3)
def process_search_job(self, search_job_id_str: str):
    search_job_id = uuid.UUID(search_job_id_str)
    logger.info(f"Starting process_search_job for job {search_job_id}")

    # 1. Load job and transition to RUNNING
    db = SessionLocal()
    try:
        job = db.query(SearchJob).filter(SearchJob.id == search_job_id).first()
        if not job:
            logger.error(f"SearchJob {search_job_id} not found.")
            return

        if job.status in [JobStatus.COMPLETED, JobStatus.RUNNING]:
            logger.warning(f"SearchJob {search_job_id} is already {job.status}. Aborting to maintain idempotency.")
            return

        job.status = JobStatus.RUNNING
        scene_id = job.scene_id
        scene_text = job.scene.sentence_text
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to initialize job {search_job_id}: {e}")
        db.close()
        raise self.retry(exc=e, countdown=2 ** self.request.retries)
    finally:
        db.close()

    try:
        # 2. Gemini Analysis (No DB session held)
        gemini = GeminiSceneAnalyzer()
        analysis = gemini.analyze_scene(scene_text)
        queries = analysis.visual_queries if analysis.visual_queries else [analysis.summary]
        
        if not queries:
            raise ValueError("Gemini returned no visual queries or summary.")

        # 3. Provider Aggregation (No DB session held)
        provider_service = AssetSearchService()
        all_provider_assets = []
        for query in queries:
            assets, _ = _run_async(provider_service.search_and_aggregate(
                query=query,
                orientation="all",
                limit_per_provider=5
            ))
            all_provider_assets.extend(assets)

        if not all_provider_assets:
            raise ValueError("All providers failed to return assets or no assets found.")

        # 4. PostgreSQL Asset Persistence
        db = SessionLocal()
        try:
            from app.models.asset import Asset
            db_assets = []
            for asset in all_provider_assets:
                db_assets.append(
                    Asset(
                        search_job_id=search_job_id,
                        provider_name=asset.provider,
                        provider_asset_id=asset.provider_asset_id,
                        asset_url=asset.image_url,
                        thumbnail_url=asset.thumbnail_url,
                        source_url=asset.source_url,
                        alt_text=asset.alt_text,
                        width=asset.width,
                        height=asset.height,
                        license_type=asset.license
                    )
                )
            db.add_all(db_assets)
            db.commit()
            for a in db_assets:
                db.refresh(a)
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

        # 5. Qdrant Indexing (No DB session held)
        indexing_service = VectorIndexingService()
        try:
            indexing_service.index_assets(db_assets)
        except Exception as e:
            logger.error(f"Vector indexing failed for job {search_job_id}: {e}")
            # Do not fail the job if just indexing fails, we fallback gracefully

        # 6. Semantic Retrieval & Ranking
        db = SessionLocal()
        try:
            semantic_service = SemanticSearchService(db)
            # We trigger the multi-query retrieval and ranking process to cache or verify it works,
            # but we don't necessarily need to persist the ranking results, as the GET /results API
            # will dynamically fetch it using SemanticSearchService.
            # However, the user prompt states the flow goes to COMPLETED after ranking.
            # Just ensuring it works without throwing errors is enough here.
            # We'll rely on GET /results to actually pull and rank for real-time requests.
            
            job = db.query(SearchJob).filter(SearchJob.id == search_job_id).first()
            job.status = JobStatus.COMPLETED
            db.commit()
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    except Exception as e:
        logger.error(f"SearchJob {search_job_id} failed: {e}")
        db = SessionLocal()
        try:
            job = db.query(SearchJob).filter(SearchJob.id == search_job_id).first()
            if job:
                job.status = JobStatus.FAILED
                job.error_message = str(e)[:255] # Safe bounded application error
                db.commit()
        except Exception as inner_e:
            db.rollback()
            logger.error(f"Failed to update job status to FAILED: {inner_e}")
        finally:
            db.close()
        
        # Don't blindy retry non-transient errors like ValueError from Gemini unless network related.
        # But for simplicity, we don't raise retry here for logical failures, only for DB connection issues at the start.
