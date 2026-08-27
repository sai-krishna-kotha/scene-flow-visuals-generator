import logging
import uuid
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from qdrant_client.http.exceptions import UnexpectedResponse

from app.config import settings
from app.models.asset import Asset
from app.vector.qdrant_client import get_qdrant_client

logger = logging.getLogger(__name__)

class AssetVectorStore:
    def __init__(self, dimension: int):
        self.client: QdrantClient = get_qdrant_client()
        self.collection_name = settings.QDRANT_COLLECTION
        self.dimension = dimension

    def ensure_collection(self):
        """Creates the collection if it doesn't exist with the required dimension and Cosine metric."""
        if not self.client.collection_exists(self.collection_name):
            logger.info(f"Creating Qdrant collection '{self.collection_name}' with dimension {self.dimension}")
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=qmodels.VectorParams(
                    size=self.dimension,
                    distance=qmodels.Distance.COSINE
                )
            )
        else:
            logger.info(f"Qdrant collection '{self.collection_name}' already exists.")

    def _determine_orientation(self, width: int, height: int) -> str:
        if not width or not height:
            return "unknown"
        if width > height:
            return "landscape"
        elif height > width:
            return "portrait"
        return "square"

    def upsert_assets(self, assets: List[Asset], vectors: List[List[float]]):
        """
        Batch upsert assets into Qdrant.
        Only stores the UUID and critical filtering metadata. PostgreSQL remains the authoritative source.
        """
        if not assets:
            return
            
        if len(assets) != len(vectors):
            raise ValueError("Mismatched length of assets and vectors")

        points = []
        for asset, vector in zip(assets, vectors):
            orientation = self._determine_orientation(asset.width, asset.height)
            
            payload = {
                "asset_id": str(asset.id),
                "provider": asset.provider_name,
                "orientation": orientation,
                "width": asset.width,
                "height": asset.height
            }
            
            points.append(
                qmodels.PointStruct(
                    id=str(asset.id), # UUID string is a valid point ID in Qdrant
                    vector=vector,
                    payload=payload
                )
            )

        self.client.upsert(
            collection_name=self.collection_name,
            points=points,
            wait=True
        )

    def search(self, query_vector: List[float], top_k: int = 10, filters: Optional[Dict[str, Any]] = None) -> List[dict]:
        """
        Search for top_k assets matching the query vector.
        Supports filtering by orientation or provider.
        Returns a list of dicts: {"asset_id": str, "score": float}
        """
        qdrant_filters = []
        if filters:
            if "orientation" in filters and filters["orientation"] != "all":
                qdrant_filters.append(
                    qmodels.FieldCondition(
                        key="orientation",
                        match=qmodels.MatchValue(value=filters["orientation"])
                    )
                )
            if "provider" in filters:
                qdrant_filters.append(
                    qmodels.FieldCondition(
                        key="provider",
                        match=qmodels.MatchValue(value=filters["provider"])
                    )
                )

        filter_obj = None
        if qdrant_filters:
            filter_obj = qmodels.Filter(must=qdrant_filters)

        search_result = self.client.query_points(
            collection_name=self.collection_name,
            query=query_vector,
            query_filter=filter_obj,
            limit=top_k,
            with_payload=False # We don't need payload back, just the ID to query PostgreSQL
        )

        return [{"asset_id": hit.id, "score": hit.score} for hit in search_result.points]

    def delete_asset(self, asset_id: uuid.UUID):
        """Removes an asset vector from Qdrant by its ID."""
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=qmodels.PointIdsList(
                points=[str(asset_id)],
            ),
        )
