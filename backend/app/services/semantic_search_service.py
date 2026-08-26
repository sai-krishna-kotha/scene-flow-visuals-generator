import logging
import uuid
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.services.embeddings.embedding_service import EmbeddingService
from app.vector.asset_vector_store import AssetVectorStore
from app.schemas.semantic_search import SemanticSearchRequest, SemanticSearchResponse, SemanticSearchResultItem
from app.schemas.provider import ProviderAsset
from app.schemas.ai import SceneAnalysis

logger = logging.getLogger(__name__)

class SemanticSearchService:
    def __init__(self, db: Session):
        self.db = db
        self.embedding_service = EmbeddingService()
        self.vector_store = AssetVectorStore(dimension=self.embedding_service.dimension)
        # We ensure collection here as well, just in case
        self.vector_store.ensure_collection()

    def _db_asset_to_provider_asset(self, asset: Asset) -> ProviderAsset:
        return ProviderAsset(
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

    def search(self, request: SemanticSearchRequest) -> SemanticSearchResponse:
        """
        Executes a semantic vector search and resolves the authoritative models from PostgreSQL.
        """
        # 1. Embed query
        query_vector = self.embedding_service.encode(request.query)

        # 2. Setup filters
        filters = {"orientation": request.orientation}
        if request.provider:
            filters["provider"] = request.provider

        # 3. Search Qdrant
        qdrant_results = self.vector_store.search(
            query_vector=query_vector, 
            top_k=request.top_k, 
            filters=filters
        )

        if not qdrant_results:
            return SemanticSearchResponse(query=request.query, results=[])

        # 4. PostgreSQL Resolution
        # Qdrant returns candidate IDs and scores
        asset_ids = [uuid.UUID(hit["asset_id"]) for hit in qdrant_results]
        
        # We fetch all at once
        db_assets = self.db.query(Asset).filter(Asset.id.in_(asset_ids)).all()
        
        # Map them back to the exact Qdrant ordering and map to SemanticSearchResultItem
        asset_map = {asset.id: asset for asset in db_assets}
        
        final_results = []
        for hit in qdrant_results:
            uid = uuid.UUID(hit["asset_id"])
            if uid in asset_map:
                final_results.append(
                    SemanticSearchResultItem(
                        asset=self._db_asset_to_provider_asset(asset_map[uid]),
                        similarity=hit["score"]
                    )
                )

        return SemanticSearchResponse(query=request.query, results=final_results)

    def search_multi_query(self, queries: List[str], top_k: int = 10, orientation: str = "all") -> SemanticSearchResponse:
        """
        Orchestrates semantic search for multiple queries (e.g. from Gemini visual_queries).
        Merges results deterministically by Asset ID, taking the maximum similarity score.
        """
        all_candidate_items = {}
        
        for q in queries:
            req = SemanticSearchRequest(query=q, top_k=top_k, orientation=orientation)
            resp = self.search(req)
            
            for item in resp.results:
                asset_id = item.asset.provider_asset_id # Or we could use DB ID if we exposed it, but provider+id is unique
                uid = f"{item.asset.provider}_{item.asset.provider_asset_id}"
                
                if uid not in all_candidate_items:
                    all_candidate_items[uid] = item
                else:
                    # Max pooling across queries
                    if item.similarity > all_candidate_items[uid].similarity:
                        all_candidate_items[uid] = item

        # Sort combined results by similarity descending
        merged_results = list(all_candidate_items.values())
        merged_results.sort(key=lambda x: x.similarity, reverse=True)
        
        # Trim to top_k
        merged_results = merged_results[:top_k]
        
        return SemanticSearchResponse(
            query=" | ".join(queries),
            results=merged_results
        )
