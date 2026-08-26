import logging
from typing import Optional

logger = logging.getLogger(__name__)

def calculate_semantic_score(cosine_similarity: float) -> float:
    """
    Normalizes Qdrant cosine similarity into a safe [0.0, 1.0] range.
    all-MiniLM-L6-v2 produces [-1, 1], but in practice > 0 for relevance.
    """
    return max(0.0, min(1.0, cosine_similarity))


def calculate_resolution_score(width: Optional[int], height: Optional[int]) -> float:
    """
    Tiered scoring system to reward high-resolution images without heavily 
    penalizing standard resolutions (like 1080p).
    4K+ (8MP) gets 1.0
    1080p+ (2MP) gets 0.9
    720p+ (1MP) gets 0.7
    < 720p gets 0.3
    Unknown gets 0.0
    """
    if not width or not height:
        return 0.0
    
    pixels = width * height
    
    # 4K = 3840 * 2160 = 8,294,400
    if pixels >= 8_294_400:
        return 1.0
    # 1080p = 1920 * 1080 = 2,073,600
    elif pixels >= 2_073_600:
        return 0.9
    # 720p = 1280 * 720 = 921,600
    elif pixels >= 921_600:
        return 0.7
    else:
        return 0.3


def calculate_orientation_score(requested_orientation: str, actual_width: Optional[int], actual_height: Optional[int]) -> float:
    """
    Scores the orientation match between the user's request and the actual asset.
    1.0 = exact match or requested "all"
    0.5 = partial match (e.g. square vs landscape)
    0.0 = opposite mismatch
    """
    if requested_orientation == "all":
        return 1.0
        
    if not actual_width or not actual_height:
        # We can't judge, so we give a neutral score to not heavily penalize or reward
        return 0.5
        
    # Determine actual orientation
    if actual_width > actual_height:
        actual_orientation = "landscape"
    elif actual_height > actual_width:
        actual_orientation = "portrait"
    else:
        actual_orientation = "square"
        
    if actual_orientation == requested_orientation:
        return 1.0
    elif actual_orientation == "square" or requested_orientation == "square":
        return 0.5
    else:
        return 0.0
