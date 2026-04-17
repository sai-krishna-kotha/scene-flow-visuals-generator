from django.contrib import admin
from .models import Script, Scene, ImageCandidate

class SceneInline(admin.TabularInline):
    model = Scene
    extra = 0
    readonly_fields = ('sentence_text', 'order', 'status')

class ImageCandidateInline(admin.TabularInline):
    model = ImageCandidate
    extra = 0
    readonly_fields = ('image_url', 'source', 'alt_text', 'license', 'width', 'height', 'relevance_score')

@admin.register(Script)
class ScriptAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_at')
    inlines = [SceneInline]

@admin.register(Scene)
class SceneAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'status', 'script')
    list_filter = ('status',)
    inlines = [ImageCandidateInline]

@admin.register(ImageCandidate)
class ImageCandidateAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'source', 'is_selected', 'relevance_score')
    list_filter = ('source', 'is_selected')