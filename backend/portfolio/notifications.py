"""Email notifications (SMTP via EMAIL_* env). Bilingual EN/FR bodies."""

import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _can_send() -> bool:
    return bool(getattr(settings, 'DEFAULT_FROM_EMAIL', None))


def _staff_inbox() -> str:
    return (
        getattr(settings, 'COMMAND_NOTIFY_EMAIL', None)
        or getattr(settings, 'CONTACT_EMAIL', None)
        or settings.DEFAULT_FROM_EMAIL
    )


def _bilingual(en: str, fr: str) -> str:
    return f'{en}\n\n—— FR ——\n\n{fr}'


def _send_client(to_email: str, subject_en: str, subject_fr: str, body_en: str, body_fr: str) -> None:
    if not _can_send() or not to_email:
        return
    subject = f'[{settings.ENTERPRISE_DISPLAY_NAME}] {subject_en} / {subject_fr}'
    try:
        send_mail(
            subject,
            _bilingual(body_en, body_fr),
            settings.DEFAULT_FROM_EMAIL,
            [to_email],
            fail_silently=False,
        )
    except Exception:
        logger.exception('Failed to send client email to %s', to_email)


def _send_staff(subject: str, body: str) -> None:
    if not _can_send():
        return
    try:
        send_mail(
            f'[Admin] {subject}',
            body,
            settings.DEFAULT_FROM_EMAIL,
            [_staff_inbox()],
            fail_silently=False,
        )
    except Exception:
        logger.exception('Failed to send staff notification')


def _command_project_title(command) -> str:
    if command.associated_project_id:
        return command.associated_project.title
    return 'Custom build'


def notify_command_created(command) -> None:
    if not _can_send():
        return
    from .models import ProjectCommand

    if not isinstance(command, ProjectCommand):
        return

    layers = command.selected_layers or []
    layer_lines = '\n'.join(
        f"  - {row.get('name', row.get('slug', '?'))}"
        for row in layers
    ) or '  (none)'
    title = _command_project_title(command)
    sla_h = getattr(settings, 'SLA_COMMAND_REPLY_HOURS', 48)
    body_en = (
        f'Tracking code: {command.tracking_code}\n'
        f'Project: {title}\n\n'
        f'Layers:\n{layer_lines}\n\n'
        f'We received your request and will respond within {sla_h} hours.\n'
        f'Track: {settings.PUBLIC_SITE_URL}/track?code={command.tracking_code}'
    )
    body_fr = (
        f'Code de suivi : {command.tracking_code}\n'
        f'Projet : {title}\n\n'
        f'Couches :\n{layer_lines}\n\n'
        f'Nous avons bien reçu votre demande et répondrons sous {sla_h} h.\n'
        f'Suivi : {settings.PUBLIC_SITE_URL}/track?code={command.tracking_code}'
    )
    _send_client(
        command.client_email,
        f'Command received — {command.tracking_code}',
        f'Commande reçue — {command.tracking_code}',
        body_en,
        body_fr,
    )
    _send_staff(
        f'New command {command.tracking_code}',
        f'{command.client_email}\n{title}\n\n{layer_lines}',
    )


def notify_command_quote_ready(command) -> None:
    price = command.quoted_price_dzd or command.quoted_price or '—'
    currency = 'DZD' if command.quoted_price_dzd else 'USD'
    body_en = (
        f'Your command {command.tracking_code} has been accepted.\n'
        f'Quoted price: {price} {currency}\n\n'
        f'Open your tracker to review and pay:\n'
        f'{settings.PUBLIC_SITE_URL}/track?code={command.tracking_code}'
    )
    body_fr = (
        f'Votre commande {command.tracking_code} a été acceptée.\n'
        f'Devis : {price} {currency}\n\n'
        f'Consultez le suivi pour valider et payer :\n'
        f'{settings.PUBLIC_SITE_URL}/track?code={command.tracking_code}'
    )
    _send_client(
        command.client_email,
        f'Quote ready — {command.tracking_code}',
        f'Devis prêt — {command.tracking_code}',
        body_en,
        body_fr,
    )


def notify_command_status_change(command, old_status: str, new_status: str) -> None:
    if old_status == new_status:
        return
    body_en = (
        f'Command {command.tracking_code} status: {old_status} → {new_status}\n'
        f'Track: {settings.PUBLIC_SITE_URL}/track?code={command.tracking_code}'
    )
    body_fr = (
        f'Commande {command.tracking_code} : {old_status} → {new_status}\n'
        f'Suivi : {settings.PUBLIC_SITE_URL}/track?code={command.tracking_code}'
    )
    _send_client(
        command.client_email,
        f'Status update — {command.tracking_code}',
        f'Mise à jour — {command.tracking_code}',
        body_en,
        body_fr,
    )


def notify_store_order_created(order) -> None:
    body_en = (
        f'Order {order.order_number}\n'
        f'Total: {order.total_dzd} DZD\n\n'
        f'Track: {settings.PUBLIC_SITE_URL}/shop/order?number={order.order_number}'
    )
    body_fr = (
        f'Commande {order.order_number}\n'
        f'Total : {order.total_dzd} DZD\n\n'
        f'Suivi : {settings.PUBLIC_SITE_URL}/shop/order?number={order.order_number}'
    )
    _send_client(
        order.customer_email,
        f'Order received — {order.order_number}',
        f'Commande reçue — {order.order_number}',
        body_en,
        body_fr,
    )
    _send_staff(f'New store order {order.order_number}', f'{order.customer_email}\n{order.total_dzd} DZD')


def notify_store_order_status_change(order, old_status: str, new_status: str) -> None:
    if old_status == new_status:
        return
    ship_days = getattr(settings, 'SLA_SHIP_DAYS_AFTER_PAYMENT', 5)
    extra_en = ''
    extra_fr = ''
    if new_status == 'shipped':
        extra_en = '\nYour package is on its way.'
        extra_fr = '\nVotre colis est en route.'
    elif new_status == 'processing' and order.payment_status == 'paid':
        extra_en = f'\nWe aim to ship within {ship_days} business days after payment.'
        extra_fr = f'\nExpédition prévue sous {ship_days} jours ouvrables après paiement.'

    body_en = (
        f'Order {order.order_number}: {old_status} → {new_status}{extra_en}\n'
        f'{settings.PUBLIC_SITE_URL}/shop/order?number={order.order_number}'
    )
    body_fr = (
        f'Commande {order.order_number} : {old_status} → {new_status}{extra_fr}\n'
        f'{settings.PUBLIC_SITE_URL}/shop/order?number={order.order_number}'
    )
    _send_client(
        order.customer_email,
        f'Order update — {order.order_number}',
        f'Mise à jour commande — {order.order_number}',
        body_en,
        body_fr,
    )
