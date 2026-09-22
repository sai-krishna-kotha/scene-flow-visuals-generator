import uuid
import logging
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
import os
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_test():
    url = os.environ.get("QDRANT_URL", "http://localhost:6333")
    logger.info(f"Connecting to Qdrant at {url}")
    client = QdrantClient(url=url)
    
    # 1. Server info
    logger.info("Getting collections...")
    collections = client.get_collections()
    logger.info(f"Collections: {collections}")
    
    collection_name = "test_qdrant_debug_collection"
    dimension = 384
    
    # 2. Recreate collection
    logger.info(f"Recreating collection {collection_name}...")
    client.recreate_collection(
        collection_name=collection_name,
        vectors_config=qmodels.VectorParams(
            size=dimension,
            distance=qmodels.Distance.COSINE
        )
    )
    
    # 3. Upsert
    asset_id = str(uuid.uuid4())
    logger.info(f"Upserting point {asset_id}...")
    vector = [0.1] * dimension
    client.upsert(
        collection_name=collection_name,
        points=[
            qmodels.PointStruct(
                id=asset_id,
                vector=vector,
                payload={"test": "data"}
            )
        ],
        wait=True
    )
    logger.info("Upsert success.")
    
    # 4. Retrieve
    logger.info("Retrieving point...")
    points = client.retrieve(
        collection_name=collection_name,
        ids=[asset_id],
        with_vectors=True
    )
    logger.info(f"Retrieved {len(points)} points.")
    
    # 5. Query
    logger.info("Querying points...")
    search_result = client.query_points(
        collection_name=collection_name,
        query=vector,
        limit=5,
        with_payload=False
    )
    logger.info(f"Query success, got {len(search_result.points)} points.")
    
    # 6. Test with real collection
    real_collection = "semantic_assets_v2"
    logger.info(f"Testing real collection {real_collection}...")
    if client.collection_exists(real_collection):
        logger.info(f"Collection {real_collection} exists. Attempting to scroll some points...")
        try:
            points_real, _ = client.scroll(
                collection_name=real_collection,
                limit=1,
                with_vectors=True
            )
            logger.info(f"Scrolled {len(points_real)} points from real collection.")
            if points_real:
                point_id = points_real[0].id
                logger.info(f"Attempting to retrieve point {point_id}...")
                retrieved = client.retrieve(
                    collection_name=real_collection,
                    ids=[point_id],
                    with_vectors=True
                )
                logger.info(f"Retrieved {len(retrieved)} points from real collection.")
        except Exception as e:
            logger.error(f"Error on real collection: {e}")
    else:
        logger.info(f"Collection {real_collection} does not exist.")

if __name__ == "__main__":
    run_test()
