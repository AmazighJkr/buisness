"""Google reCAPTCHA v2 verification for store checkout."""

import json
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings
from rest_framework.exceptions import ValidationError

_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'


def recaptcha_configured() -> bool:
    return bool(
        getattr(settings, 'RECAPTCHA_SECRET_KEY', '').strip()
        and getattr(settings, 'RECAPTCHA_SITE_KEY', '').strip()
    )


def recaptcha_site_key() -> str:
    return getattr(settings, 'RECAPTCHA_SITE_KEY', '').strip()


def verify_recaptcha(response: str, remote_ip: str | None = None) -> None:
    secret = getattr(settings, 'RECAPTCHA_SECRET_KEY', '').strip()
    if not secret:
        if settings.DEBUG:
            return
        raise ValidationError({'recaptcha': 'reCAPTCHA is not configured on the server.'})

    token = (response or '').strip()
    if not token:
        raise ValidationError({'recaptcha': 'Complétez la vérification reCAPTCHA.'})

    payload = urllib.parse.urlencode({
        'secret': secret,
        'response': token,
        'remoteip': remote_ip or '',
    }).encode()

    try:
        req = urllib.request.Request(_VERIFY_URL, data=payload, method='POST')
        with urllib.request.urlopen(req, timeout=10) as res:
            data = json.loads(res.read().decode())
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError) as exc:
        raise ValidationError({
            'recaptcha': 'Impossible de vérifier reCAPTCHA. Réessayez.',
        }) from exc

    if not data.get('success'):
        raise ValidationError({'recaptcha': 'Échec de la vérification reCAPTCHA. Réessayez.'})
