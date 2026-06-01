"""Detect client region for Stripe vs Chargily routing."""

import os


def client_country(request) -> str:
    """ISO 3166-1 alpha-2 country code, or empty if unknown."""
    if os.getenv('CHARGILY_FORCE_ALGERIA', '').strip().lower() in ('1', 'true', 'yes'):
        return 'DZ'

    cc = (request.META.get('HTTP_CF_IPCOUNTRY') or '').strip().upper()
    if len(cc) == 2:
        return cc

    cc = (request.headers.get('X-Client-Country') or '').strip().upper()
    if len(cc) == 2:
        return cc

    cc = (request.query_params.get('country') or request.GET.get('country') or '').strip().upper()
    if len(cc) == 2:
        return cc

    return ''


def is_algeria_request(request) -> bool:
    return client_country(request) == 'DZ'
