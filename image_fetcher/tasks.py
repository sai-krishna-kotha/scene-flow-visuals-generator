from celery import shared_task
from .models import Scene, ImageCandidate
from . import services

@shared_task
def find_images_for_scene(scene_id):
    """Celery task to find and save images for a single scene."""
    try:
        scene = Scene.objects.get(id=scene_id)
        scene.status = 'PROCESSING'
        scene.save()
        orientation_pref = scene.script.orientation_preference
        print(f"!!! DEBUG: Scene {scene.id} is using orientation: '{orientation_pref}' !!!")
        keywords = services.extract_keywords(scene.sentence_text)
        if not keywords:
            scene.status = 'FAILED'
            scene.save()
            return f"Scene {scene_id}: No keywords found."
            
        query = " ".join(keywords)

        all_candidates = []
        print(f"Searching Pexels for: {query} (Orientation: {orientation_pref})")
        all_candidates.extend(services.search_pexels(query, orientation=orientation_pref))
        
        print(f"Searching Pixabay for: {query} (Orientation: {orientation_pref})")
        all_candidates.extend(services.search_pixabay(query, orientation=orientation_pref))
        
        print(f"Searching Openverse for: {query} (Orientation: {orientation_pref})")
        all_candidates.extend(services.search_openverse(query, orientation=orientation_pref))
    
        if not all_candidates:
            scene.status = 'FAILED'
            scene.save()
            return f"Scene {scene_id}: No images found for query '{query}'."

        created_count = 0
        for cand_data in all_candidates:
            score = services.score_image(scene.sentence_text, cand_data)
            ImageCandidate.objects.create(
                scene=scene,
                source=cand_data['source'],
                image_url=cand_data['image_url'],
                alt_text=cand_data['alt_text'],
                license=cand_data['license'],
                width=cand_data['width'],
                height=cand_data['height'],
                relevance_score=score
            )
            created_count += 1
        
        scene.status = 'COMPLETE'
        scene.save()
        return f"Processed scene {scene_id}. Found {created_count} images."

    except Scene.DoesNotExist:
        return f"Scene {scene_id} not found."
    except Exception as e:
        # Handle failures
        if 'scene' in locals():
            scene.status = 'FAILED'
            scene.save()
        return f"Failed to process scene {scene_id}: {str(e)}"