import httpx
from typing import Optional
from app.providers.base import BaseProvider
from app.schemas.provider import ProviderAsset
from app.config import settings

class PexelsProvider(BaseProvider):
    def __init__(self):
        self.api_key = settings.PEXELS_API_KEY
        self.base_url = "https://api.pexels.com/v1"

    async def search(self, query: str, orientation: str = "all", limit: int = 20) -> list[ProviderAsset]:
        if not self.api_key:
            return []
            
        # Pexels supports orientation: landscape, portrait, square
        # Map our internal "all" to None so it doesn't filter
        params = {
            "query": query,
            "per_page": limit,
        }
        
        if orientation in ["landscape", "portrait", "square"]:
            params["orientation"] = orientation
            
        headers = {
            "Authorization": self.api_key
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/search", params=params, headers=headers)
                response.raise_for_status()
                data = response.json()
                
                assets = []
                for photo in data.get("photos", []):
                    assets.append(ProviderAsset(
                        provider="pexels",
                        provider_asset_id=str(photo.get("id")),
                        image_url=photo.get("src", {}).get("original", ""),
                        thumbnail_url=photo.get("src", {}).get("medium", ""),
                        alt_text=photo.get("alt", ""),
                        width=photo.get("width"),
                        height=photo.get("height"),
                        license="Pexels",
                        source_url=photo.get("url")
                    ))
                return assets
        except Exception:
            # We catch all exceptions (HTTPStatusError, ConnectTimeout, etc.) 
            # and re-raise them so the aggregator can handle failure isolation
            raise
