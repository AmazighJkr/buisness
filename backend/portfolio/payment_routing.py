"""Choose Stripe (international) vs Chargily (Algeria)."""

from .chargily_payments import (
    chargily_checkout_url,
    chargily_enabled,
    create_command_chargily_checkout,
    create_pack_chargily_checkout,
    create_store_chargily_checkout,
)
from .payment_region import explicit_payment_provider, is_algeria_request
from .payments import (
    create_command_checkout_session,
    create_pack_checkout_session,
    create_store_checkout_session,
    stripe_enabled,
)


def payment_provider_for_request(request) -> str:
    """
    chargily — Algeria (DZD, Edahabia/CIB)
    stripe — rest of world (card)
    manual — no provider configured for this region
    """
    chosen = explicit_payment_provider(request)
    if chosen == 'chargily' and chargily_enabled():
        return 'chargily'
    if chosen == 'stripe' and stripe_enabled():
        return 'stripe'

    if is_algeria_request(request) and chargily_enabled():
        return 'chargily'
    if stripe_enabled():
        return 'stripe'
    return 'manual'


def start_command_checkout(request, command, success_url: str, cancel_url: str):
    provider = payment_provider_for_request(request)
    if provider == 'chargily':
        resp = create_command_chargily_checkout(command, success_url, cancel_url)
        return provider, chargily_checkout_url(resp)
    if provider == 'stripe':
        session = create_command_checkout_session(command, success_url, cancel_url)
        return provider, session.url if session else None
    return provider, None


def start_pack_checkout(
    request,
    subscription,
    success_url: str,
    cancel_url: str,
    *,
    charge_amount=None,
    charge_amount_dzd=None,
    extra_metadata=None,
):
    provider = payment_provider_for_request(request)
    if provider == 'chargily':
        resp = create_pack_chargily_checkout(
            subscription,
            success_url,
            cancel_url,
            charge_amount_dzd=charge_amount_dzd,
            extra_metadata=extra_metadata,
        )
        return provider, chargily_checkout_url(resp)
    if provider == 'stripe':
        session = create_pack_checkout_session(
            subscription,
            success_url,
            cancel_url,
            charge_amount=charge_amount,
            extra_metadata=extra_metadata,
        )
        return provider, session.url if session else None
    return provider, None


def start_store_checkout(request, order, success_url: str, cancel_url: str):
    provider = payment_provider_for_request(request)
    if provider == 'chargily':
        resp = create_store_chargily_checkout(order, success_url, cancel_url)
        return provider, chargily_checkout_url(resp)
    if provider == 'stripe':
        session = create_store_checkout_session(order, success_url, cancel_url)
        return provider, session.url if session else None
    return provider, None
