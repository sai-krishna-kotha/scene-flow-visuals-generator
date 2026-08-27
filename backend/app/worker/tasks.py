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

        # 6. Semantic Retrieval & Ranking (Persist to PostgreSQL)
        db = SessionLocal()
        try:
            job = db.query(SearchJob).filter(SearchJob.id == search_job_id).first()
            
            # Fetch the assets in the current session so updates are saved
            from app.models.asset import Asset
            session_assets = db.query(Asset).filter(Asset.search_job_id == search_job_id).all()
            
            # Reconstruct candidate assets and rank them locally
            semantic_service = SemanticSearchService(db)
            retrieval_k = 50
            all_candidate_items = {}
            
            # We already have `queries` from earlier
            for q in queries:
                pass
                
            vector_store = VectorIndexingService().vector_store
            
            # Fetch vectors from Qdrant
            asset_ids_str = [str(a.id) for a in session_assets]
            try:
                # Retrieve from Qdrant
                qdrant_points = vector_store.client.retrieve(
                    collection_name=vector_store.collection_name,
                    ids=asset_ids_str,
                    with_vectors=True
                )
                
                # Map asset_id -> vector
                vector_map = {point.id: point.vector for point in qdrant_points if point.vector}
                
                import numpy as np
                from app.services.embeddings.embedding_service import EmbeddingService
                embedding_service = EmbeddingService()
                
                # Encode all queries
                query_vectors = [embedding_service.encode(q) for q in queries]
                
                # Compute max similarity for each asset
                similarities = []
                for asset in session_assets:
                    vec = vector_map.get(str(asset.id))
                    if vec:
                        vec_np = np.array(vec)
                        # Cosine similarity is just dot product because vectors are normalized
                        sims = [np.dot(np.array(qv), vec_np) for qv in query_vectors]
                        max_sim = float(max(sims))
                    else:
                        max_sim = 0.0
                    similarities.append(max_sim)
                    
                # Rank
                from app.services.ranking.ranking_service import RankingService
                ranking_service = RankingService()
                
                ranked = ranking_service.rank(
                    assets=session_assets,
                    similarities=similarities,
                    requested_orientation="landscape", # default
                    final_k=len(session_assets) # rank all of them
                )
                
                # Update DB Assets with scores
                # Create a map to easily update
                ranked_map = {asset.id: features for asset, features in ranked}
                for asset in session_assets:
                    features = ranked_map.get(asset.id)
                    if features:
                        asset.semantic_score = features.semantic_score
                        asset.resolution_score = features.resolution_score
                        asset.orientation_score = features.orientation_score
                        asset.final_score = features.final_score
                        asset.relevance_score = features.final_score
                        
            except Exception as rank_err:
                logger.error(f"Ranking failed for job {search_job_id}: {rank_err}")
                raise rank_err
                
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
