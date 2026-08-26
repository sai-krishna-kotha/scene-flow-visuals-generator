import pytest
from unittest.mock import patch, MagicMock
from app.services.providers.asset_search_service import AssetSearchService
from app.schemas.provider import ProviderAsset
import asyncio

@pytest.fixture
def sample_assets():
    return [
        ProviderAsset(provider="pexels", provider_asset_id="1", image_url="http://img1", thumbnail_url="thumb1"),
        ProviderAsset(provider="pixabay", provider_asset_id="2", image_url="http://img2", thumbnail_url="thumb2"),
        ProviderAsset(provider="openverse", provider_asset_id="3", image_url="http://img3", thumbnail_url="thumb3")
    ]

@pytest.mark.asyncio
async def test_search_concurrently_all_success(sample_assets):
    service = AssetSearchService()
    
    # Mock all providers
    async def mock_pexels(*args, **kwargs): return [sample_assets[0]]
    async def mock_pixabay(*args, **kwargs): return [sample_assets[1]]
    async def mock_openverse(*args, **kwargs): return [sample_assets[2]]
    
    service.providers["pexels"].search = mock_pexels
    service.providers["pixabay"].search = mock_pixabay
    service.providers["openverse"].search = mock_openverse
    
    results = await service.search_concurrently("test", "all", 10)
    
    assert len(results) == 3
    assert all(r.status == "success" for r in results)
    
@pytest.mark.asyncio
async def test_search_concurrently_one_failure(sample_assets):
    service = AssetSearchService()
    
    async def mock_pexels(*args, **kwargs): return [sample_assets[0]]
    async def mock_fail(*args, **kwargs): raise Exception("Provider failed")
    
    service.providers["pexels"].search = mock_pexels
    service.providers["pixabay"].search = mock_fail
    service.providers["openverse"].search = mock_pexels
    
    results = await service.search_concurrently("test", "all", 10)
    
    assert len(results) == 3
    
    pixabay_res = next(r for r in results if r.provider == "pixabay")
    assert pixabay_res.status == "failed"
    assert "Provider failed" in pixabay_res.error
    assert len(pixabay_res.results) == 0
    
    # The others succeeded
    pexels_res = next(r for r in results if r.provider == "pexels")
    assert pexels_res.status == "success"
    assert len(pexels_res.results) == 1

def test_deduplication():
    service = AssetSearchService()
    
    assets = [
        ProviderAsset(provider="pexels", provider_asset_id="1", image_url="http://img1", thumbnail_url=""),
        ProviderAsset(provider="pexels", provider_asset_id="1", image_url="http://img1", thumbnail_url=""), # Duplicate ID
        ProviderAsset(provider="pixabay", provider_asset_id="2", image_url="http://img1", thumbnail_url=""), # Duplicate URL
        ProviderAsset(provider="openverse", provider_asset_id="3", image_url="http://img3", thumbnail_url="")
    ]
    
    unique = service.deduplicate(assets)
    assert len(unique) == 2
    assert unique[0].provider == "pexels"
    assert unique[1].provider == "openverse"

@pytest.mark.asyncio
async def test_search_and_aggregate():
    service = AssetSearchService()
    
    async def mock_success(*args, **kwargs):
        return [ProviderAsset(provider="pexels", provider_asset_id="1", image_url="http://img1", thumbnail_url="")]
    async def mock_fail(*args, **kwargs): raise Exception("Failed")
    
    service.providers["pexels"].search = mock_success
    service.providers["pixabay"].search = mock_fail
    service.providers["openverse"].search = mock_success
    
    assets, statuses = await service.search_and_aggregate("test", "all", 10)
    
    # Deduplication will remove the second openverse mock result if we returned the exact same object/URL, 
    # but here openverse returns provider="pexels" by my mock, which is weird but tests deduplication!
    assert len(assets) == 1
    assert statuses["pexels"] == "success"
    assert statuses["pixabay"] == "failed"
    assert statuses["openverse"] == "success"
