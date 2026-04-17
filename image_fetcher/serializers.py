from rest_framework import serializers
from .models import Script, Scene, ImageCandidate

class ImageCandidateSerializer(serializers.ModelSerializer):
    orientation = serializers.SerializerMethodField()
    quality_tier = serializers.SerializerMethodField()

    class Meta:
        model = ImageCandidate
        fields = [
            'id', 
            'source', 
            'image_url', 
            'alt_text', 
            'license', 
            'width', 
            'height',
            'orientation',
            'quality_tier',
            'relevance_score', 
            'is_selected'
        ]

    def get_orientation(self, obj):
        if not obj.width or not obj.height:
            return "unknown"
        if obj.width > obj.height:
            return "landscape"
        if obj.height > obj.width:
            return "portrait"
        return "square"

    def get_quality_tier(self, obj):
        if not obj.width or not obj.height:
            return "unknown"
        
        pixels = obj.width * obj.height
        
        UHD_4K = 3840 * 2160
        FULL_HD = 1920 * 1080
        HD = 1280 * 720
        SD = 640 * 480

        if pixels >= UHD_4K:
            return "4K (Ultra HD)"
        if pixels >= FULL_HD:
            return "Full HD (1080p)"
        if pixels >= HD:
            return "HD (720p)"
        if pixels >= SD:
            return "Standard Definition (SD)"
        
        return "Low Resolution"


class SceneSerializer(serializers.ModelSerializer):
    candidates = ImageCandidateSerializer(many=True, read_only=True)
    
    class Meta:
        model = Scene
        fields = ['id', 'sentence_text', 'order', 'status', 'candidates']

class ScriptSerializer(serializers.ModelSerializer):
    scenes = SceneSerializer(many=True, read_only=True)
    
    class Meta:
        model = Script
        fields = ['id', 'title', 'full_text', 'orientation_preference', 'created_at', 'scenes']
        read_only_fields = ['scenes', 'created_at']
        extra_kwargs = {
            'full_text': {'write_only': True}
        }