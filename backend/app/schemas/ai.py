from pydantic import BaseModel, Field

class SceneAnalysis(BaseModel):
    summary: str = Field(description="A concise summary of the scene.")
    subjects: list[str] = Field(description="Primary subjects/entities in the scene.")
    actions: list[str] = Field(description="Visible actions occurring in the scene.")
    environment: list[str] = Field(description="The environment or location of the scene.")
    mood: str = Field(description="The emotional tone or mood of the scene.")
    time_context: str = Field(description="The time of day or temporal context.")
    visual_queries: list[str] = Field(description="Concise visual-search queries optimized for stock footage retrieval.")

class SceneAnalysisResponse(BaseModel):
    scene_id: str
    analysis: SceneAnalysis

class SceneSegment(BaseModel):
    order: int
    title: str
    scene_text: str

class ScriptSegmentation(BaseModel):
    scenes: list[SceneSegment]
