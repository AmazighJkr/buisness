import random
import string

from rest_framework.exceptions import PermissionDenied

from .models import ProjectCommand

_TRACK_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'


def generate_tracking_code():
    while True:
        code = 'EG-' + ''.join(random.choices(_TRACK_CHARS, k=6))
        if not ProjectCommand.objects.filter(tracking_code=code).exists():
            return code


def normalize_tracking_code(value):
    return (value or '').strip().upper()


def normalize_client_email(value):
    return (value or '').strip().lower()


def get_command_for_code(code):
    normalized = normalize_tracking_code(code)
    if not normalized:
        raise PermissionDenied('Tracking code required.')
    try:
        return ProjectCommand.objects.prefetch_related('messages').get(
            tracking_code__iexact=normalized,
        )
    except ProjectCommand.DoesNotExist as exc:
        raise PermissionDenied('Invalid tracking code.') from exc
