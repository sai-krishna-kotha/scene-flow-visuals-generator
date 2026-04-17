from django.db import models
from django.contrib.auth.models import User

class Script(models.Model):
    """A single transcript or text submitted by a user."""
    title = models.CharField(max_length=255, help_text="A title for this script")
    full_text = models.TextField(help_text="The complete transcript or text")
    created_at = models.DateTimeField(auto_now_add=True)

    ORIENTATION_CHOICES = [
        ('all', 'All Orientations'),
        ('landscape', 'Landscape'),
        ('portrait', 'Portrait'),
    ]
    orientation_preference = models.CharField(
        max_length=10,
        choices=ORIENTATION_CHOICES,
        default='all',
        help_text="Image orientation preference for this script"
    )
    
    def __str__(self):
        return self.title

class Scene(models.Model):
    """A single sentence or part of a script."""
    script = models.ForeignKey(Script, related_name='scenes', on_delete=models.CASCADE)
    sentence_text = models.TextField()
    order = models.PositiveIntegerField(help_text="To keep the sentences in order")
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETE', 'Complete'),
        ('FAILED', 'Failed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Scene {self.order} for '{self.script.title}'"

class ImageCandidate(models.Model):
    """An image found from an API for a specific scene."""
    scene = models.ForeignKey(Scene, related_name='candidates', on_delete=models.CASCADE)
    source = models.CharField(max_length=50, help_text="'unsplash', 'pexels', 'pixabay', etc.")
    image_url = models.URLField(max_length=1024)
    alt_text = models.TextField(blank=True, null=True)
    license = models.CharField(max_length=100, blank=True, null=True)
    width = models.PositiveIntegerField(null=True)
    height = models.PositiveIntegerField(null=True)
    
    relevance_score = models.FloatField(default=0.0)
    
    is_selected = models.BooleanField(default=False) 

    def __str__(self):
        return f"{self.source} image for scene {self.scene.order} (Score: {self.relevance_score})"