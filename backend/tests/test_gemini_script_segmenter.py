import pytest
from unittest.mock import MagicMock, patch
from app.services.ai.gemini_script_segmenter import GeminiScriptSegmenter
from app.core.exceptions import GeminiError, SegmentationError
from google.genai.errors import APIError

@pytest.fixture
def mock_genai_client():
    with patch("app.services.ai.gemini_script_segmenter.genai.Client") as mock_client_class:
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        yield mock_client

@pytest.fixture
def segmenter(mock_genai_client, monkeypatch):
    monkeypatch.setattr("app.services.ai.gemini_script_segmenter.settings.GEMINI_API_KEY", "fake_key")
    return GeminiScriptSegmenter()

def test_segment_script_success(segmenter, mock_genai_client):
    mock_response = MagicMock()
    mock_response.text = '{"scenes": [{"order": 1, "title": "Test", "scene_text": "Text"}]}'
    mock_genai_client.models.generate_content.return_value = mock_response

    result = segmenter.segment_script("Some script text.")
    
    assert len(result.scenes) == 1
    assert result.scenes[0].order == 1
    assert result.scenes[0].title == "Test"
    assert result.scenes[0].scene_text == "Text"

def test_segment_script_empty_scenes(segmenter, mock_genai_client):
    mock_response = MagicMock()
    mock_response.text = '{"scenes": []}'
    mock_genai_client.models.generate_content.return_value = mock_response

    with pytest.raises(SegmentationError, match="empty scene list"):
        segmenter.segment_script("Text")

def test_segment_script_malformed_json(segmenter, mock_genai_client):
    mock_response = MagicMock()
    mock_response.text = 'not json'
    mock_genai_client.models.generate_content.return_value = mock_response

    with pytest.raises(SegmentationError, match="Malformed structured output"):
        segmenter.segment_script("Text")

def test_segment_script_api_error(segmenter, mock_genai_client):
    mock_genai_client.models.generate_content.side_effect = APIError("API failed", 500, "ERROR")

    with pytest.raises(GeminiError, match="Gemini API failure"):
        segmenter.segment_script("Text")

def test_segment_script_no_api_key(monkeypatch):
    monkeypatch.setattr("app.services.ai.gemini_script_segmenter.settings.GEMINI_API_KEY", "")
    segmenter_no_key = GeminiScriptSegmenter()
    
    with pytest.raises(GeminiError, match="not configured"):
        segmenter_no_key.segment_script("Text")
