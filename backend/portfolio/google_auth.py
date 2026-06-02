"""Verify Google Sign-In ID tokens and create or link customer accounts."""

import os
import re

from django.contrib.auth import get_user_model

from .models import UserSocialAuth

User = get_user_model()


def google_client_id() -> str:
    return os.getenv('GOOGLE_OAUTH_CLIENT_ID', '').strip()


def google_sign_in_enabled() -> bool:
    return bool(google_client_id())


def verify_google_credential(credential: str) -> dict:
    """Validate JWT from Google Identity Services; return token claims."""
    client_id = google_client_id()
    if not client_id:
        raise ValueError('Google sign-in is not configured on this server.')
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
    except Exception as exc:
        raise ValueError(
            'Google sign-in dependency is missing on this server. Install backend requirements and restart.',
        ) from exc
    try:
        return id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            client_id,
        )
    except ValueError as exc:
        raise ValueError('Invalid or expired Google sign-in.') from exc


def _unique_username(base: str) -> str:
    cleaned = re.sub(r'[^\w.@+-]', '', (base or '').strip())[:120] or 'user'
    candidate = cleaned
    suffix = 0
    while User.objects.filter(username=candidate).exists():
        suffix += 1
        candidate = f'{cleaned}{suffix}'
    return candidate


def get_or_create_user_from_google(claims: dict) -> User:
    """Find or create a non-staff customer from verified Google token claims."""
    sub = claims.get('sub')
    email = (claims.get('email') or '').strip().lower()
    if not sub:
        raise ValueError('Google account id missing from token.')

    link = (
        UserSocialAuth.objects.select_related('user')
        .filter(provider=UserSocialAuth.Provider.GOOGLE, provider_uid=sub)
        .first()
    )
    if link:
        user = link.user
        if user.is_staff:
            raise ValueError('Use the admin panel to sign in as staff.')
        return user

    user = None
    if email:
        user = User.objects.filter(email__iexact=email).first()

    if user:
        if user.is_staff:
            raise ValueError('Use the admin panel to sign in as staff.')
        UserSocialAuth.objects.get_or_create(
            user=user,
            provider=UserSocialAuth.Provider.GOOGLE,
            provider_uid=sub,
        )
        if not user.first_name and claims.get('given_name'):
            user.first_name = (claims.get('given_name') or '')[:150]
            user.save(update_fields=['first_name'])
        return user

    if not email:
        raise ValueError('Google did not provide an email for this account.')

    local = email.split('@')[0]
    user = User.objects.create_user(
        username=_unique_username(local),
        email=email,
        first_name=(claims.get('given_name') or claims.get('name') or '')[:150],
        is_staff=False,
    )
    user.set_unusable_password()
    user.save()
    UserSocialAuth.objects.create(
        user=user,
        provider=UserSocialAuth.Provider.GOOGLE,
        provider_uid=sub,
    )
    return user
