from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from app.schemas.provider import ProviderAsset

class SemanticSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(10, ge=1, le=100)
    orientation: str = Field("all", pattern="^(all|landscape|portrait|square)$")
    provider: Optional[str] = None

class SemanticSearchResultItem(BaseModel):
    asset: ProviderAsset
    similarity: float

class SemanticSearchResponse(BaseModel):
    query: str
    results: List[SemanticSearchResultItem]
