import os

from django.apps import AppConfig


class PortfolioConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'portfolio'

    def ready(self):
        from django.conf import settings

        os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
