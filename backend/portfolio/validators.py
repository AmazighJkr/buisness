import os

from django.conf import settings
from django.core.exceptions import ValidationError


def validate_upload_extension(value):
    ext = os.path.splitext(value.name)[1].lower()
    allowed = getattr(settings, 'ALLOWED_UPLOAD_EXTENSIONS', set())
    if ext and ext not in allowed:
        raise ValidationError(
            f'File type "{ext}" is not allowed. Allowed: {", ".join(sorted(allowed))}'
        )
