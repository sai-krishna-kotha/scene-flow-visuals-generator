from django.contrib import admin
from django.urls import path, include
from ai_tools import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path("", views.index),
    path('project/<int:pk>/', views.storyboard_detail),
    path('api/', include('image_fetcher.urls')), 
]