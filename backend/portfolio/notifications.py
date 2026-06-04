"""Optional email notifications (requires EMAIL_* env on Render)."""

import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _can_send() -> bool:
    return bool(getattr(settings, 'DEFAULT_FROM_EMAIL', None))


def notify_command_created(command) -> None:
    if not _can_send():
        return
    from .models import ProjectCommand

    if not isinstance(command, ProjectCommand):
        return

    layers = command.selected_layers or []
    layer_lines = '\n'.join(
        f"  - {row.get('name', row.get('slug', '?'))}: {row.get('price_usd', '?')} USD"
        for row in layers
    ) or '  (none)'
    body = (
        f'Tracking code: {command.tracking_code}\n'
        f'Project: {command.project_title}\n'
        f'Email: {command.email}\n\n'
        f'Layers:\n{layer_lines}\n\n'
        f'Estimated total: {command.estimated_total_usd} USD / {command.estimated_total_dzd} DZD\n'
    )
    client_subject = f'[{settings.ENTERPRISE_DISPLAY_NAME}] Command received — {command.tracking_code}'
    try:
        send_mail(
            client_subject,
            body + '\nWe will review your request and respond soon.',
            settings.DEFAULT_FROM_EMAIL,
            [command.email],
            fail_silently=True,
        )
    except Exception:
        logger.exception('Failed to send command confirmation to client')

    staff_to = getattr(settings, 'COMMAND_NOTIFY_EMAIL', None) or settings.DEFAULT_FROM_EMAIL
    try:
        send_mail(
            f'[Admin] New command {command.tracking_code}',
            body,
            settings.DEFAULT_FROM_EMAIL,
            [staff_to],
            fail_silently=True,
        )
    except Exception:
        logger.exception('Failed to send command notification to staff')
