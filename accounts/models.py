from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    pexels_api_key = models.CharField(max_length=255, blank=True, null=True)
    pixabay_api_key = models.CharField(max_length=255, blank=True, null=True)
    default_orientation = models.CharField(max_length=20, default='all')

    def __str__(self):
        return f"{self.user.username}'s Profile"

# SIGNALS: Automatically create and link UserProfile when a User is created
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()