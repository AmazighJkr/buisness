"""Mark commands paid / activate subscriptions from payment provider metadata."""

from decimal import Decimal

from django.utils import timezone

from .models import ProjectCommand, UserSubscription
from .store_orders import fulfill_store_order
from .subscriptions import complete_subscription_from_metadata


def _normalize_currency(raw: str) -> str:
    value = (raw or '').strip().lower()
    return value if value in ('usd', 'dzd') else ''


def _normalize_amount(value) -> Decimal | None:
    if value is None or value == '':
        return None
    try:
        amount = Decimal(str(value))
    except Exception:
        return None
    return amount if amount > 0 else None


def mark_command_paid(command, *, currency: str = '', amount=None) -> None:
    currency = _normalize_currency(currency)
    paid_amount = _normalize_amount(amount)
    command.payment_status = ProjectCommand.PaymentStatus.PAID
    if not command.paid_at:
        command.paid_at = timezone.now()
    if currency == 'dzd':
        command.paid_currency = 'dzd'
        command.paid_amount = paid_amount or command.quoted_price_dzd
    elif currency == 'usd':
        command.paid_currency = 'usd'
        command.paid_amount = paid_amount or command.quoted_price
    elif not command.paid_currency:
        dzd = command.quoted_price_dzd or Decimal('0')
        usd = command.quoted_price or Decimal('0')
        if dzd > 0 and usd <= 0:
            command.paid_currency = 'dzd'
            command.paid_amount = paid_amount or dzd
        elif usd > 0 and dzd <= 0:
            command.paid_currency = 'usd'
            command.paid_amount = paid_amount or usd
    command.save(
        update_fields=[
            'payment_status',
            'paid_currency',
            'paid_amount',
            'paid_at',
        ],
    )


def mark_subscription_paid(subscription, *, currency: str = '', amount=None) -> None:
    currency = _normalize_currency(currency)
    paid_amount = _normalize_amount(amount)
    pack = subscription.pack
    if currency == 'dzd':
        subscription.paid_currency = 'dzd'
        subscription.paid_amount = paid_amount or pack.price_dzd
    elif currency == 'usd':
        subscription.paid_currency = 'usd'
        subscription.paid_amount = paid_amount or pack.price
    subscription.save(update_fields=['paid_currency', 'paid_amount'])


def fulfill_payment_metadata(meta: dict, *, currency: str = '', amount=None) -> None:
    if not meta:
        return
    kind = meta.get('type')
    currency = _normalize_currency(currency)
    if kind == 'command':
        command_id = meta.get('command_id')
        if not command_id:
            return
        try:
            cmd = ProjectCommand.objects.get(id=command_id)
            mark_command_paid(cmd, currency=currency, amount=amount)
        except ProjectCommand.DoesNotExist:
            pass
    elif kind == 'subscription':
        sub_id = meta.get('subscription_id')
        if not sub_id:
            return
        try:
            sub = UserSubscription.objects.select_related('pack').get(id=sub_id)
            mark_subscription_paid(sub, currency=currency, amount=amount)
            complete_subscription_from_metadata(sub, meta)
        except UserSubscription.DoesNotExist:
            pass
    elif kind == 'store_order':
        order_id = meta.get('store_order_id')
        if order_id:
            fulfill_store_order(order_id)
