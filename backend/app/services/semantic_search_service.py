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
from app.services.ranking.ranking_service import RankingService

logger = logging.getLogger(__name__)

class SemanticSearchService:
    def __init__(self, db: Session):
        self.db = db
        self.embedding_service = EmbeddingService()
        self.vector_store = AssetVectorStore(dimension=self.embedding_service.dimension)
        self.ranking_service = RankingService()
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

    def _retrieve_candidates(self, query: str, top_k: int, orientation: str, provider: Optional[str]) -> List[tuple[Asset, float]]:
        """
        Retrieves candidates from Qdrant and resolves them via PostgreSQL.
        Returns a list of (Asset, similarity) tuples.
        """
        query_vector = self.embedding_service.encode(query)
        filters = {"orientation": orientation}
        if provider:
            filters["provider"] = provider

        qdrant_results = self.vector_store.search(
            query_vector=query_vector, 
            top_k=top_k, 
            filters=filters
        )

        if not qdrant_results:
            return []

        asset_ids = [uuid.UUID(hit["asset_id"]) for hit in qdrant_results]
        db_assets = self.db.query(Asset).filter(Asset.id.in_(asset_ids)).all()
        asset_map = {asset.id: asset for asset in db_assets}
        
        candidates = []
        for hit in qdrant_results:
            uid = uuid.UUID(hit["asset_id"])
            if uid in asset_map:
                candidates.append((asset_map[uid], hit["score"]))

        return candidates

    def search(self, request: SemanticSearchRequest) -> SemanticSearchResponse:
        """
        Executes a semantic vector search, retrieves candidates, and reranks them.
        """
        retrieval_k = 50 # Fetch more candidates than requested to allow reranking
        
        candidates = self._retrieve_candidates(
            query=request.query,
            top_k=max(retrieval_k, request.top_k),
            orientation=request.orientation,
            provider=request.provider
        )

        if not candidates:
            return SemanticSearchResponse(query=request.query, results=[])

        assets = [c[0] for c in candidates]
        similarities = [c[1] for c in candidates]

        ranked = self.ranking_service.rank(
            assets=assets,
            similarities=similarities,
            requested_orientation=request.orientation,
            final_k=request.top_k
        )

        final_results = [
            SemanticSearchResultItem(
                asset=self._db_asset_to_provider_asset(asset),
                similarity=features.semantic_score,
                features=features
            )
            for asset, features in ranked
        ]

        return SemanticSearchResponse(query=request.query, results=final_results)

    def search_multi_query(self, queries: List[str], top_k: int = 10, orientation: str = "all") -> SemanticSearchResponse:
        """
        Orchestrates semantic search for multiple queries.
        Retrieves candidates, merges by max-pooling similarities, and then reranks.
        """
        retrieval_k = 50
        all_candidate_items = {}
        
        for q in queries:
            candidates = self._retrieve_candidates(
                query=q,
                top_k=retrieval_k,
                orientation=orientation,
                provider=None
            )
            
            for asset, sim in candidates:
                uid = asset.id
                if uid not in all_candidate_items:
                    all_candidate_items[uid] = (asset, sim)
                else:
                    # Max pooling across queries
                    if sim > all_candidate_items[uid][1]:
                        all_candidate_items[uid] = (asset, sim)

        if not all_candidate_items:
            return SemanticSearchResponse(query=" | ".join(queries), results=[])

        assets = [item[0] for item in all_candidate_items.values()]
        similarities = [item[1] for item in all_candidate_items.values()]

        ranked = self.ranking_service.rank(
            assets=assets,
            similarities=similarities,
            requested_orientation=orientation,
            final_k=top_k
        )
        
        final_results = [
            SemanticSearchResultItem(
                asset=self._db_asset_to_provider_asset(asset),
                similarity=features.semantic_score,
                features=features
            )
            for asset, features in ranked
        ]

        return SemanticSearchResponse(
            query=" | ".join(queries),
            results=final_results
        )
