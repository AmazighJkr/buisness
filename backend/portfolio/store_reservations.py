"""Temporary stock holds while a customer validates cart or completes checkout."""

import uuid
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db.models import Sum
from django.utils import timezone

from .models import StoreProduct, StoreStockReservation

CART_TTL_MINUTES = int(getattr(settings, 'STORE_CART_RESERVATION_TTL_MINUTES', 15))
ORDER_TTL_MINUTES = int(getattr(settings, 'STORE_ORDER_RESERVATION_TTL_MINUTES', 60))


def _ttl_delta(minutes: int):
    return timedelta(minutes=minutes)


def cleanup_expired_reservations():
    StoreStockReservation.objects.filter(
        expires_at__lt=timezone.now(),
        order__isnull=True,
    ).delete()


def _active_reservations_qs():
    cleanup_expired_reservations()
    return StoreStockReservation.objects.filter(expires_at__gte=timezone.now())


def reserved_qty_for_product(product_id, *, exclude_key: str | None = None) -> int:
    qs = _active_reservations_qs().filter(product_id=product_id, order__isnull=True)
    if exclude_key:
        qs = qs.exclude(reservation_key=exclude_key)
    total = qs.aggregate(total=Sum('quantity'))['total']
    return int(total or 0)


def available_qty(product: StoreProduct, *, reservation_key: str | None = None) -> int:
    held_by_others = reserved_qty_for_product(product.id, exclude_key=reservation_key)
    own = 0
    if reservation_key:
        own = (
            _active_reservations_qs()
            .filter(product_id=product.id, reservation_key=reservation_key, order__isnull=True)
            .aggregate(total=Sum('quantity'))['total']
        )
        own = int(own or 0)
    return max(0, product.stock_qty - held_by_others)


def sync_cart_reservations(reservation_key: str, grouped: dict[str, int]) -> None:
    """Replace cart holds for this key with current line quantities."""
    if not reservation_key:
        return
    key = reservation_key.strip()[:64]
    if not key:
        return
    expires = timezone.now() + _ttl_delta(CART_TTL_MINUTES)
    product_ids = list(grouped.keys())
    _active_reservations_qs().filter(reservation_key=key, order__isnull=True).exclude(
        product_id__in=product_ids,
    ).delete()
    for product_id, qty in grouped.items():
        StoreStockReservation.objects.update_or_create(
            reservation_key=key,
            product_id=product_id,
            order=None,
            defaults={'quantity': qty, 'expires_at': expires},
        )


def attach_reservations_to_order(reservation_key: str, order) -> None:
    if not reservation_key:
        return
    key = reservation_key.strip()[:64]
    expires = timezone.now() + _ttl_delta(ORDER_TTL_MINUTES)
    _active_reservations_qs().filter(reservation_key=key, order__isnull=True).update(
        order=order,
        expires_at=expires,
    )


def release_order_reservations(order) -> None:
    StoreStockReservation.objects.filter(order=order).delete()


def new_reservation_key() -> str:
    return str(uuid.uuid4())
