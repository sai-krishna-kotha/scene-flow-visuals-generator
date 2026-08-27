from app.schemas.ai import ScriptSegmentation
from app.config import settings
from app.core.exceptions import GeminiError, SegmentationError
from app.services.ai.prompt_loader import load_prompt_cached, render_prompt
from google import genai
from google.genai import types
from google.genai.errors import APIError
import json

class GeminiScriptSegmenter:
    def __init__(self):
        if not settings.GEMINI_API_KEY:
            self.client = None
        else:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model_name = settings.GEMINI_MODEL

    def segment_script(self, script_text: str) -> ScriptSegmentation:
        if not self.client:
            raise GeminiError("Gemini API key is not configured.")

        prompt_template = load_prompt_cached("script_segmentation.md")
        prompt = render_prompt(prompt_template, SCRIPT_TEXT=script_text)

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ScriptSegmentation,
                ),
            )
            
            if not response.text:
                raise GeminiError("Received empty response from Gemini.")
                
            try:
                data = json.loads(response.text)
                segmentation = ScriptSegmentation(**data)
                if not segmentation.scenes:
                     raise SegmentationError("Gemini returned an empty scene list.")
                return segmentation
            except (json.JSONDecodeError, ValueError) as e:
                raise SegmentationError(f"Malformed structured output from Gemini: {e}")
                
        except APIError as e:
            raise GeminiError(f"Gemini API failure: {e.message}")
        except Exception as e:
            if isinstance(e, (GeminiError, SegmentationError)):
                raise
            raise GeminiError(f"Unexpected error during script segmentation: {str(e)}")
