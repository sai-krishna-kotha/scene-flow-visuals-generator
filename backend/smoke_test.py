from app.services.ai.gemini_service import GeminiSceneAnalyzer
from app.config import settings

def main():
    if not settings.GEMINI_API_KEY:
        print("GEMINI_API_KEY is not set. Skipping smoke test.")
        return

    print("Running Gemini smoke test...")
    analyzer = GeminiSceneAnalyzer()
    
    test_scene = "A tired software engineer walks into an empty office at 2 AM, opens his laptop and stares at a dashboard."
    
    try:
        result = analyzer.analyze_scene(test_scene)
        print("\n--- Smoke Test Result ---")
        print(f"Summary: {result.summary}")
        print(f"Subjects: {result.subjects}")
        print(f"Actions: {result.actions}")
        print(f"Environment: {result.environment}")
        print(f"Mood: {result.mood}")
        print(f"Time Context: {result.time_context}")
        print(f"Visual Queries: {result.visual_queries}")
        print("-------------------------")
        print("Smoke test completed successfully!")
    except Exception as e:
        print(f"Smoke test failed: {e}")

if __name__ == "__main__":
    main()
