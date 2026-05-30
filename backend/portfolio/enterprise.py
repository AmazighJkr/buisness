from django.conf import settings


def enterprise_display_name():
    return getattr(settings, 'ENTERPRISE_DISPLAY_NAME', 'EmbeddedGrid')
