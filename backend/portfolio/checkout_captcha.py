"""Signed math captcha for store checkout (no external service required)."""

import random

from django.core import signing
from django.core.exceptions import ValidationError

_CAPTCHA_SALT = 'eg-store-checkout-captcha'
_MAX_AGE_SECONDS = 600


def issue_captcha() -> dict:
    a = random.randint(2, 12)
    b = random.randint(2, 12)
    token = signing.dumps(
        {'a': a, 'b': b},
        salt=_CAPTCHA_SALT,
        compress=True,
    )
    return {
        'token': token,
        'question': f'{a} + {b}',
    }


def verify_captcha(token: str, answer: str) -> None:
    if not token or answer is None or str(answer).strip() == '':
        raise ValidationError({'captcha': 'Complétez la vérification de sécurité.'})
    try:
        data = signing.loads(token, salt=_CAPTCHA_SALT, max_age=_MAX_AGE_SECONDS)
    except signing.BadSignature as exc:
        raise ValidationError({'captcha': 'Vérification expirée. Actualisez et réessayez.'}) from exc
    try:
        expected = int(data['a']) + int(data['b'])
        given = int(str(answer).strip())
    except (TypeError, ValueError, KeyError) as exc:
        raise ValidationError({'captcha': 'Saisissez un nombre valide pour la vérification.'}) from exc
    if given != expected:
        raise ValidationError({'captcha': 'Réponse incorrecte à la vérification de sécurité.'})
