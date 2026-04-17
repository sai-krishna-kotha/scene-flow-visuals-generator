from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Script, Scene
from .serializers import ScriptSerializer
import nltk
from nltk import sent_tokenize
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Script
from .serializers import ScriptSerializer
from .pagination import StandardResultsSetPagination
from .tasks import find_images_for_scene
from django.shortcuts import render

try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    print("Downloading NLTK 'punkt' tokenizer...")
    nltk.download('punkt', quiet=True)

class ScriptViewSet(viewsets.ModelViewSet):
    """
    API endpoint to CREATE, LIST, and RETRIEVE Scripts.
    """
    queryset = Script.objects.all().order_by('-created_at')
    serializer_class = ScriptSerializer
    pagination_class = StandardResultsSetPagination

    def create(self, request, *args, **kwargs):
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
            
        for scene in scenes_created:
            find_images_for_scene.delay(scene.id) 
            
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class ScriptViewSet(viewsets.ModelViewSet):
    queryset = Script.objects.all().order_by('-created_at')
    serializer_class = ScriptSerializer
    pagination_class = StandardResultsSetPagination
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['orientation_preference']
    search_fields = ['title']
    
