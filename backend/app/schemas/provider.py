from pydantic import BaseModel, HttpUrl
from typing import Optional

class ProviderAsset(BaseModel):
    provider: str
    provider_asset_id: str
    image_url: str
    thumbnail_url: str
    alt_text: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    license: Optional[str] = None
    source_url: Optional[str] = None

class ProviderSearchResult(BaseModel):
    provider: str
    status: str
    results: list[ProviderAsset]
    latency_ms: float
    error: Optional[str] = None
