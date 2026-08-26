import asyncio
import os
import sys

# Ensure backend directory is in the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.services.providers.asset_search_service import AssetSearchService

async def main():
    print("=======================================")
    print(" REAL-PROVIDER SMOKE TEST (PHASE 5) ")
    print("=======================================")
    
    if not settings.PEXELS_API_KEY or not settings.PIXABAY_API_KEY or not settings.OPENVERSE_CLIENT_ID:
        print("WARNING: Some API keys are missing in .env.")
        print("Tests for missing providers will likely return empty or failed status.")
        
    print("\nInitializing AssetSearchService...")
    service = AssetSearchService()
    
    query = "beautiful sunrise landscape"
    print(f"\nExecuting concurrent search for query: '{query}'...")
    
    unique_candidates, statuses = await service.search_and_aggregate(query=query, orientation="landscape", limit_per_provider=5)
    
    print("\n--- Provider Statuses ---")
    for provider, status in statuses.items():
        print(f" - {provider.capitalize()}: {status.upper()}")
        
    print(f"\nTotal deduplicated candidates found: {len(unique_candidates)}")
    
    if unique_candidates:
        first = unique_candidates[0]
        print(f"\n--- First Result Sample ---")
        print(f"Provider: {first.provider}")
        print(f"ID: {first.provider_asset_id}")
        print(f"Dimensions: {first.width}x{first.height}")
        print(f"Image URL: {first.image_url}")
        print(f"Alt Text: {first.alt_text}")
    
    print("\nSmoke test completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
