"""Create and fulfill store orders."""

import random
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import StoreOrder, StoreOrderItem, StoreProduct

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


@transaction.atomic
def create_store_order(*, user, customer_data, items_data):
    grouped = _normalize_items(items_data)
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
        if product.stock_qty < qty:
            raise ValidationError(
                {'items': f'Not enough stock for {product.name} (available: {product.stock_qty}).'},
            )
        line_usd = Decimal(product.price_usd) * qty
        line_dzd = Decimal(product.price_dzd) * qty
        total_usd += line_usd
        total_dzd += line_dzd
        line_rows.append((product, qty))

    if total_usd <= 0 and total_dzd <= 0:
        raise ValidationError({'items': 'Order total must be greater than zero.'})

    order = StoreOrder.objects.create(
        order_number=generate_store_order_number(),
        user=user if user and user.is_authenticated and not user.is_staff else None,
        customer_name=customer_data['customer_name'].strip(),
        customer_email=customer_data['customer_email'].strip().lower(),
        customer_phone=(customer_data.get('customer_phone') or '').strip(),
        shipping_address=customer_data['shipping_address'].strip(),
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
