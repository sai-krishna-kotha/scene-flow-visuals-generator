from pydantic import BaseModel
from typing import Optional

class RankingFeatures(BaseModel):
    semantic_score: Optional[float] = None
    resolution_score: Optional[float] = None
    orientation_score: Optional[float] = None
    final_score: Optional[float] = None

    # Raw metrics for explainability / tie-breaking
    width: Optional[int] = None
    height: Optional[int] = None
    pixels: int = 0
