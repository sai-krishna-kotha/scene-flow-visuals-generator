import argparse
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy.orm import sessionmaker
from app.models.asset import Asset
from app.services.vector_indexing_service import VectorIndexingService
from app.vector.asset_vector_store import AssetVectorStore
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    parser = argparse.ArgumentParser(description="Reindex PostgreSQL Assets into Qdrant")
    parser.add_argument("--batch-size", type=int, default=100, help="Batch size for indexing")
    args = parser.parse_args()

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    indexing_service = VectorIndexingService()
    
    total_assets = session.query(Asset).count()
    logger.info(f"Found {total_assets} assets in PostgreSQL to index.")

    offset = 0
    while offset < total_assets:
        assets_batch = session.query(Asset).order_by(Asset.created_at).offset(offset).limit(args.batch_size).all()
        if not assets_batch:
            break
            
        logger.info(f"Indexing batch of {len(assets_batch)} assets (offset {offset})...")
        indexing_service.index_assets(assets_batch)
        
        offset += args.batch_size

    logger.info("Reindexing complete!")
    session.close()

if __name__ == "__main__":
    main()
