from typing import List, Optional
import logging

from app.models.asset import Asset
from app.schemas.ranking import RankingFeatures
from app.services.ranking.scoring import (
    calculate_semantic_score,
    calculate_resolution_score,
    calculate_orientation_score
)

logger = logging.getLogger(__name__)

class RankingService:
    # 70% Semantic, 15% Resolution, 15% Orientation
    WEIGHT_SEMANTIC = 0.70
    WEIGHT_RESOLUTION = 0.15
    WEIGHT_ORIENTATION = 0.15

    def rank(
        self,
        assets: List[Asset],
        similarities: List[float],
        requested_orientation: str = "all",
        final_k: int = 10
    ) -> List[tuple[Asset, RankingFeatures]]:
        """
        Ranks candidate assets using a deterministic heuristic algorithm.
        Returns a sorted list of (Asset, RankingFeatures) tuples trimmed to final_k.
        """
        if len(assets) != len(similarities):
            raise ValueError("Assets and similarities lists must have the same length.")

        scored_candidates = []

        for asset, sim in zip(assets, similarities):
            # 1. Calculate pure component scores [0.0, 1.0]
            semantic_score = calculate_semantic_score(sim)
            resolution_score = calculate_resolution_score(asset.width, asset.height)
            orientation_score = calculate_orientation_score(requested_orientation, asset.width, asset.height)

            # 2. Calculate weighted final score
            final_score = (
                (self.WEIGHT_SEMANTIC * semantic_score) +
                (self.WEIGHT_RESOLUTION * resolution_score) +
                (self.WEIGHT_ORIENTATION * orientation_score)
            )

            # 3. Create features object for explainability
            pixels = (asset.width or 0) * (asset.height or 0)
            
            features = RankingFeatures(
                semantic_score=round(semantic_score, 4),
                resolution_score=round(resolution_score, 4),
                orientation_score=round(orientation_score, 4),
                final_score=round(final_score, 4),
                width=asset.width,
                height=asset.height,
                pixels=pixels
            )

            scored_candidates.append((asset, features))

        # 4. Sort deterministically using the defined tie-breaker sequence
        # Sequence:
        # 1. final_score (DESC)
        # 2. semantic_score (DESC)
        # 3. pixels (DESC)
        # 4. provider_name (ASC)
        # 5. provider_asset_id (ASC)
        
        # Since Python's sort is stable and we can't easily mix DESC and ASC in a single lambda for strings,
        # we can use negative signs for numeric DESC and normal for ASC.
        
        scored_candidates.sort(
            key=lambda x: (
                -x[1].final_score,
                -x[1].semantic_score,
                -x[1].pixels,
                x[0].provider_name or "",
                x[0].provider_asset_id or ""
            )
        )

        return scored_candidates[:final_k]
