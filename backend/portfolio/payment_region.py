"""Detect client region for Stripe vs Chargily routing."""

import os

from .geo import client_ip, geo_fallback_country, lookup_country_by_ip


def client_country(request) -> str:
    """ISO 3166-1 alpha-2 country code, or empty if unknown."""
    if os.getenv('CHARGILY_FORCE_ALGERIA', '').strip().lower() in ('1', 'true', 'yes'):
        return 'DZ'

    # Browser/client hint (VPN users who chose a region in UI).
    cc = (request.headers.get('X-Client-Country') or '').strip().upper()
    if len(cc) == 2:
        return cc

    cc = (request.query_params.get('country') or request.GET.get('country') or '').strip().upper()
    if len(cc) == 2:
        return cc

    cc = (request.META.get('HTTP_CF_IPCOUNTRY') or '').strip().upper()
    if len(cc) == 2:
        return cc

    ip = client_ip(request)
    cc = lookup_country_by_ip(ip)
    if len(cc) == 2:
        return cc

    return geo_fallback_country()


def is_algeria_request(request) -> bool:
    return client_country(request) == 'DZ'


def explicit_payment_provider(request) -> str:
    """stripe | chargily from client when UI already chose a provider."""
    raw = (
        request.headers.get('X-Payment-Provider')
        or request.query_params.get('provider')
        or request.GET.get('provider')
        or ''
    ).strip().lower()
    if raw in ('stripe', 'chargily'):
        return raw
    return ''
