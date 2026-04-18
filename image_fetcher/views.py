from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from nltk import sent_tokenize
import nltk

from .models import Script, Scene
from .serializers import ScriptSerializer
from .pagination import StandardResultsSetPagination
from .tasks import find_images_for_scene

# Ensure NLTK is ready
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

class ScriptViewSet(viewsets.ModelViewSet):
    queryset = Script.objects.all().order_by('-created_at')
    serializer_class = ScriptSerializer
    pagination_class = StandardResultsSetPagination
    
    # Filters and Search (Merged from the second class)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['orientation_preference']
    search_fields = ['title']

    def create(self, request, *args, **kwargs):
        print("--- DEBUG: Entering Create Method ---")
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        script = serializer.save() 

        try:
            sentences = sent_tokenize(script.full_text)
        except Exception as e:
            return Response({"error": f"Failed to split text: {e}"}, status=status.HTTP_400_BAD_REQUEST)

        scenes_created = []
        for i, sentence_text in enumerate(sentences):
            scene = Scene.objects.create(
                script=script,
                sentence_text=sentence_text,
                order=i
            )
            scenes_created.append(scene)
        
        print(f"--- DEBUG: Created {len(scenes_created)} scenes in DB ---")
            
        for scene in scenes_created:
            print(f"--- DEBUG: Triggering Celery for Scene ID: {scene.id} ---")
            find_images_for_scene.delay(scene.id) 
            
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)