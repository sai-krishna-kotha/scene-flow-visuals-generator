from django.urls import path
from .views import (
    login_view, logout_view, login_page_view, 
    signup_view, signup_page_view, 
    profile_settings_view, update_password_view,
    profile_page_view  # <-- ADD THIS IMPORT
)

urlpatterns = [
    path('login/', login_page_view, name='login-page'),
    path('signup/', signup_page_view, name='signup-page'),
    path('profile/', profile_page_view, name='profile-page'), # <-- NEW Standalone HTML Route
    
    # API Targets
    path('api/login/', login_view, name='api-login'),
    path('api/signup/', signup_view, name='api-signup'),
    path('api/logout/', logout_view, name='api-logout'),
    path('api/profile/settings/', profile_settings_view, name='api-profile-settings'),
    path('api/profile/password/', update_password_view, name='api-profile-password'),
]