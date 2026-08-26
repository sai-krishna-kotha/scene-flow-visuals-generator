from pydantic import BaseModel
from typing import Optional

class RankingFeatures(BaseModel):
    semantic_score: float
    resolution_score: float
    orientation_score: float
    final_score: float

    # Raw metrics for explainability / tie-breaking
    width: Optional[int] = None
    height: Optional[int] = None
    pixels: int = 0
