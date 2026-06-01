"""Pack tiers, hierarchical access, and upgrade pricing."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from .models import SubscriptionPack, UserSubscription


@dataclass
class SubscribeQuote:
    amount: Decimal
    amount_dzd: Decimal
    is_upgrade: bool
    expires_at: timezone.datetime | None
    replaces_subscription_id: str | None
    already_active: bool = False
    blocked_downgrade: bool = False


def highest_active_pack_sort_order(user) -> int:
    subs = list(_active_subscriptions(user))
    if not subs:
        return 0
    return max(s.pack.sort_order for s in subs)


def accessible_pack_ids(user):
    """All pack tiers at or below the user's highest active subscription."""
    tier = highest_active_pack_sort_order(user)
    if tier <= 0:
        return []
    return list(
        SubscriptionPack.objects.filter(is_active=True, sort_order__lte=tier).values_list(
            'id',
            flat=True,
        ),
    )


def _active_subscriptions(user):
    from .access import active_subscriptions_for

    return active_subscriptions_for(user)


def quote_subscribe(user, target_pack: SubscriptionPack) -> SubscribeQuote:
    """Price and rules for subscribing or upgrading to target_pack."""
    active = list(_active_subscriptions(user))

    if any(s.pack_id == target_pack.id for s in active):
        return SubscribeQuote(
            amount=Decimal('0'),
            amount_dzd=Decimal('0'),
            is_upgrade=False,
            expires_at=None,
            replaces_subscription_id=None,
            already_active=True,
        )

    highest_tier = max((s.pack.sort_order for s in active), default=0)
    if highest_tier > target_pack.sort_order:
        return SubscribeQuote(
            amount=Decimal('0'),
            amount_dzd=Decimal('0'),
            is_upgrade=False,
            expires_at=None,
            replaces_subscription_id=None,
            blocked_downgrade=True,
        )

    lower_subs = [s for s in active if s.pack.sort_order < target_pack.sort_order]
    if not lower_subs:
        return SubscribeQuote(
            amount=target_pack.price,
            amount_dzd=target_pack.price_dzd,
            is_upgrade=False,
            expires_at=None,
            replaces_subscription_id=None,
        )

    source = max(lower_subs, key=lambda s: s.pack.sort_order)
    amount = max(Decimal('0'), target_pack.price - source.pack.price)
    amount_dzd = max(Decimal('0'), target_pack.price_dzd - source.pack.price_dzd)
    return SubscribeQuote(
        amount=amount,
        amount_dzd=amount_dzd,
        is_upgrade=True,
        expires_at=source.expires_at,
        replaces_subscription_id=str(source.id),
    )


def activate_subscription(subscription, *, expires_at=None, replaces_subscription_id=None):
    """Mark subscription active; cancel superseded lower-tier subs."""
    now = timezone.now()
    subscription.status = UserSubscription.Status.ACTIVE
    subscription.started_at = subscription.started_at or now
    if expires_at:
        subscription.expires_at = expires_at
    elif not subscription.expires_at:
        subscription.expires_at = now + timedelta(days=subscription.pack.duration_days)
    subscription.save()

    if replaces_subscription_id:
        UserSubscription.objects.filter(id=replaces_subscription_id).exclude(
            pk=subscription.pk,
        ).update(status=UserSubscription.Status.CANCELLED)

    UserSubscription.objects.filter(
        user=subscription.user,
        status=UserSubscription.Status.ACTIVE,
        pack__sort_order__lt=subscription.pack.sort_order,
    ).exclude(pk=subscription.pk).update(status=UserSubscription.Status.CANCELLED)


def complete_subscription_from_metadata(subscription, metadata: dict):
    """After Stripe webhook or auto-confirm."""
    expires_at = subscription.expires_at
    if metadata.get('upgrade') == 'true' and metadata.get('expires_at'):
        from django.utils.dateparse import parse_datetime

        parsed = parse_datetime(metadata['expires_at'])
        if parsed:
            if timezone.is_naive(parsed):
                parsed = timezone.make_aware(parsed)
            expires_at = parsed

    activate_subscription(
        subscription,
        expires_at=expires_at,
        replaces_subscription_id=metadata.get('replaces_subscription_id') or None,
    )
