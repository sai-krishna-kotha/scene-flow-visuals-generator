from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated  # NEW IMPORT
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
    serializer_class = ScriptSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated]  # LOCK: Enforces that the user must be logged in
    
    # Filters and Search
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['orientation_preference']
    search_fields = ['title']

    def get_queryset(self):
        """
        DATA ISOLATION: Overriding the default queryset so users can ONLY 
        see and access their own created scripts.
        """
        if self.request.user.is_authenticated:
            return Script.objects.filter(user=self.request.user).order_by('-created_at')
        return Script.objects.none()

    def create(self, request, *args, **kwargs):
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # FIX: Pass the logged-in user instance into the save method
        script = serializer.save(user=self.request.user) 

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