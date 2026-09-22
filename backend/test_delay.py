import time
import logging
from qdrant_client import QdrantClient

logging.basicConfig(level=logging.INFO)

def main():
    print("Sleeping for 60 seconds to simulate EmbeddingService loading...")
    time.sleep(60)
    
    print("Creating QdrantClient...")
    client = QdrantClient(url="http://localhost:6333")
    
    print("Checking collection...")
    try:
        print(client.collection_exists("semantic_assets_v2"))
    except Exception as e:
        print(f"FAILED collection check! {type(e).__name__}: {e}")

if __name__ == "__main__":
    main()
