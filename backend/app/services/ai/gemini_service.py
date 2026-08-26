from app.schemas.ai import SceneAnalysis
from app.config import settings
from google import genai
from google.genai import types
from google.genai.errors import APIError
from fastapi import HTTPException
import json

class GeminiSceneAnalyzer:
    def __init__(self):
        if not settings.GEMINI_API_KEY:
            # We allow initialization without key for tests, but it will fail on call
            self.client = None
        else:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model_name = settings.GEMINI_MODEL

    def analyze_scene(self, scene_text: str) -> SceneAnalysis:
        if not self.client:
            raise HTTPException(status_code=500, detail="Gemini API key is not configured.")

        prompt = f"""
You are an expert visual director and storyboard artist.
Analyze the following scene text for the specific purpose of visual stock asset retrieval.

Identify the primary subjects, visible actions, environment/location, emotional tone/mood, and time/day context.
Then, generate a list of concise visual-search queries (e.g., "developer working late laptop", "empty office at night") optimized for stock footage retrieval.

Do not generate images. Do not search the web. Do not output anything outside of the requested JSON structure.

Scene text:
"{scene_text}"
"""
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=SceneAnalysis,
                ),
            )
            
            # The structured output should be parseable directly into our Pydantic model
            if not response.text:
                raise HTTPException(status_code=500, detail="Received empty response from Gemini.")
                
            try:
                data = json.loads(response.text)
                return SceneAnalysis(**data)
            except (json.JSONDecodeError, ValueError) as e:
                raise HTTPException(status_code=502, detail=f"Malformed structured output from Gemini: {e}")
                
        except APIError as e:
            # Catch GenAI specific API errors
            raise HTTPException(status_code=502, detail=f"Gemini API failure: {e.message}")
        except Exception as e:
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(status_code=500, detail=f"Unexpected error during Gemini analysis: {str(e)}")
