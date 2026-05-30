import os

from django.apps import AppConfig


class PortfolioConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'portfolio'

    def ready(self):
        from django.conf import settings

        media_root = settings.MEDIA_ROOT
        os.makedirs(media_root, exist_ok=True)
        # Fail fast on Render if media dir is not writable.
        test_file = os.path.join(media_root, '.write_test')
        try:
            with open(test_file, 'w', encoding='utf-8') as handle:
                handle.write('ok')
            os.remove(test_file)
        except OSError:
            import logging

            logging.getLogger(__name__).error(
                'MEDIA_ROOT is not writable: %s — set CLOUDINARY_URL on Render.',
                media_root,
            )
