import random
import string
import uuid

from django.db.models import Q
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


def _command_queryset():
    return ProjectCommand.objects.prefetch_related('messages')


def get_command_for_code(code):
    normalized = normalize_tracking_code(code)
    if not normalized:
        raise PermissionDenied('Tracking code required.')
    try:
        return _command_queryset().get(tracking_code__iexact=normalized)
    except ProjectCommand.DoesNotExist as exc:
        raise PermissionDenied('Invalid tracking code.') from exc


def commands_for_user(user):
    if not user or not user.is_authenticated:
        return ProjectCommand.objects.none()
    owned = Q(user=user)
    if user.email:
        owned |= Q(client_email__iexact=user.email.strip().lower(), user__isnull=True)
    return _command_queryset().filter(owned).distinct().order_by('-created_at')


def user_owns_command(user, command):
    if not user or not user.is_authenticated or not command:
        return False
    if command.user_id and command.user_id == user.id:
        return True
    email = (user.email or '').strip().lower()
    if email and (command.client_email or '').strip().lower() == email:
        return command.user_id is None or command.user_id == user.id
    return False


def get_command_for_user(user, command_id):
    try:
        pk = uuid.UUID(str(command_id))
    except (TypeError, ValueError) as exc:
        raise PermissionDenied('Invalid command id.') from exc
    try:
        command = commands_for_user(user).get(pk=pk)
    except ProjectCommand.DoesNotExist as exc:
        raise PermissionDenied('Command not found.') from exc
    return command
