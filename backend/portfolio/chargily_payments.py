"""Chargily Pay (Edahabia / CIB) for clients in Algeria — uses DZD prices only."""

import hashlib
import hmac
import json
import os
from decimal import Decimal

from chargily_pay import ChargilyClient
from chargily_pay.entity import Checkout
from chargily_pay import settings as chargily_settings


def chargily_secret_key() -> str:
    return os.getenv('CHARGILY_SECRET_KEY', '').strip()


def chargily_public_key() -> str:
    return os.getenv('CHARGILY_PUBLIC_KEY', '').strip()


def chargily_enabled() -> bool:
    return bool(chargily_secret_key())


def dzd_checkout_amount(amount_dzd) -> int:
    """Whole DZD for Chargily checkout API."""
    value = Decimal(str(amount_dzd))
    if value <= 0:
        return 0
    return max(1, int(value.quantize(Decimal('1'))))


def _client() -> ChargilyClient:
    secret = chargily_secret_key()
    public = chargily_public_key()
    base = (
        chargily_settings.CHARGILIY_TEST_URL
        if secret.startswith('test_')
        else chargily_settings.CHARGILIY_URL
    )
    return ChargilyClient(public, secret, base)


def _metadata_strings(meta: dict) -> dict:
    return {str(k): str(v) for k, v in meta.items() if v is not None and v != ''}


def create_command_chargily_checkout(command, success_url: str, failure_url: str):
    if not chargily_enabled():
        return None
    amount = dzd_checkout_amount(command.quoted_price_dzd)
    if amount <= 0:
        return None
    meta = _metadata_strings({
        'type': 'command',
        'command_id': str(command.id),
        'tracking_code': command.tracking_code,
    })
    checkout = Checkout(
        amount=amount,
        currency='dzd',
        success_url=success_url,
        failure_url=failure_url,
        description=f'EmbeddedGrid command {command.tracking_code}'[:255],
        locale='ar',
        metadata=meta,
    )
    return _client().create_checkout(checkout)


def create_pack_chargily_checkout(
    subscription,
    success_url: str,
    failure_url: str,
    *,
    charge_amount_dzd=None,
    extra_metadata=None,
):
    if not chargily_enabled():
        return None
    pack = subscription.pack
    dzd = Decimal(charge_amount_dzd) if charge_amount_dzd is not None else pack.price_dzd
    amount = dzd_checkout_amount(dzd)
    if amount <= 0:
        return None
    meta = {
        'type': 'subscription',
        'subscription_id': str(subscription.id),
        'pack_id': str(pack.id),
        'user_id': str(subscription.user_id),
    }
    if extra_metadata:
        meta.update(extra_metadata)
    checkout = Checkout(
        amount=amount,
        currency='dzd',
        success_url=success_url,
        failure_url=failure_url,
        description=f'EmbeddedGrid {pack.name}'[:255],
        locale='ar',
        metadata=_metadata_strings(meta),
    )
    return _client().create_checkout(checkout)


def create_store_chargily_checkout(order, success_url: str, failure_url: str):
    if not chargily_enabled():
        return None
    amount = dzd_checkout_amount(order.total_dzd)
    if amount <= 0:
        return None
    meta = _metadata_strings({
        'type': 'store_order',
        'store_order_id': str(order.id),
        'order_number': order.order_number,
    })
    checkout = Checkout(
        amount=amount,
        currency='dzd',
        success_url=success_url,
        failure_url=failure_url,
        description=f'EmbeddedGrid shop {order.order_number}'[:255],
        locale='ar',
        metadata=meta,
    )
    return _client().create_checkout(checkout)


def verify_chargily_signature(signature: str, payload: bytes) -> bool:
    secret = chargily_secret_key()
    if not secret or not signature:
        return False
    computed = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(signature, computed)


def parse_chargily_event(payload: bytes) -> dict:
    return json.loads(payload.decode('utf-8'))


def chargily_checkout_url(response: dict) -> str:
    if not response:
        return ''
    return (
        response.get('checkout_url')
        or response.get('url')
        or (response.get('data') or {}).get('checkout_url')
        or (response.get('data') or {}).get('url')
        or ''
    )
