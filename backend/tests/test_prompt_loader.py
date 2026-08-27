"""
Tests for the AI prompt loading system.

Covers:
- prompt files load successfully
- placeholder substitution works correctly
- scene text / script text reach the Gemini call
- missing file raises FileNotFoundError clearly
- unresolved placeholders are caught
- prompt content assertions (conceptual checks)
- existing GeminiSceneAnalyzer and GeminiScriptSegmenter behavior preserved
"""
import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.services.ai.prompt_loader import load_prompt, load_prompt_cached, render_prompt, PROMPT_DIR


# ---------------------------------------------------------------------------
# 1. Prompt file loading
# ---------------------------------------------------------------------------

def test_scene_analysis_prompt_loads():
    """scene_analysis.md must exist and return a non-empty string."""
    content = load_prompt("scene_analysis.md")
    assert isinstance(content, str)
    assert len(content) > 100, "Prompt file appears to be empty or too short"


def test_script_segmentation_prompt_loads():
    """script_segmentation.md must exist and return a non-empty string."""
    content = load_prompt("script_segmentation.md")
    assert isinstance(content, str)
    assert len(content) > 100


def test_missing_prompt_raises_file_not_found():
    """load_prompt must fail clearly for a file that does not exist."""
    with pytest.raises(FileNotFoundError, match="Prompt file not found"):
        load_prompt("nonexistent_prompt_xyz.md")


def test_cached_loader_returns_same_result():
    """load_prompt_cached should return the same result as load_prompt."""
    direct = load_prompt("scene_analysis.md")
    cached = load_prompt_cached("scene_analysis.md")
    assert direct == cached


# ---------------------------------------------------------------------------
# 2. Placeholder rendering
# ---------------------------------------------------------------------------

def test_render_prompt_single_placeholder():
    template = "Analyze this: {{SCENE_TEXT}}"
    result = render_prompt(template, SCENE_TEXT="A sunset over the ocean.")
    assert result == "Analyze this: A sunset over the ocean."
    assert "{{SCENE_TEXT}}" not in result


def test_render_prompt_multiple_placeholders():
    template = "{{KEY_A}} and {{KEY_B}} done."
    result = render_prompt(template, KEY_A="alpha", KEY_B="beta")
    assert result == "alpha and beta done."


def test_render_prompt_no_placeholder_left():
    template = "Hello {{SCENE_TEXT}} world"
    result = render_prompt(template, SCENE_TEXT="test")
    assert "{{" not in result and "}}" not in result


def test_scene_text_injected_into_scene_analysis_prompt():
    """SCENE_TEXT placeholder must be replaced in scene_analysis.md."""
    scene_text = "A lone astronaut floats in silence."
    template = load_prompt("scene_analysis.md")
    rendered = render_prompt(template, SCENE_TEXT=scene_text)
    assert scene_text in rendered
    assert "{{SCENE_TEXT}}" not in rendered


def test_script_text_injected_into_segmentation_prompt():
    """SCRIPT_TEXT placeholder must be replaced in script_segmentation.md."""
    script_text = "INT. OFFICE - DAY\nA developer stares at a screen."
    template = load_prompt("script_segmentation.md")
    rendered = render_prompt(template, SCRIPT_TEXT=script_text)
    assert script_text in rendered
    assert "{{SCRIPT_TEXT}}" not in rendered


# ---------------------------------------------------------------------------
# 3. Prompt content assertions (conceptual checks, not exact wording)
# ---------------------------------------------------------------------------

def test_scene_analysis_prompt_mentions_visual_search():
    content = load_prompt("scene_analysis.md").lower()
    assert "visual" in content


def test_scene_analysis_prompt_mentions_subjects():
    content = load_prompt("scene_analysis.md").lower()
    assert "subject" in content


def test_scene_analysis_prompt_mentions_actions():
    content = load_prompt("scene_analysis.md").lower()
    assert "action" in content


def test_scene_analysis_prompt_mentions_environment():
    content = load_prompt("scene_analysis.md").lower()
    assert "environment" in content


def test_scene_analysis_prompt_mentions_mood():
    content = load_prompt("scene_analysis.md").lower()
    assert "mood" in content


def test_scene_analysis_prompt_mentions_time():
    content = load_prompt("scene_analysis.md").lower()
    assert "time" in content


def test_scene_analysis_prompt_mentions_queries():
    content = load_prompt("scene_analysis.md").lower()
    assert "quer" in content  # "queries" or "query"


def test_scene_analysis_prompt_prohibits_invention():
    content = load_prompt("scene_analysis.md").lower()
    assert "invent" in content or "not present" in content or "do not" in content


def test_segmentation_prompt_mentions_scene_order():
    content = load_prompt("script_segmentation.md").lower()
    assert "order" in content


def test_segmentation_prompt_mentions_visual_coherence():
    content = load_prompt("script_segmentation.md").lower()
    assert "visual" in content


def test_segmentation_prompt_prohibits_invention():
    content = load_prompt("script_segmentation.md").lower()
    assert "invent" in content or "do not" in content


def test_segmentation_prompt_mentions_preserve():
    content = load_prompt("script_segmentation.md").lower()
    assert "preserv" in content  # "preserve" / "preserved"


def test_segmentation_prompt_mentions_location_or_time():
    content = load_prompt("script_segmentation.md").lower()
    assert "location" in content or "time" in content


def test_segmentation_prompt_mentions_no_one_sentence_per_scene():
    content = load_prompt("script_segmentation.md").lower()
    assert "sentence" in content


# ---------------------------------------------------------------------------
# 4. GeminiSceneAnalyzer sends rendered prompt to Gemini
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_scene_client():
    with patch("app.services.ai.gemini_service.genai.Client") as mock_cls:
        mock_client = MagicMock()
        mock_cls.return_value = mock_client
        yield mock_client


@pytest.fixture
def scene_analyzer(mock_scene_client, monkeypatch):
    monkeypatch.setattr("app.services.ai.gemini_service.settings.GEMINI_API_KEY", "fake-key")
    from app.services.ai.gemini_service import GeminiSceneAnalyzer
    return GeminiSceneAnalyzer()


def test_scene_analyzer_injects_scene_text_into_prompt(scene_analyzer, mock_scene_client):
    """The actual Gemini call must contain the scene text, not the placeholder."""
    mock_response = MagicMock()
    mock_response.text = (
        '{"summary":"s","subjects":["a"],"actions":["b"],'
        '"environment":["c"],"mood":"d","time_context":"e","visual_queries":["f"]}'
    )
    mock_scene_client.models.generate_content.return_value = mock_response

    scene_text = "A beautiful sunset over the ocean."
    scene_analyzer.analyze_scene(scene_text)

    call_kwargs = mock_scene_client.models.generate_content.call_args
    prompt_sent = call_kwargs.kwargs.get("contents") or call_kwargs.args[1]
    assert scene_text in prompt_sent
    assert "{{SCENE_TEXT}}" not in prompt_sent


def test_scene_analyzer_no_unresolved_placeholder(scene_analyzer, mock_scene_client):
    """No {{...}} placeholders should reach Gemini."""
    mock_response = MagicMock()
    mock_response.text = (
        '{"summary":"s","subjects":["a"],"actions":["b"],'
        '"environment":["c"],"mood":"d","time_context":"e","visual_queries":["f"]}'
    )
    mock_scene_client.models.generate_content.return_value = mock_response

    scene_analyzer.analyze_scene("Some scene text.")

    call_kwargs = mock_scene_client.models.generate_content.call_args
    prompt_sent = call_kwargs.kwargs.get("contents") or call_kwargs.args[1]
    assert "{{" not in prompt_sent


# ---------------------------------------------------------------------------
# 5. GeminiScriptSegmenter sends rendered prompt to Gemini
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_segmenter_client():
    with patch("app.services.ai.gemini_script_segmenter.genai.Client") as mock_cls:
        mock_client = MagicMock()
        mock_cls.return_value = mock_client
        yield mock_client


@pytest.fixture
def segmenter(mock_segmenter_client, monkeypatch):
    monkeypatch.setattr("app.services.ai.gemini_script_segmenter.settings.GEMINI_API_KEY", "fake-key")
    from app.services.ai.gemini_script_segmenter import GeminiScriptSegmenter
    return GeminiScriptSegmenter()


def test_segmenter_injects_script_text_into_prompt(segmenter, mock_segmenter_client):
    """The actual Gemini call must contain the script text, not the placeholder."""
    mock_response = MagicMock()
    mock_response.text = '{"scenes": [{"order": 1, "title": "Scene 1", "scene_text": "Some text."}]}'
    mock_segmenter_client.models.generate_content.return_value = mock_response

    script_text = "INT. OFFICE - DAY\nA developer stares at a glowing screen."
    segmenter.segment_script(script_text)

    call_kwargs = mock_segmenter_client.models.generate_content.call_args
    prompt_sent = call_kwargs.kwargs.get("contents") or call_kwargs.args[1]
    assert script_text in prompt_sent
    assert "{{SCRIPT_TEXT}}" not in prompt_sent


def test_segmenter_no_unresolved_placeholder(segmenter, mock_segmenter_client):
    """No {{...}} placeholders should reach Gemini during segmentation."""
    mock_response = MagicMock()
    mock_response.text = '{"scenes": [{"order": 1, "title": "A", "scene_text": "B"}]}'
    mock_segmenter_client.models.generate_content.return_value = mock_response

    segmenter.segment_script("Full script text here.")

    call_kwargs = mock_segmenter_client.models.generate_content.call_args
    prompt_sent = call_kwargs.kwargs.get("contents") or call_kwargs.args[1]
    assert "{{" not in prompt_sent
