# accounts/urls.py
from django.urls import path
from .views import login_view, logout_view, login_page_view, signup_view, signup_page_view, dynamic_profile_view

urlpatterns = [
    path('login/', login_page_view, name='login-page'),
    path('signup/', signup_page_view, name='signup-page'),
    path('api/login/', login_view, name='api-login'),
    path('api/signup/', signup_view, name='api-signup'),
    path('api/logout/', logout_view, name='api-logout'),
    
    path('api/profile/', dynamic_profile_view, name='api-profile'), # <-- ADD THIS LINE
]