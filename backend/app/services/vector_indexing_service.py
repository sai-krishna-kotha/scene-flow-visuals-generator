import logging
from typing import List
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.services.embeddings.embedding_service import EmbeddingService
from app.services.embeddings.text_formatter import asset_to_embedding_text
from app.vector.asset_vector_store import AssetVectorStore

logger = logging.getLogger(__name__)

class VectorIndexingService:
    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.vector_store = AssetVectorStore(dimension=self.embedding_service.dimension)
        # Ensure collection exists on init
        self.vector_store.ensure_collection()

    def index_assets(self, assets: List[Asset]):
        """
        Generates embeddings for a batch of assets and upserts them into Qdrant.
        Only embeds and indexes; does not touch PostgreSQL.
        """
        if not assets:
            return

        texts_to_embed = [asset_to_embedding_text(asset) for asset in assets]
        
        try:
            logger.info(f"Generating embeddings for {len(assets)} assets...")
            vectors = self.embedding_service.encode(texts_to_embed)
            
            logger.info(f"Upserting {len(assets)} vectors to Qdrant...")
            self.vector_store.upsert_assets(assets, vectors)
            logger.info("Successfully indexed assets to Qdrant.")
        except Exception as e:
            logger.error(f"Failed to index assets to Qdrant: {str(e)}")
            # We raise so the caller can decide whether to fail the whole workflow or just log it
            raise

    def index_asset(self, asset: Asset):
        self.index_assets([asset])
