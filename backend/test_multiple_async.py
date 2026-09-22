import asyncio
import logging
import httpx
from qdrant_client import QdrantClient
from app.services.embeddings.embedding_service import EmbeddingService

logging.basicConfig(level=logging.INFO)

def _run_async(coro):
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(coro)

async def dummy_request():
    async with httpx.AsyncClient() as client:
        await client.get("https://pixabay.com", follow_redirects=True)

def main():
    print("Running async requests multiple times...")
    for i in range(5):
        _run_async(dummy_request())
    
    print("Loading embedding service...")
    emb = EmbeddingService()
    print("Dimension:", emb.dimension)
    
    print("Creating QdrantClient...")
    client = QdrantClient(url="http://localhost:6333")
    
    print("Checking collection...")
    try:
        print(client.collection_exists("semantic_assets_v2"))
    except Exception as e:
        print(f"FAILED collection check! {type(e).__name__}: {e}")

if __name__ == "__main__":
    main()
