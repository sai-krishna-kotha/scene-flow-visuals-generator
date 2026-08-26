import httpx
import time
import logging
from app.providers.base import BaseProvider
from app.schemas.provider import ProviderAsset
from app.config import settings

logger = logging.getLogger(__name__)

# Module-level cache for Openverse token
_openverse_token_cache = {
    "token": None,
    "expires_at": 0
}

class OpenverseProvider(BaseProvider):
    def __init__(self):
        self.client_id = settings.OPENVERSE_CLIENT_ID
        self.client_secret = settings.OPENVERSE_CLIENT_SECRET
        self.auth_url = "https://api.openverse.org/v1/auth_tokens/token/"
        self.base_url = "https://api.openverse.org/v1/images/"

    async def _get_access_token(self) -> str | None:
        if not self.client_id or not self.client_secret:
            return None

        # Check cache (refresh 1 minute before actual expiry for safety)
        if _openverse_token_cache["token"] and time.time() < _openverse_token_cache["expires_at"]:
            return _openverse_token_cache["token"]

        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "client_credentials"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.auth_url, data=data)
                response.raise_for_status()
                token_data = response.json()
                
                access_token = token_data.get("access_token")
                expires_in = token_data.get("expires_in", 3600)
                
                if access_token:
                    _openverse_token_cache["token"] = access_token
                    _openverse_token_cache["expires_at"] = time.time() + expires_in - 60
                    return access_token
                return None
        except Exception:
            _openverse_token_cache["token"] = None
            _openverse_token_cache["expires_at"] = 0
            raise

    async def search(self, query: str, orientation: str = "all", limit: int = 20) -> list[ProviderAsset]:
        token = await self._get_access_token()
        if not token:
            return []

        # Openverse supports aspect_ratio: "square,tall,wide"
        aspect_ratio = None
        if orientation == "landscape":
            aspect_ratio = "wide"
        elif orientation == "portrait":
            aspect_ratio = "tall"
        elif orientation == "square":
            aspect_ratio = "square"

        params = {
            "q": query,
            "page_size": limit,
        }
        if aspect_ratio:
            params["aspect_ratio"] = aspect_ratio

        headers = {
            "Authorization": f"Bearer {token}"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(self.base_url, params=params, headers=headers)
                response.raise_for_status()
                data = response.json()
                
                assets = []
                for result in data.get("results", []):
                    # Fallback to calculating width/height if present
                    # Openverse might not always return it for all sources
                    assets.append(ProviderAsset(
                        provider="openverse",
                        provider_asset_id=str(result.get("id")),
                        image_url=result.get("url", ""),
                        thumbnail_url=result.get("thumbnail", ""),
                        alt_text=result.get("title", ""),
                        width=result.get("width"),
                        height=result.get("height"),
                        license=result.get("license", "unknown"),
                        source_url=result.get("foreign_landing_url")
                    ))
                return assets
        except Exception:
            raise
