from pydantic import BaseModel
from typing import Dict, List, Optional
import uuid
from app.schemas.provider import ProviderAsset

class SearchRequest(BaseModel):
    query: str
    orientation: str = "all"
    limit: int = 20

class SearchResponse(BaseModel):
    scene_id: uuid.UUID
    query: str
    providers: Dict[str, str]
    results: List[ProviderAsset]
