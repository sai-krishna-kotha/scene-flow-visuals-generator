import pytest
import uuid
from unittest.mock import patch, MagicMock

@pytest.fixture(autouse=True)
def mock_qdrant_global():
    with patch('app.vector.asset_vector_store.get_qdrant_client') as mock:
        yield mock
from app.services.embeddings.embedding_service import EmbeddingService
from app.services.embeddings.text_formatter import asset_to_embedding_text
from app.models.asset import Asset
from app.services.semantic_search_service import SemanticSearchService
from app.schemas.semantic_search import SemanticSearchRequest
from app.services.vector_indexing_service import VectorIndexingService

# ---------------------------------------------------------
# EMBEDDING TESTS
# ---------------------------------------------------------

def test_text_formatter():
    asset = Asset(
        id=uuid.uuid4(),
        provider_name="pexels",
        alt_text="A  beautiful   sunset ",
        width=800,
        height=600
    )
    text = asset_to_embedding_text(asset)
    assert text == "A beautiful sunset. Provider: Pexels."

    asset_no_alt = Asset(
        id=uuid.uuid4(),
        provider_name="pixabay",
        alt_text=None
    )
    text2 = asset_to_embedding_text(asset_no_alt)
    assert text2 == "Provider: Pixabay."

@patch('sentence_transformers.SentenceTransformer')
def test_embedding_service_initialization(mock_st):
    mock_instance = MagicMock()
    mock_instance.get_sentence_embedding_dimension.return_value = 384
    mock_instance.encode.return_value = [[0.1, 0.2]]
    mock_st.return_value = mock_instance
    EmbeddingService._instance = None
    
    service = EmbeddingService()
    
    dim = service.dimension
    assert dim == 384
    # The actual call to mock_st depends on pytest execution order because of the singleton, 
    # but dimension returns correctly.
    
    vector = service.encode("test")
    assert vector == [[0.1, 0.2]]

# ---------------------------------------------------------
# VECTOR INDEXING TESTS
# ---------------------------------------------------------

@patch('app.services.vector_indexing_service.AssetVectorStore')
@patch('app.services.vector_indexing_service.EmbeddingService')
def test_vector_indexing_service(mock_embed, mock_store):
    mock_embed_instance = MagicMock()
    mock_embed_instance.dimension = 384
    mock_embed_instance.encode.return_value = [[0.1]*384, [0.2]*384]
    mock_embed.return_value = mock_embed_instance
    
    mock_store_instance = MagicMock()
    mock_store.return_value = mock_store_instance
    
    service = VectorIndexingService()
    
    asset1 = Asset(id=uuid.uuid4(), provider_name="pexels", alt_text="A", width=100, height=100)
    asset2 = Asset(id=uuid.uuid4(), provider_name="pixabay", alt_text="B", width=200, height=200)
    
    service.index_assets([asset1, asset2])
    
    mock_embed_instance.encode.assert_called_once()
    mock_store_instance.upsert_assets.assert_called_once()
    
    args, _ = mock_store_instance.upsert_assets.call_args
    assert len(args[0]) == 2 # assets
    assert len(args[1]) == 2 # vectors

# ---------------------------------------------------------
# SEMANTIC SEARCH TESTS
# ---------------------------------------------------------

@patch('app.services.semantic_search_service.AssetVectorStore')
@patch('app.services.semantic_search_service.EmbeddingService')
def test_semantic_search_service(mock_embed, mock_store):
    mock_embed_instance = MagicMock()
    mock_embed_instance.dimension = 384
    mock_embed_instance.encode.return_value = [0.1]*384
    mock_embed.return_value = mock_embed_instance
    
    mock_store_instance = MagicMock()
    # Mock Qdrant return
    asset_id_str = str(uuid.uuid4())
    mock_search_result = MagicMock()
    
    hit = MagicMock()
    hit.id = asset_id_str
    hit.score = 0.95
    
    mock_search_result.points = [hit]
    mock_store_instance.search.return_value = [{"asset_id": asset_id_str, "score": 0.95}]
    mock_store.return_value = mock_store_instance
    
    # Mock DB
    mock_db = MagicMock()
    mock_db_asset = Asset(
        id=uuid.UUID(asset_id_str), 
        provider_name="pexels", 
        provider_asset_id="123", 
        asset_url="http://test",
        alt_text="test"
    )
    mock_db.query().filter().all.return_value = [mock_db_asset]
    
    service = SemanticSearchService(mock_db)
    
    req = SemanticSearchRequest(query="test", top_k=5, orientation="landscape")
    resp = service.search(req)
    
    assert resp.query == "test"
    assert len(resp.results) == 1
    assert resp.results[0].asset.provider == "pexels"
    assert resp.results[0].asset.provider_asset_id == "123"
    assert resp.results[0].similarity == 0.95
    
    mock_store_instance.search.assert_called_with(
        query_vector=[0.1]*384,
        top_k=50,
        filters={"orientation": "landscape"}
    )

@patch('app.services.semantic_search_service.AssetVectorStore')
@patch('app.services.semantic_search_service.SemanticSearchService._retrieve_candidates')
def test_search_multi_query(mock_retrieve, mock_store):
    mock_store_instance = MagicMock()
    mock_store.return_value = mock_store_instance

    mock_db = MagicMock()
    service = SemanticSearchService(mock_db)
    
    # Mock returns from two different queries
    from app.models.asset import Asset
    
    asset_a = Asset(provider_name="pexels", provider_asset_id="A", asset_url="A", width=1920, height=1080)
    asset_a.id = uuid.uuid4()
    
    asset_b = Asset(provider_name="pixabay", provider_asset_id="B", asset_url="B", width=1920, height=1080)
    asset_b.id = uuid.uuid4()
    
    # Query 1 returns A (0.9) and B (0.7)
    # Query 2 returns A (0.8) and B (0.95)
    
    mock_retrieve.side_effect = [
        [(asset_a, 0.9), (asset_b, 0.7)],
        [(asset_a, 0.8), (asset_b, 0.95)]
    ]
    
    resp = service.search_multi_query(["q1", "q2"])
    
    assert len(resp.results) == 2
    
    # Sorted by similarity
    assert resp.results[0].asset.provider_asset_id == "B"
    assert resp.results[1].asset.provider_asset_id == "A"
