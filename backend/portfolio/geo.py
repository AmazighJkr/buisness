"""Server-side client IP and country (no browser CORS)."""

import json
import logging
import os
import urllib.error
import urllib.request

logger = logging.getLogger(__name__)

_GEO_CACHE: dict[str, tuple[str, float]] = {}
_GEO_CACHE_TTL = 3600  # seconds


def client_ip(request) -> str:
    """Best-effort client IP behind Render / reverse proxies."""
    forwarded = (request.META.get('HTTP_X_FORWARDED_FOR') or '').strip()
    if forwarded:
        return forwarded.split(',')[0].strip()
    real = (request.META.get('HTTP_X_REAL_IP') or '').strip()
    if real:
        return real
    return (request.META.get('REMOTE_ADDR') or '').strip()


def _is_private_ip(ip: str) -> bool:
    if not ip:
        return True
    if ip == '::1' or ip.startswith('127.'):
        return True
    if ip.startswith('10.') or ip.startswith('192.168.') or ip.startswith('169.254.'):
        return True
    if ip.startswith('172.'):
        parts = ip.split('.')
        if len(parts) >= 2:
            try:
                second = int(parts[1])
                if 16 <= second <= 31:
                    return True
            except ValueError:
                pass
    return False


def lookup_country_by_ip(ip: str) -> str:
    """ISO country code from IP via ip-api.com (server-side only)."""
    if _is_private_ip(ip):
        return ''

    import time

    now = time.time()
    cached = _GEO_CACHE.get(ip)
    if cached and now - cached[1] < _GEO_CACHE_TTL:
        return cached[0]

    url = f'http://ip-api.com/json/{ip}?fields=status,countryCode'
    try:
        with urllib.request.urlopen(url, timeout=4) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        logger.debug('GeoIP lookup failed for %s: %s', ip, exc)
        return ''

    if data.get('status') != 'success':
        return ''

    code = (data.get('countryCode') or '').strip().upper()
    if len(code) != 2:
        return ''

    _GEO_CACHE[ip] = (code, now)
    return code


def geo_fallback_country() -> str:
    """Optional env when GeoIP is unavailable (e.g. DZ on Render for Algeria store)."""
    cc = os.getenv('GEOIP_FALLBACK_COUNTRY', '').strip().upper()
    return cc if len(cc) == 2 else ''
