from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.schemas.ai import SceneAnalysisResponse
from app.repositories.scene_repository import SceneRepository
from app.repositories.script_repository import ScriptRepository
from app.services.scene_service import SceneService
from app.services.ai.gemini_service import GeminiSceneAnalyzer

router = APIRouter()

def get_scene_service(db: Session = Depends(get_db)) -> SceneService:
    repo = SceneRepository(db)
    script_repo = ScriptRepository(db)
    return SceneService(repo, script_repo)

def get_gemini_service() -> GeminiSceneAnalyzer:
    return GeminiSceneAnalyzer()

@router.post("/scenes/{scene_id}/analyze", response_model=SceneAnalysisResponse)
def analyze_scene(
    scene_id: uuid.UUID, 
    scene_service: SceneService = Depends(get_scene_service),
    gemini_service: GeminiSceneAnalyzer = Depends(get_gemini_service)
):
    scene = scene_service.get_scene(scene_id)
    analysis = gemini_service.analyze_scene(scene.sentence_text)
    
    return SceneAnalysisResponse(
        scene_id=str(scene_id),
        analysis=analysis
    )
