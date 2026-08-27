from app.schemas.ai import ScriptSegmentation
from app.config import settings
from app.core.exceptions import GeminiError, SegmentationError
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

        prompt = f"""
You are an expert visual director and storyboard artist.
Divide the following script into coherent visual scenes for the purpose of visual storyboard creation.

Rules:
- Preserve the original story content.
- Do not summarize away important visual details.
- Do not invent events or dialogue.
- Split when there is a meaningful change in location, time, action, narrative beat, or major visual context.
- Keep scenes visually coherent.
- Preserve the scene order exactly as it flows in the script.
- Return the full scene text for each segment exactly as it appears in the script as appropriate.
- Avoid creating one scene per sentence unless the script genuinely requires it.
- Provide a short, descriptive `title` for each scene.

Do not output anything outside of the requested JSON structure.

Script text:
"{script_text}"
"""
        
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
