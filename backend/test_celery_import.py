import logging
from app.worker.tasks import process_search_job
from qdrant_client import QdrantClient

logging.basicConfig(level=logging.INFO)

def main():
    print("Creating QdrantClient after importing celery tasks...")
    client = QdrantClient(url="http://localhost:6333")
    
    print("Checking collection...")
    try:
        print(client.collection_exists("semantic_assets_v2"))
    except Exception as e:
        print(f"FAILED collection check! {type(e).__name__}: {e}")

if __name__ == "__main__":
    main()
