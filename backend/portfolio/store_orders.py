"""Create and fulfill store orders."""

import random
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .algeria_shipping import (
    format_shipping_address,
    get_postal_code_for_checkout,
    normalize_algeria_phone,
    shipping_price_dzd,
)
from .models import StoreOrder, StoreOrderItem, StoreProduct
from .store_reservations import (
    attach_reservations_to_order,
    available_qty,
    release_order_reservations,
    sync_cart_reservations,
)

_ORDER_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'


def generate_store_order_number() -> str:
    while True:
        code = 'EG-SHOP-' + ''.join(random.choices(_ORDER_CHARS, k=6))
        if not StoreOrder.objects.filter(order_number=code).exists():
            return code


def _normalize_items(items_data):
    if not items_data:
        raise ValidationError({'items': 'Cart is empty.'})
    grouped = {}
    for row in items_data:
        product_id = str(row.get('product_id') or row.get('product') or '').strip()
        if not product_id:
            raise ValidationError({'items': 'Each line needs a product_id.'})
        try:
            qty = int(row.get('quantity', 1))
        except (TypeError, ValueError) as exc:
            raise ValidationError({'items': 'Invalid quantity.'}) from exc
        if qty < 1:
            raise ValidationError({'items': 'Quantity must be at least 1.'})
        grouped[product_id] = grouped.get(product_id, 0) + qty
    return grouped


def validate_cart_items(items_data, *, reservation_key: str | None = None):
    """Re-price cart lines from live product data (browser cart may be stale)."""
    grouped = _normalize_items(items_data)
    if reservation_key:
        sync_cart_reservations(reservation_key, grouped)
    product_ids = list(grouped.keys())
    products = {
        str(p.id): p
        for p in StoreProduct.objects.filter(
            id__in=product_ids,
            is_active=True,
            category__is_active=True,
        )
    }
    if len(products) != len(product_ids):
        raise ValidationError({'items': 'One or more products are unavailable.'})

    lines = []
    subtotal_dzd = Decimal('0')
    subtotal_usd = Decimal('0')
    from .store_reservations import CART_TTL_MINUTES, new_reservation_key

    key = (reservation_key or '').strip() or new_reservation_key()
    expires_minutes = CART_TTL_MINUTES

    for product_id, qty in grouped.items():
        product = products[product_id]
        avail = available_qty(product, reservation_key=key)
        if avail < qty:
            raise ValidationError(
                {
                    'items': (
                        f'Not enough stock for {product.name} '
                        f'(available now: {avail}). Another customer may be checking out.'
                    ),
                },
            )
        line_dzd = Decimal(product.price_dzd) * qty
        line_usd = Decimal(product.price_usd) * qty
        subtotal_dzd += line_dzd
        subtotal_usd += line_usd
        lines.append({
            'product_id': str(product.id),
            'name': product.name,
            'slug': product.slug,
            'image_url': product.image.url if getattr(product.image, 'name', None) else '',
            'price_usd': str(product.price_usd),
            'price_dzd': str(product.price_dzd),
            'stock_qty': avail,
            'quantity': qty,
            'line_total_dzd': str(line_dzd),
            'line_total_usd': str(line_usd),
        })
    return {
        'items': lines,
        'subtotal_dzd': str(subtotal_dzd),
        'subtotal_usd': str(subtotal_usd),
        'reservation_id': key,
        'reservation_expires_minutes': expires_minutes,
    }


@transaction.atomic
def create_store_order(*, user, customer_data, items_data, reservation_key: str | None = None):
    grouped = _normalize_items(items_data)
    res_key = (reservation_key or customer_data.get('reservation_id') or '').strip()
    if res_key:
        sync_cart_reservations(res_key, grouped)
    product_ids = list(grouped.keys())
    products = {
        str(p.id): p
        for p in StoreProduct.objects.select_related('category').filter(
            id__in=product_ids,
            is_active=True,
            category__is_active=True,
        )
    }
    if len(products) != len(product_ids):
        raise ValidationError({'items': 'One or more products are unavailable.'})

    total_usd = Decimal('0')
    total_dzd = Decimal('0')
    line_rows = []

    for product_id, qty in grouped.items():
        product = products[product_id]
        avail = available_qty(product, reservation_key=res_key or None)
        if avail < qty:
            raise ValidationError(
                {
                    'items': (
                        f'Not enough stock for {product.name} (available now: {avail}). '
                        'Refresh your cart or try again shortly.'
                    ),
                },
            )
        line_usd = Decimal(product.price_usd) * qty
        line_dzd = Decimal(product.price_dzd) * qty
        total_usd += line_usd
        total_dzd += line_dzd
        line_rows.append((product, qty))

    if total_usd <= 0 and total_dzd <= 0:
        raise ValidationError({'items': 'Order total must be greater than zero.'})

    delivery_type = (customer_data.get('delivery_type') or '').strip()
    postal_code = (customer_data.get('postal_code') or '').strip()
    postal_row = get_postal_code_for_checkout(postal_code, delivery_type)
    ship_dzd = Decimal(shipping_price_dzd(postal_row, delivery_type))
    total_dzd += ship_dzd

    first = customer_data.get('first_name', '').strip()
    last = customer_data.get('last_name', '').strip()
    if not first or not last:
        legacy = (customer_data.get('customer_name') or '').strip()
        if legacy and ' ' in legacy:
            parts = legacy.split(None, 1)
            first = first or parts[0]
            last = last or parts[1]
        elif legacy:
            first = first or legacy
    if not first or not last:
        raise ValidationError({'first_name': 'First and last name are required.'})

    phone = normalize_algeria_phone(customer_data.get('customer_phone') or '')
    address_line1 = (customer_data.get('address_line1') or '').strip()
    city = (customer_data.get('city') or '').strip()
    if not address_line1 or not city:
        legacy_addr = (customer_data.get('shipping_address') or '').strip()
        if legacy_addr and not address_line1:
            address_line1 = legacy_addr
        if not address_line1:
            raise ValidationError({'address_line1': 'Address is required.'})
        if not city:
            raise ValidationError({'city': 'City is required.'})

    ship_payload = {
        'first_name': first,
        'last_name': last,
        'address_line1': address_line1,
        'address_line2': (customer_data.get('address_line2') or '').strip(),
        'city': city,
        'wilaya_name': postal_row.wilaya.name,
        'postal_code': postal_row.postal_code,
        'delivery_type': delivery_type,
        'customer_phone': phone,
    }
    shipping_text = format_shipping_address(ship_payload)

    order = StoreOrder.objects.create(
        order_number=generate_store_order_number(),
        user=user if user and user.is_authenticated and not user.is_staff else None,
        customer_name=f'{first} {last}'.strip(),
        customer_first_name=first,
        customer_last_name=last,
        customer_email=customer_data['customer_email'].strip().lower(),
        customer_phone=phone,
        shipping_address=shipping_text,
        address_line1=address_line1,
        address_line2=ship_payload['address_line2'],
        city=city,
        wilaya=postal_row.wilaya,
        postal_code=postal_row.postal_code,
        delivery_type=delivery_type,
        shipping_dzd=ship_dzd,
        notes=(customer_data.get('notes') or '').strip(),
        total_usd=total_usd,
        total_dzd=total_dzd,
        status=StoreOrder.Status.PENDING,
        payment_status=StoreOrder.PaymentStatus.PENDING,
    )

    for product, qty in line_rows:
        StoreOrderItem.objects.create(
            order=order,
            product=product,
            product_name=product.name,
            product_slug=product.slug,
            quantity=qty,
            unit_price_usd=product.price_usd,
            unit_price_dzd=product.price_dzd,
        )

    if res_key:
        attach_reservations_to_order(res_key, order)

    try:
        from .notifications import notify_store_order_created

        notify_store_order_created(order)
    except Exception:
        pass

    return order


@transaction.atomic
def fulfill_store_order(order_id) -> None:
    try:
        order = StoreOrder.objects.select_for_update().prefetch_related('items').get(id=order_id)
    except StoreOrder.DoesNotExist:
        return

    if order.payment_status == StoreOrder.PaymentStatus.PAID:
        return

    order.payment_status = StoreOrder.PaymentStatus.PAID
    order.paid_at = timezone.now()
    if order.status == StoreOrder.Status.PENDING:
        order.status = StoreOrder.Status.PROCESSING
    order.save(update_fields=['payment_status', 'paid_at', 'status', 'updated_at'])

    for line in order.items.all():
        if not line.product_id:
            continue
        product = StoreProduct.objects.select_for_update().filter(id=line.product_id).first()
        if not product:
            continue
        product.stock_qty = max(0, product.stock_qty - line.quantity)
        product.save(update_fields=['stock_qty', 'updated_at'])

    release_order_reservations(order)


def get_store_order_for_track(order_number: str, email: str):
    number = (order_number or '').strip().upper()
    mail = (email or '').strip().lower()
    if not number or not mail:
        raise ValidationError('Order number and email are required.')
    try:
        return StoreOrder.objects.prefetch_related('items').get(
            order_number__iexact=number,
            customer_email__iexact=mail,
        )
    except StoreOrder.DoesNotExist as exc:
        raise ValidationError('Order not found. Check your order number and email.') from exc
