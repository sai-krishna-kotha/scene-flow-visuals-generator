import asyncio
import time
from typing import List, Dict, Optional

from app.schemas.provider import ProviderAsset, ProviderSearchResult
from app.providers.pexels import PexelsProvider
from app.providers.pixabay import PixabayProvider
from app.providers.openverse import OpenverseProvider

class AssetSearchService:
    def __init__(self):
        self.providers = {
            "pexels": PexelsProvider(),
            "pixabay": PixabayProvider(),
            "openverse": OpenverseProvider()
        }

    async def _search_provider(self, name: str, provider, query: str, orientation: str, limit: int) -> ProviderSearchResult:
        start_time = time.time()
        try:
            results = await provider.search(query=query, orientation=orientation, limit=limit)
            latency = (time.time() - start_time) * 1000
            return ProviderSearchResult(
                provider=name,
                status="success",
                results=results,
                latency_ms=latency
            )
        except Exception as e:
            latency = (time.time() - start_time) * 1000
            return ProviderSearchResult(
                provider=name,
                status="failed",
                results=[],
                latency_ms=latency,
                error=str(e)
            )

    async def search_concurrently(self, query: str, orientation: str = "all", limit_per_provider: int = 10) -> List[ProviderSearchResult]:
        """
        Executes search across all configured providers concurrently.
        Failures are isolated and returned as a failed status in the ProviderSearchResult.
        """
        tasks = []
        for name, provider in self.providers.items():
            tasks.append(self._search_provider(name, provider, query, orientation, limit_per_provider))
            
        return await asyncio.gather(*tasks)

    def deduplicate(self, all_results: List[ProviderAsset]) -> List[ProviderAsset]:
        """
        Deterministic deduplication of assets.
        Deduplicates based on (provider + provider_asset_id) and then normalized image URL.
        """
        seen_ids = set()
        seen_urls = set()
        unique_assets = []
        
        for asset in all_results:
            uid = f"{asset.provider}_{asset.provider_asset_id}"
            url = asset.image_url
            
            if uid in seen_ids or (url and url in seen_urls):
                continue
                
            seen_ids.add(uid)
            if url:
                seen_urls.add(url)
                
            unique_assets.append(asset)
            
        return unique_assets

    async def search_and_aggregate(self, query: str, orientation: str = "all", limit_per_provider: int = 10) -> tuple[List[ProviderAsset], Dict[str, str]]:
        """
        Orchestrates concurrent provider search, merges results, and deduplicates.
        Returns the unique candidates and a dictionary mapping provider names to their status.
        """
        provider_results = await self.search_concurrently(query, orientation, limit_per_provider)
        
        all_candidates = []
        provider_statuses = {}
        
        for result in provider_results:
            provider_statuses[result.provider] = result.status
            if result.status == "success":
                all_candidates.extend(result.results)
                
        deduplicated = self.deduplicate(all_candidates)
        return deduplicated, provider_statuses
