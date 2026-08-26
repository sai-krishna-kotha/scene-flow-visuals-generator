import pytest
from typing import Optional
from app.models.asset import Asset
from app.services.ranking.ranking_service import RankingService
from app.services.ranking.scoring import (
    calculate_semantic_score,
    calculate_resolution_score,
    calculate_orientation_score
)

def create_mock_asset(asset_id: str, width: Optional[int], height: Optional[int], provider: str = "test", provider_id: str = "test_id") -> Asset:
    asset = Asset(provider_name=provider, provider_asset_id=provider_id)
    asset.id = asset_id # Mocking UUID string for test purposes
    asset.width = width
    asset.height = height
    return asset

# --- Unit Tests for Pure Scoring Functions ---

def test_semantic_score_normalization():
    assert calculate_semantic_score(0.8) == 0.8
    assert calculate_semantic_score(1.5) == 1.0
    assert calculate_semantic_score(-0.2) == 0.0

def test_resolution_score_tiered():
    assert calculate_resolution_score(3840, 2160) == 1.0 # 4K
    assert calculate_resolution_score(1920, 1080) == 0.9 # 1080p
    assert calculate_resolution_score(1280, 720) == 0.7  # 720p
    assert calculate_resolution_score(800, 600) == 0.3   # Low res
    assert calculate_resolution_score(None, None) == 0.0 # Unknown

def test_orientation_score():
    assert calculate_orientation_score("all", 1920, 1080) == 1.0
    assert calculate_orientation_score("landscape", 1920, 1080) == 1.0
    assert calculate_orientation_score("portrait", 1080, 1920) == 1.0
    assert calculate_orientation_score("square", 1080, 1080) == 1.0
    
    # Partial matches
    assert calculate_orientation_score("landscape", 1080, 1080) == 0.5
    assert calculate_orientation_score("square", 1920, 1080) == 0.5
    
    # Mismatches
    assert calculate_orientation_score("landscape", 1080, 1920) == 0.0
    assert calculate_orientation_score("portrait", 1920, 1080) == 0.0

# --- Integration Tests for RankingService ---

def test_ranking_service_deterministic_sort():
    service = RankingService()
    
    a1 = create_mock_asset("1", 3840, 2160, "p1", "id1") # 4K, sim 0.5
    a2 = create_mock_asset("2", 1920, 1080, "p1", "id2") # 1080p, sim 0.8
    a3 = create_mock_asset("3", 3840, 2160, "p1", "id3") # 4K, sim 0.8
    
    assets = [a1, a2, a3]
    similarities = [0.5, 0.8, 0.8]
    
    ranked = service.rank(assets, similarities, requested_orientation="all", final_k=3)
    
    assert len(ranked) == 3
    # a3 should be first (sim=0.8, res=4K)
    # a2 should be second (sim=0.8, res=1080p)
    # a1 should be third (sim=0.5, res=4K)
    assert ranked[0][0].id == "3"
    assert ranked[1][0].id == "2"
    assert ranked[2][0].id == "1"

def test_ranking_service_orientation_mismatch():
    service = RankingService()
    
    # Requesting landscape
    a1 = create_mock_asset("1", 1080, 1920) # Portrait, sim 0.9
    a2 = create_mock_asset("2", 1920, 1080) # Landscape, sim 0.7
    
    assets = [a1, a2]
    similarities = [0.9, 0.7]
    
    ranked = service.rank(assets, similarities, requested_orientation="landscape", final_k=2)
    
    # a1 score: (0.7 * 0.9) + (0.15 * 0.9) + (0.15 * 0.0) = 0.63 + 0.135 = 0.765
    # a2 score: (0.7 * 0.7) + (0.15 * 0.9) + (0.15 * 1.0) = 0.49 + 0.135 + 0.15 = 0.775
    # a2 should win despite lower similarity because it matches orientation
    assert ranked[0][0].id == "2"
    assert ranked[1][0].id == "1"

def test_ranking_service_tie_breaker():
    service = RankingService()
    
    a1 = create_mock_asset("1", 1920, 1080, "A_provider", "123")
    a2 = create_mock_asset("2", 1920, 1080, "B_provider", "123")
    
    assets = [a1, a2]
    similarities = [0.8, 0.8]
    
    ranked = service.rank(assets, similarities, requested_orientation="all", final_k=2)
    
    # Scores are identical. Tie breaker on provider_name ascending
    assert ranked[0][0].id == "1"
    assert ranked[1][0].id == "2"
