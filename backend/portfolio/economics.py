"""Superuser economics — gross revenue, payment fees, and net by region/currency."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any

from django.conf import settings
from django.utils import timezone

from .models import ProjectCommand, StoreOrder, UserSubscription


@dataclass
class MoneyBucket:
    count: int = 0
    gross: Decimal = Decimal('0')
    amounts: list[Decimal] = field(default_factory=list)

    def add(self, amount: Decimal | None) -> None:
        if amount is None:
            return
        value = Decimal(str(amount))
        if value <= 0:
            return
        self.count += 1
        self.gross += value
        self.amounts.append(value)


def _fee_config() -> dict[str, float]:
    return {
        'stripe_percent': float(getattr(settings, 'PAYMENT_STRIPE_FEE_PERCENT', 2.9)),
        'stripe_fixed_usd': float(getattr(settings, 'PAYMENT_STRIPE_FEE_FIXED_USD', 0.30)),
        'chargily_percent': float(getattr(settings, 'PAYMENT_CHARGILY_FEE_PERCENT', 2.5)),
    }


def stripe_fee(gross_usd: Decimal) -> Decimal:
    cfg = _fee_config()
    pct = Decimal(str(cfg['stripe_percent']))
    fixed = Decimal(str(cfg['stripe_fixed_usd']))
    return (gross_usd * pct / Decimal('100')) + fixed


def chargily_fee(gross_dzd: Decimal) -> Decimal:
    pct = Decimal(str(_fee_config()['chargily_percent']))
    return gross_dzd * pct / Decimal('100')


def _money_summary(bucket: MoneyBucket, *, currency: str) -> dict[str, Any]:
    gross = bucket.gross.quantize(Decimal('0.01'))
    if bucket.amounts:
        if currency == 'USD':
            fees = sum(stripe_fee(amount) for amount in bucket.amounts)
        else:
            fees = sum(chargily_fee(amount) for amount in bucket.amounts)
    else:
        fees = Decimal('0')
    fees = Decimal(str(fees)).quantize(Decimal('0.01'))
    net = max(Decimal('0'), gross - fees).quantize(Decimal('0.01'))
    return {
        'count': bucket.count,
        'gross': str(gross),
        'fees': str(fees),
        'net': str(net),
    }


def _region_totals(*buckets: MoneyBucket, currency: str) -> dict[str, Any]:
    combined = MoneyBucket()
    for bucket in buckets:
        for amount in bucket.amounts:
            combined.add(amount)
    if combined.amounts:
        fee_total = sum(
            stripe_fee(a) if currency == 'USD' else chargily_fee(a)
            for a in combined.amounts
        )
    else:
        fee_total = Decimal('0')
    fee_total = Decimal(str(fee_total)).quantize(Decimal('0.01'))
    return {
        'count': combined.count,
        'gross': str(combined.gross.quantize(Decimal('0.01'))),
        'fees': str(fee_total),
        'net': str(
            max(Decimal('0'), combined.gross - fee_total).quantize(Decimal('0.01')),
        ),
    }


def _parse_period(
    *,
    period: str,
    date_from: str,
    date_to: str,
) -> tuple[datetime | None, datetime | None]:
    now = timezone.now()
    period = (period or 'all').strip().lower()
    if period == '30d':
        return now - timedelta(days=30), now
    if period == '90d':
        return now - timedelta(days=90), now
    if period == 'year':
        return now - timedelta(days=365), now
    if date_from or date_to:
        start = end = None
        if date_from:
            start = timezone.make_aware(datetime.fromisoformat(date_from))
        if date_to:
            end = timezone.make_aware(datetime.fromisoformat(date_to)) + timedelta(days=1)
        return start, end
    return None, None


def _in_range(dt, start: datetime | None, end: datetime | None) -> bool:
    if dt is None:
        return start is None and end is None
    if start and dt < start:
        return False
    return not (end and dt >= end)


def _command_paid_amount(command: ProjectCommand) -> tuple[str, Decimal] | None:
    if command.payment_status != ProjectCommand.PaymentStatus.PAID:
        return None
    if command.paid_currency == 'dzd' and command.paid_amount and command.paid_amount > 0:
        return 'dzd', command.paid_amount
    if command.paid_currency == 'usd' and command.paid_amount and command.paid_amount > 0:
        return 'usd', command.paid_amount
    dzd = command.quoted_price_dzd or Decimal('0')
    usd = command.quoted_price or Decimal('0')
    if dzd > 0 and usd <= 0:
        return 'dzd', dzd
    if usd > 0 and dzd <= 0:
        return 'usd', usd
    if dzd > 0 and usd > 0:
        return None
    return None


def _subscription_paid_amount(sub: UserSubscription) -> tuple[str, Decimal] | None:
    if sub.status != UserSubscription.Status.ACTIVE:
        return None
    if sub.paid_currency == 'dzd' and sub.paid_amount and sub.paid_amount > 0:
        return 'dzd', sub.paid_amount
    if sub.paid_currency == 'usd' and sub.paid_amount and sub.paid_amount > 0:
        return 'usd', sub.paid_amount
    pack = sub.pack
    dzd = pack.price_dzd or Decimal('0')
    usd = pack.price or Decimal('0')
    if dzd > 0 and usd <= 0:
        return 'dzd', dzd
    if usd > 0 and dzd <= 0:
        return 'usd', usd
    return None


def build_economics_report(
    *,
    period: str = 'all',
    date_from: str = '',
    date_to: str = '',
) -> dict[str, Any]:
    start, end = _parse_period(period=period, date_from=date_from, date_to=date_to)

    store_bucket = MoneyBucket()
    commands_dzd = MoneyBucket()
    commands_usd = MoneyBucket()
    subs_dzd = MoneyBucket()
    subs_usd = MoneyBucket()
    ambiguous_commands = 0
    ambiguous_subscriptions = 0

    store_qs = StoreOrder.objects.filter(payment_status=StoreOrder.PaymentStatus.PAID)
    if start:
        store_qs = store_qs.filter(paid_at__gte=start)
    if end:
        store_qs = store_qs.filter(paid_at__lt=end)
    for order in store_qs.only('total_dzd', 'paid_at', 'order_number'):
        store_bucket.add(order.total_dzd)

    command_qs = ProjectCommand.objects.filter(payment_status=ProjectCommand.PaymentStatus.PAID)
    for cmd in command_qs.only(
        'paid_currency',
        'paid_amount',
        'quoted_price',
        'quoted_price_dzd',
        'paid_at',
        'created_at',
        'payment_status',
    ):
        paid_at = cmd.paid_at or cmd.created_at
        if not _in_range(paid_at, start, end):
            continue
        row = _command_paid_amount(cmd)
        if row is None:
            if (cmd.quoted_price_dzd or 0) > 0 and (cmd.quoted_price or 0) > 0:
                ambiguous_commands += 1
            continue
        currency, amount = row
        if currency == 'dzd':
            commands_dzd.add(amount)
        else:
            commands_usd.add(amount)

    sub_qs = UserSubscription.objects.filter(
        status=UserSubscription.Status.ACTIVE,
    ).select_related('pack')
    for sub in sub_qs:
        paid_at = sub.started_at or sub.created_at
        if not _in_range(paid_at, start, end):
            continue
        row = _subscription_paid_amount(sub)
        if row is None:
            if (sub.pack.price_dzd or 0) > 0 and (sub.pack.price or 0) > 0:
                ambiguous_subscriptions += 1
            continue
        currency, amount = row
        if currency == 'dzd':
            subs_dzd.add(amount)
        else:
            subs_usd.add(amount)

    pending_store = StoreOrder.objects.filter(
        payment_status=StoreOrder.PaymentStatus.PENDING,
    ).exclude(status=StoreOrder.Status.CANCELLED).count()
    pending_commands = ProjectCommand.objects.filter(
        payment_status=ProjectCommand.PaymentStatus.PENDING,
        status=ProjectCommand.Status.ACCEPTED,
    ).count()

    return {
        'period': period if period != 'all' else 'all',
        'fee_config': _fee_config(),
        'algeria': {
            'currency': 'DZD',
            'provider': 'chargily',
            'store': _money_summary(store_bucket, currency='DZD'),
            'commands': _money_summary(commands_dzd, currency='DZD'),
            'subscriptions': _money_summary(subs_dzd, currency='DZD'),
            'totals': _region_totals(store_bucket, commands_dzd, subs_dzd, currency='DZD'),
        },
        'international': {
            'currency': 'USD',
            'provider': 'stripe',
            'commands': _money_summary(commands_usd, currency='USD'),
            'subscriptions': _money_summary(subs_usd, currency='USD'),
            'totals': _region_totals(commands_usd, subs_usd, currency='USD'),
        },
        'pending': {
            'store_orders': pending_store,
            'accepted_unpaid_commands': pending_commands,
        },
        'notes': {
            'currencies_not_combined': 'Algeria (DZD) and international (USD) totals are not converted.',
            'fees_estimated': 'Fees use configured Stripe/Chargily rates — verify against provider dashboards.',
            'ambiguous_commands': ambiguous_commands,
            'ambiguous_subscriptions': ambiguous_subscriptions,
        },
    }
