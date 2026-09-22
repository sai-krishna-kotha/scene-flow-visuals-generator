import time
import logging
from qdrant_client import QdrantClient
from app.config import settings

logging.basicConfig(level=logging.INFO)

def main():
    print(f"Connecting to {settings.QDRANT_URL}...")
    
    # Try immediately
    try:
        client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
        print("Checking collection immediately...")
        print(client.collection_exists("semantic_assets_v2"))
    except Exception as e:
        print(f"FAILED immediate collection check! {type(e).__name__}: {e}")
        
    print("Sleeping for 60 seconds...")
    time.sleep(60)
    
    try:
        client2 = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
        print("Checking collection after sleep...")
        print(client2.collection_exists("semantic_assets_v2"))
    except Exception as e:
        print(f"FAILED delayed collection check! {type(e).__name__}: {e}")

if __name__ == "__main__":
    main()
