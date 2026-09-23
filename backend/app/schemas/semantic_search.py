from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from app.schemas.provider import ProviderAsset
from app.schemas.ranking import RankingFeatures

class SemanticSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(10, ge=1, le=100)
    orientation: str = Field("all", pattern="^(all|landscape|portrait|square)$")
    provider: Optional[str] = None

class SemanticSearchResultItem(BaseModel):
    # Optional for generic semantic-search responses; job-results responses
    # populate this with the persisted database Asset UUID so the frontend
    # can maintain stable selection keys across pagination.
    asset_id: Optional[str] = None
    asset: ProviderAsset
    similarity: float
    features: Optional[RankingFeatures] = None

class SemanticSearchResponse(BaseModel):
    query: str
    results: List[SemanticSearchResultItem]
    page: int = 1
    page_size: int = 20
    total: int = 0
    total_pages: int = 0
