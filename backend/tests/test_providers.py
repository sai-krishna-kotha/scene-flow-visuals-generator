import pytest
from unittest.mock import patch, MagicMock
from app.providers.pexels import PexelsProvider
from app.providers.pixabay import PixabayProvider
from app.providers.openverse import OpenverseProvider
from httpx import HTTPStatusError, Request

# ==========================================
# PEXELS TESTS
# ==========================================
@pytest.mark.asyncio
@patch('app.providers.pexels.httpx.AsyncClient.get')
@patch('app.providers.pexels.settings')
async def test_pexels_valid_response(mock_settings, mock_get):
    mock_settings.PEXELS_API_KEY = "test_key"
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "photos": [
            {
                "id": 123,
                "src": {"original": "http://img1", "medium": "http://thumb1"},
                "alt": "Test Image",
                "width": 100,
                "height": 200,
                "url": "http://page1"
            }
        ]
    }
    mock_get.return_value = mock_response

    provider = PexelsProvider()
    results = await provider.search("test query")
    
    assert len(results) == 1
    assert results[0].provider == "pexels"
    assert results[0].provider_asset_id == "123"
    assert results[0].image_url == "http://img1"
    assert results[0].alt_text == "Test Image"
    assert results[0].license == "Pexels"

@pytest.mark.asyncio
@patch('app.providers.pexels.httpx.AsyncClient.get')
@patch('app.providers.pexels.settings')
async def test_pexels_empty_response(mock_settings, mock_get):
    mock_settings.PEXELS_API_KEY = "test_key"
    mock_response = MagicMock()
    mock_response.json.return_value = {"photos": []}
    mock_get.return_value = mock_response

    provider = PexelsProvider()
    results = await provider.search("test query")
    assert len(results) == 0

@pytest.mark.asyncio
@patch('app.providers.pexels.httpx.AsyncClient.get')
@patch('app.providers.pexels.settings')
async def test_pexels_http_error(mock_settings, mock_get):
    mock_settings.PEXELS_API_KEY = "test_key"
    mock_response = MagicMock()
    mock_response.raise_for_status.side_effect = HTTPStatusError("Error", request=Request("GET", ""), response=mock_response)
    mock_get.return_value = mock_response

    provider = PexelsProvider()
    with pytest.raises(HTTPStatusError):
        await provider.search("test query")

# ==========================================
# PIXABAY TESTS
# ==========================================
@pytest.mark.asyncio
@patch('app.providers.pixabay.httpx.AsyncClient.get')
@patch('app.providers.pixabay.settings')
async def test_pixabay_valid_response(mock_settings, mock_get):
    mock_settings.PIXABAY_API_KEY = "test_key"
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "hits": [
            {
                "id": 456,
                "largeImageURL": "http://piximg",
                "webformatURL": "http://pixthumb",
                "tags": "cat, dog",
                "imageWidth": 300,
                "imageHeight": 400,
                "pageURL": "http://pixpage"
            }
        ]
    }
    mock_get.return_value = mock_response

    provider = PixabayProvider()
    results = await provider.search("test query")
    
    assert len(results) == 1
    assert results[0].provider == "pixabay"
    assert results[0].provider_asset_id == "456"
    assert results[0].image_url == "http://piximg"
    assert results[0].alt_text == "cat, dog"
    assert results[0].license == "Pixabay License"

@pytest.mark.asyncio
@patch('app.providers.pixabay.httpx.AsyncClient.get')
@patch('app.providers.pixabay.settings')
async def test_pixabay_http_error(mock_settings, mock_get):
    mock_settings.PIXABAY_API_KEY = "test_key"
    mock_response = MagicMock()
    mock_response.raise_for_status.side_effect = HTTPStatusError("Error", request=Request("GET", ""), response=mock_response)
    mock_get.return_value = mock_response

    provider = PixabayProvider()
    with pytest.raises(HTTPStatusError):
        await provider.search("test query")

# ==========================================
# OPENVERSE TESTS
# ==========================================
@pytest.mark.asyncio
@patch('app.providers.openverse.httpx.AsyncClient.post')
@patch('app.providers.openverse.httpx.AsyncClient.get')
@patch('app.providers.openverse.settings')
async def test_openverse_valid_response(mock_settings, mock_get, mock_post):
    mock_settings.OPENVERSE_CLIENT_ID = "test_id"
    mock_settings.OPENVERSE_CLIENT_SECRET = "test_secret"
    
    # Mock token
    mock_token_resp = MagicMock()
    mock_token_resp.json.return_value = {"access_token": "test_token", "expires_in": 3600}
    mock_post.return_value = mock_token_resp
    
    # Mock search
    mock_search_resp = MagicMock()
    mock_search_resp.json.return_value = {
        "results": [
            {
                "id": "abc-123",
                "url": "http://opvimg",
                "thumbnail": "http://opvthumb",
                "title": "Openverse Image",
                "width": 500,
                "height": 600,
                "license": "CC0",
                "foreign_landing_url": "http://opvpage"
            }
        ]
    }
    mock_get.return_value = mock_search_resp

    provider = OpenverseProvider()
    results = await provider.search("test query")
    
    assert len(results) == 1
    assert results[0].provider == "openverse"
    assert results[0].provider_asset_id == "abc-123"
    assert results[0].image_url == "http://opvimg"
    assert results[0].alt_text == "Openverse Image"
    assert results[0].license == "CC0"

@pytest.mark.asyncio
@patch('app.providers.openverse.httpx.AsyncClient.post')
@patch('app.providers.openverse.settings')
async def test_openverse_token_failure(mock_settings, mock_post):
    mock_settings.OPENVERSE_CLIENT_ID = "test_id"
    mock_settings.OPENVERSE_CLIENT_SECRET = "test_secret"
    
    mock_token_resp = MagicMock()
    mock_token_resp.raise_for_status.side_effect = HTTPStatusError("Error", request=Request("POST", ""), response=mock_token_resp)
    mock_post.return_value = mock_token_resp

    provider = OpenverseProvider()
    with pytest.raises(HTTPStatusError):
        await provider.search("test query")
