import pytest
import uuid
from app.models.asset import Asset
from app.vector.asset_vector_store import AssetVectorStore
from qdrant_client import QdrantClient

# We use a distinct test collection for real integration tests
TEST_COLLECTION = "test_semantic_assets"

from unittest.mock import patch
from app.config import settings

@pytest.fixture(scope="module")
def qdrant_store():
    # Attempt to connect to real Qdrant
    try:
        client = QdrantClient(url="http://localhost:6333", timeout=2.0)
        client.get_collections()
    except Exception as e:
        pytest.skip(f"Real Qdrant not available at localhost:6333: {e}")
        
    with patch.object(settings, 'QDRANT_URL', 'http://localhost:6333'), \
         patch.object(settings, 'QDRANT_API_KEY', None):
        store = AssetVectorStore(dimension=384)
        store.collection_name = TEST_COLLECTION
        
        # Clean up before
        try:
            store.client.delete_collection(TEST_COLLECTION)
        except:
            pass
            
        store.ensure_collection()
        
        yield store
        
        # Clean up after
        try:
            store.client.delete_collection(TEST_COLLECTION)
        except:
            pass

def test_real_qdrant_lifecycle(qdrant_store: AssetVectorStore):
    # Verify collection creation
    assert qdrant_store.client.collection_exists(TEST_COLLECTION)
    
    col_info = qdrant_store.client.get_collection(TEST_COLLECTION)
    assert col_info.config.params.vectors.size == 384
    assert col_info.config.params.vectors.distance.name == "COSINE"

    # Upsert
    asset1 = Asset(id=uuid.uuid4(), provider_name="pexels", width=1920, height=1080) # landscape
    asset2 = Asset(id=uuid.uuid4(), provider_name="pixabay", width=1080, height=1920) # portrait
    
    # Dummy vectors
    vec1 = [0.1] * 384
    vec1[0] = 1.0 # distinct
    
    vec2 = [0.1] * 384
    vec2[1] = 1.0 # distinct
    
    qdrant_store.upsert_assets([asset1, asset2], [vec1, vec2])
    
    # Search top K (unfiltered)
    results = qdrant_store.search(vec1, top_k=2)
    assert len(results) == 2
    assert results[0]["asset_id"] == str(asset1.id)
    assert results[0]["score"] > results[1]["score"]
    
    # Search with orientation filter (landscape)
    filtered_results = qdrant_store.search(vec1, top_k=2, filters={"orientation": "landscape"})
    assert len(filtered_results) == 1
    assert filtered_results[0]["asset_id"] == str(asset1.id)
    
    # Search with provider filter
    prov_results = qdrant_store.search(vec1, top_k=2, filters={"provider": "pixabay"})
    assert len(prov_results) == 1
    assert prov_results[0]["asset_id"] == str(asset2.id)

    # Delete
    qdrant_store.delete_asset(asset1.id)
    after_del = qdrant_store.search(vec1, top_k=2)
    assert len(after_del) == 1
    assert after_del[0]["asset_id"] == str(asset2.id)
