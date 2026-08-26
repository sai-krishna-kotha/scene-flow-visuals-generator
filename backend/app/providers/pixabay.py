import httpx
from app.providers.base import BaseProvider
from app.schemas.provider import ProviderAsset
from app.config import settings

class PixabayProvider(BaseProvider):
    def __init__(self):
        self.api_key = settings.PIXABAY_API_KEY
        self.base_url = "https://pixabay.com/api/"

    async def search(self, query: str, orientation: str = "all", limit: int = 20) -> list[ProviderAsset]:
        if not self.api_key:
            return []
            
        # Pixabay supports orientation: "all", "horizontal", "vertical"
        pixabay_orientation = "all"
        if orientation == "landscape":
            pixabay_orientation = "horizontal"
        elif orientation == "portrait":
            pixabay_orientation = "vertical"
            
        params = {
            "key": self.api_key,
            "q": query,
            "per_page": limit,
            "orientation": pixabay_orientation,
            "image_type": "photo",
            "safesearch": "true"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(self.base_url, params=params)
                response.raise_for_status()
                data = response.json()
                
                assets = []
                for hit in data.get("hits", []):
                    assets.append(ProviderAsset(
                        provider="pixabay",
                        provider_asset_id=str(hit.get("id")),
                        image_url=hit.get("largeImageURL", ""),
                        thumbnail_url=hit.get("webformatURL", ""),
                        alt_text=hit.get("tags", ""),
                        width=hit.get("imageWidth"),
                        height=hit.get("imageHeight"),
                        license="Pixabay License",
                        source_url=hit.get("pageURL")
                    ))
                return assets
        except Exception:
            raise
