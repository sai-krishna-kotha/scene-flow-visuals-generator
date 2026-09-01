from qdrant_client import QdrantClient
from app.config import settings

def get_qdrant_client() -> QdrantClient:
    """
    Returns a configured synchronous QdrantClient.
    Using sync here because qdrant_client supports sync well and FastAPI can wrap blocking calls 
    if needed, or we just execute them fast enough in the threadpool.
    """
    return QdrantClient(
        url=settings.QDRANT_URL,
        api_key=settings.QDRANT_API_KEY
    )
