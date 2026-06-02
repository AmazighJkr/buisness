"""Optional Stripe Checkout; auto-confirm or manual payment when Stripe is off."""

import os
from decimal import Decimal

from django.conf import settings

PAYMENT_INSTRUCTIONS_COMMAND = (
    'Contact lab@embeddedgrid.dev to complete payment. Include your tracking code.'
)
PAYMENT_INSTRUCTIONS_SUBSCRIPTION = (
    'Contact lab@embeddedgrid.dev to activate your subscription.'
)


def stripe_secret_key() -> str:
    return os.getenv('STRIPE_SECRET_KEY', '').strip()


def stripe_enabled() -> bool:
    return bool(stripe_secret_key())


def payments_auto_confirm() -> bool:
    """Instantly mark paid/active when no online checkout provider is configured."""
    from .chargily_payments import chargily_enabled

    raw = os.getenv('PAYMENTS_AUTO_CONFIRM', '').strip().lower()
    if raw in ('false', '0', 'no'):
        return False
    if raw in ('true', '1', 'yes'):
        return True
    return not (stripe_enabled() or chargily_enabled())


def payment_instructions(*, subscription: bool = False) -> str:
    default = (
        PAYMENT_INSTRUCTIONS_SUBSCRIPTION if subscription else PAYMENT_INSTRUCTIONS_COMMAND
    )
    return os.getenv('PAYMENT_INSTRUCTIONS', default).strip()


def _stripe():
    import stripe

    stripe.api_key = stripe_secret_key()
    return stripe


def _money(amount: Decimal) -> int:
    """Cents for Stripe."""
    return int(Decimal(amount) * 100)


def create_command_checkout_session(command, success_url: str, cancel_url: str):
    if not stripe_enabled():
        return None
    if not command.quoted_price or command.quoted_price <= 0:
        return None
    stripe = _stripe()
    return stripe.checkout.Session.create(
        mode='payment',
        success_url=success_url,
        cancel_url=cancel_url,
        client_reference_id=str(command.id),
        metadata={
            'type': 'command',
            'command_id': str(command.id),
            'tracking_code': command.tracking_code,
        },
        line_items=[{
            'quantity': 1,
            'price_data': {
                'currency': os.getenv('PAYMENT_CURRENCY', 'usd'),
                'unit_amount': _money(command.quoted_price),
                'product_data': {
                    'name': f'EmbeddedGrid command {command.tracking_code}',
                    'description': (command.idea_description or '')[:200],
                },
            },
        }],
    )


def create_pack_checkout_session(
    subscription,
    success_url: str,
    cancel_url: str,
    *,
    charge_amount=None,
    extra_metadata=None,
):
    if not stripe_enabled():
        return None
    pack = subscription.pack
    amount = Decimal(charge_amount) if charge_amount is not None else pack.price
    if amount <= 0:
        return None
    stripe = _stripe()
    meta = {
        'type': 'subscription',
        'subscription_id': str(subscription.id),
        'pack_id': str(pack.id),
        'user_id': str(subscription.user_id),
    }
    if extra_metadata:
        meta.update(extra_metadata)
    description = (pack.description or '')[:200]
    if meta.get('upgrade') == 'true':
        description = f'Upgrade to {pack.name} (price difference). {description}'[:200]
    return stripe.checkout.Session.create(
        mode='payment',
        success_url=success_url,
        cancel_url=cancel_url,
        client_reference_id=str(subscription.id),
        metadata=meta,
        line_items=[{
            'quantity': 1,
            'price_data': {
                'currency': os.getenv('PAYMENT_CURRENCY', 'usd'),
                'unit_amount': _money(amount),
                'product_data': {
                    'name': pack.name,
                    'description': description,
                },
            },
        }],
    )


def create_store_checkout_session(order, success_url: str, cancel_url: str):
    if not stripe_enabled():
        return None
    if not order.total_usd or order.total_usd <= 0:
        return None
    stripe = _stripe()
    line_items = []
    for line in order.items.all():
        line_items.append({
            'quantity': line.quantity,
            'price_data': {
                'currency': os.getenv('PAYMENT_CURRENCY', 'usd'),
                'unit_amount': _money(line.unit_price_usd),
                'product_data': {
                    'name': line.product_name[:120],
                },
            },
        })
    if not line_items:
        return None
    return stripe.checkout.Session.create(
        mode='payment',
        success_url=success_url,
        cancel_url=cancel_url,
        client_reference_id=str(order.id),
        metadata={
            'type': 'store_order',
            'store_order_id': str(order.id),
            'order_number': order.order_number,
        },
        line_items=line_items,
    )


def site_base_url(request):
    host = request.build_absolute_uri('/').rstrip('/')
    if getattr(settings, 'SERVE_FRONTEND', False):
        return host
    return os.getenv('PUBLIC_SITE_URL', host).rstrip('/')
