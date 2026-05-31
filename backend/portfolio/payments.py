"""Optional Stripe Checkout; manual payment when Stripe is not configured."""

import os
from decimal import Decimal

from django.conf import settings

STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', '').strip()
PAYMENTS_AUTO_CONFIRM = os.getenv('PAYMENTS_AUTO_CONFIRM', '').lower() in ('true', '1', 'yes')
PAYMENT_INSTRUCTIONS = os.getenv(
    'PAYMENT_INSTRUCTIONS',
    'Contact lab@embeddedgrid.dev to complete payment. Include your tracking code.',
).strip()


def stripe_enabled():
    return bool(STRIPE_SECRET_KEY)


def _stripe():
    import stripe

    stripe.api_key = STRIPE_SECRET_KEY
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


def create_pack_checkout_session(subscription, success_url: str, cancel_url: str):
    if not stripe_enabled():
        return None
    pack = subscription.pack
    stripe = _stripe()
    return stripe.checkout.Session.create(
        mode='payment',
        success_url=success_url,
        cancel_url=cancel_url,
        client_reference_id=str(subscription.id),
        metadata={
            'type': 'subscription',
            'subscription_id': str(subscription.id),
            'pack_id': str(pack.id),
            'user_id': str(subscription.user_id),
        },
        line_items=[{
            'quantity': 1,
            'price_data': {
                'currency': os.getenv('PAYMENT_CURRENCY', 'usd'),
                'unit_amount': _money(pack.price),
                'product_data': {
                    'name': pack.name,
                    'description': (pack.description or '')[:200],
                },
            },
        }],
    )


def site_base_url(request):
    host = request.build_absolute_uri('/').rstrip('/')
    if getattr(settings, 'SERVE_FRONTEND', False):
        return host
    return os.getenv('PUBLIC_SITE_URL', host).rstrip('/')
