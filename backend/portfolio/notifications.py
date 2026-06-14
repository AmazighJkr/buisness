"""Email notifications (SMTP via EMAIL_* env). Bilingual EN/FR bodies."""

import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _can_send() -> bool:
    if not getattr(settings, 'DEFAULT_FROM_EMAIL', None):
        return False
    if getattr(settings, 'EMAIL_HOST', ''):
        return True
    backend = getattr(settings, 'EMAIL_BACKEND', '') or ''
    return 'console' in backend


def _whatsapp_line_fr_en() -> tuple[str, str]:
    url = getattr(settings, 'WHATSAPP_SUPPORT_URL', '') or ''
    if not url:
        return '', ''
    return (
        f'\nQuestions? WhatsApp: {url}',
        f'\nQuestions ? WhatsApp : {url}',
    )


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
    wa_en, wa_fr = _whatsapp_line_fr_en()
    body_en = (
        f'Tracking code: {command.tracking_code}\n'
        f'Project: {title}\n\n'
        f'Layers:\n{layer_lines}\n\n'
        f'We received your request and will respond within {sla_h} hours.\n'
        f'Track: {settings.PUBLIC_SITE_URL}/track?code={command.tracking_code}'
        f'{wa_en}'
    )
    body_fr = (
        f'Code de suivi : {command.tracking_code}\n'
        f'Projet : {title}\n\n'
        f'Couches :\n{layer_lines}\n\n'
        f'Nous avons bien reçu votre demande et répondrons sous {sla_h} h.\n'
        f'Suivi : {settings.PUBLIC_SITE_URL}/track?code={command.tracking_code}'
        f'{wa_fr}'
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
    wa_en, wa_fr = _whatsapp_line_fr_en()
    body_en = (
        f'Command {command.tracking_code} status: {old_status} → {new_status}\n'
        f'Track: {settings.PUBLIC_SITE_URL}/track?code={command.tracking_code}'
        f'{wa_en}'
    )
    body_fr = (
        f'Commande {command.tracking_code} : {old_status} → {new_status}\n'
        f'Suivi : {settings.PUBLIC_SITE_URL}/track?code={command.tracking_code}'
        f'{wa_fr}'
    )
    _send_client(
        command.client_email,
        f'Status update — {command.tracking_code}',
        f'Mise à jour — {command.tracking_code}',
        body_en,
        body_fr,
    )


def notify_store_order_created(order) -> None:
    wa_en, wa_fr = _whatsapp_line_fr_en()
    body_en = (
        f'Order {order.order_number}\n'
        f'Total: {order.total_dzd} DZD\n\n'
        f'Track: {settings.PUBLIC_SITE_URL}/shop/order?number={order.order_number}'
        f'{wa_en}'
    )
    body_fr = (
        f'Commande {order.order_number}\n'
        f'Total : {order.total_dzd} DZD\n\n'
        f'Suivi : {settings.PUBLIC_SITE_URL}/shop/order?number={order.order_number}'
        f'{wa_fr}'
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
    from .models import StoreOrder

    ship_days = getattr(settings, 'SLA_SHIP_DAYS_AFTER_PAYMENT', 5)
    wa_en, wa_fr = _whatsapp_line_fr_en()
    extra_en = ''
    extra_fr = ''
    subject_en = f'Order update — {order.order_number}'
    subject_fr = f'Mise à jour commande — {order.order_number}'

    if new_status == StoreOrder.Status.SHIPPED:
        subject_en = f'Order shipped — {order.order_number}'
        subject_fr = f'Commande expédiée — {order.order_number}'
        extra_en = '\nYour package is on its way.'
        extra_fr = '\nVotre colis est en route.'
    elif (
        new_status == StoreOrder.Status.PROCESSING
        and order.payment_status == StoreOrder.PaymentStatus.PAID
    ):
        extra_en = f'\nWe aim to ship within {ship_days} business days after payment.'
        extra_fr = f'\nExpédition prévue sous {ship_days} jours ouvrables après paiement.'

    body_en = (
        f'Order {order.order_number}: {old_status} → {new_status}{extra_en}\n'
        f'{settings.PUBLIC_SITE_URL}/shop/order?number={order.order_number}'
        f'{wa_en}'
    )
    body_fr = (
        f'Commande {order.order_number} : {old_status} → {new_status}{extra_fr}\n'
        f'{settings.PUBLIC_SITE_URL}/shop/order?number={order.order_number}'
        f'{wa_fr}'
    )
    _send_client(
        order.customer_email,
        subject_en,
        subject_fr,
        body_en,
        body_fr,
    )


def notify_contact_message_received(message) -> None:
    preview = (message.body or '').strip().replace('\n', ' ')
    if len(preview) > 200:
        preview = preview[:200] + '…'
    _send_staff(
        f'Contact message from {message.client_name or message.client_email}',
        (
            f'From: {message.client_name} <{message.client_email}>\n'
            f'Message ID: {message.id}\n\n'
            f'{message.body}'
        ),
    )
    wa_en, wa_fr = _whatsapp_line_fr_en()
    _send_client(
        message.client_email,
        'We received your message',
        'Message bien reçu',
        (
            f'Hi {message.client_name or "there"},\n\n'
            f'We received your message and will reply to this email shortly.\n\n'
            f'Your message:\n{preview}'
            f'{wa_en}'
        ),
        (
            f'Bonjour {message.client_name or ""},\n\n'
            f'Nous avons bien reçu votre message et vous répondrons bientôt à cette adresse.\n\n'
            f'Votre message :\n{preview}'
            f'{wa_fr}'
        ),
    )


def notify_contact_message_reply(message) -> None:
    if not (message.staff_reply or '').strip():
        return
    wa_en, wa_fr = _whatsapp_line_fr_en()
    _send_client(
        message.client_email,
        'Reply from EmbeddedGrid',
        'Réponse de EmbeddedGrid',
        (
            f'Hi {message.client_name or "there"},\n\n'
            f'{message.staff_reply.strip()}\n\n'
            f'— EmbeddedGrid team'
            f'{wa_en}'
        ),
        (
            f'Bonjour {message.client_name or ""},\n\n'
            f'{message.staff_reply.strip()}\n\n'
            f'— L\'équipe EmbeddedGrid'
            f'{wa_fr}'
        ),
    )


def notify_command_invoice_sent(command, invoice) -> None:
    to = command.client_email
    if not to:
        return
    code = command.tracking_code or ''
    wa_en, wa_fr = _whatsapp_line_fr_en()
    site = getattr(settings, 'FRONTEND_ORIGIN', '') or ''
    track = f'{site.rstrip("/")}/track?code={code}' if site and code else ''
    total_bits = []
    if invoice.total_dzd and invoice.total_dzd > 0:
        total_bits.append(f'{invoice.total_dzd} DZD')
    if invoice.total_usd and invoice.total_usd > 0:
        total_bits.append(f'{invoice.total_usd} USD')
    total_str = ' · '.join(total_bits) or '—'
    _send_client(
        to,
        'Invoice ready for your command',
        'Facture prête pour votre commande',
        (
            f'Hello {command.client_name or ""},\n\n'
            f'We sent you an invoice for your custom command ({code}).\n'
            f'Amount: {total_str}\n'
            f'{f"Pay here: {track}" if track else ""}\n\n'
            f'— EmbeddedGrid team{wa_en}'
        ),
        (
            f'Bonjour {command.client_name or ""},\n\n'
            f'Nous vous avons envoyé une facture pour votre commande ({code}).\n'
            f'Montant : {total_str}\n'
            f'{f"Payer ici : {track}" if track else ""}\n\n'
            f'— L\'équipe EmbeddedGrid{wa_fr}'
        ),
    )
