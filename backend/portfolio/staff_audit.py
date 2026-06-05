"""Record staff actions on admin API endpoints for superuser review."""

from __future__ import annotations

import json
import re
from typing import Any

from django.contrib.auth import get_user_model

User = get_user_model()

MUTATING_METHODS = frozenset({'POST', 'PUT', 'PATCH', 'DELETE'})
SKIP_PATH_SUFFIXES = (
    '/api/admin/me/',
    '/api/admin/dashboard/',
    '/api/admin/amazon/search/',
)
SENSITIVE_KEYS = frozenset({
    'password',
    'current_password',
    'new_password',
    'token',
    'refresh',
    'access',
    'recaptcha_response',
    'credential',
})

RESOURCE_LABELS = {
    'projects': 'project',
    'categories': 'category',
    'commands': 'command',
    'comments': 'comment',
    'users': 'staff account',
    'customers': 'customer',
    'packs': 'subscription pack',
    'command-layers': 'command layer',
    'command-layer-bundles': 'command layer bundle',
    'store/categories': 'store category',
    'store/products': 'store product',
    'store/orders': 'store order',
    'store/postal-codes': 'postal code',
    'legal': 'legal page',
    'gallery': 'product gallery',
}

ACTION_BY_METHOD = {
    'POST': 'create',
    'PUT': 'update',
    'PATCH': 'update',
    'DELETE': 'delete',
}

_GALLERY_IMAGE_RE = re.compile(
    r'^/api/admin/store/products/(?P<object_id>[^/]+)/gallery/(?P<image_id>[^/]+)/?$',
    re.IGNORECASE,
)
_ADMIN_PATH_RE = re.compile(
    r'^/api/admin/(?P<resource>command-layer-bundles|command-layers|projects|categories|commands|comments|users|customers|packs|legal|store/categories|store/products|store/orders|store/postal-codes)'
    r'(?:/(?P<object_id>[^/]+))?'
    r'(?:/(?P<subaction>respond|messages|gallery|invoice))?/?$',
    re.IGNORECASE,
)


def _client_ip(request) -> str:
    forwarded = (request.META.get('HTTP_X_FORWARDED_FOR') or '').split(',')[0].strip()
    if forwarded:
        return forwarded[:64]
    return (request.META.get('REMOTE_ADDR') or '')[:64]


def _redact(data: Any) -> Any:
    if isinstance(data, dict):
        return {
            k: '***' if str(k).lower() in SENSITIVE_KEYS else _redact(v)
            for k, v in data.items()
        }
    if isinstance(data, list):
        return [_redact(item) for item in data[:20]]
    return data


def _parse_response_json(response) -> dict | list | None:
    try:
        if not hasattr(response, 'content') or not response.content:
            return None
        if len(response.content) > 32_000:
            return None
        data = json.loads(response.content.decode('utf-8'))
        if isinstance(data, (dict, list)):
            return data
    except (json.JSONDecodeError, UnicodeDecodeError, AttributeError):
        return None
    return None


def _request_payload(request) -> dict:
    payload: dict[str, Any] = {}
    if request.POST:
        payload['form'] = _redact(request.POST.dict())
    if request.FILES:
        payload['files'] = list(request.FILES.keys())[:10]
    content_type = (request.META.get('CONTENT_TYPE') or '').lower()
    if 'application/json' in content_type and request.body:
        try:
            raw = json.loads(request.body.decode('utf-8'))
            if isinstance(raw, dict):
                payload['json'] = _redact(raw)
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass
    return payload


def _parse_admin_path(path: str, method: str) -> tuple[str, str, str, str]:
    """Return action, resource_key, object_id, subaction."""
    normalized = path if path.endswith('/') else f'{path}/'
    gallery_match = _GALLERY_IMAGE_RE.match(normalized)
    if gallery_match:
        action = ACTION_BY_METHOD.get(method, method.lower())
        return action, 'store/products', gallery_match.group('object_id'), 'gallery-image'

    match = _ADMIN_PATH_RE.match(normalized)
    if not match:
        # Fallback for odd paths
        parts = [p for p in path.replace('/api/admin/', '').split('/') if p]
        resource = parts[0] if parts else 'admin'
        object_id = parts[1] if len(parts) > 1 else ''
        subaction = parts[2] if len(parts) > 2 else ''
        if method == 'GET' and subaction == 'invoice':
            action = 'invoice'
        else:
            action = ACTION_BY_METHOD.get(method, method.lower())
        return action, resource, object_id, subaction

    resource = match.group('resource') or 'admin'
    object_id = match.group('object_id') or ''
    subaction = match.group('subaction') or ''
    if method == 'GET' and subaction == 'invoice':
        action = 'invoice'
    else:
        action = ACTION_BY_METHOD.get(method, method.lower())
    if subaction == 'respond':
        action = 'respond'
    elif subaction == 'messages':
        action = 'message'
    elif subaction == 'gallery' and method == 'POST':
        action = 'upload'
    elif subaction == 'gallery' and method == 'DELETE':
        action = 'delete'
    elif subaction == 'invoice':
        action = 'invoice'
    return action, resource, object_id, subaction


def _object_label(response_data: dict | list | None, object_id: str) -> str:
    if not isinstance(response_data, dict):
        return object_id[:36] if object_id else ''
    for key in (
        'order_number',
        'title',
        'name',
        'username',
        'slug',
        'tracking_code',
        'client_email',
    ):
        val = response_data.get(key)
        if val:
            return str(val)[:120]
    if object_id:
        return object_id[:36]
    rid = response_data.get('id')
    return str(rid)[:36] if rid else ''


def _build_summary(
    username: str,
    action: str,
    resource: str,
    object_label: str,
    payload: dict,
) -> str:
    resource_name = RESOURCE_LABELS.get(resource, resource.replace('/', ' '))
    label = object_label or 'item'
    verb = {
        'create': 'created',
        'update': 'updated',
        'delete': 'deleted',
        'respond': 'responded to',
        'message': 'messaged',
        'upload': 'uploaded gallery image for',
        'invoice': 'downloaded invoice for',
    }.get(action, action)

    extra = ''
    form = payload.get('json') or payload.get('form') or {}
    if isinstance(form, dict):
        if form.get('status'):
            extra = f" → status {form['status']}"
        elif form.get('payment_status'):
            extra = f" → payment {form['payment_status']}"

    return f'{username} {verb} {resource_name} {label}{extra}'.strip()


def should_audit_request(request, response) -> bool:
    method = request.method
    path = request.path
    if method not in MUTATING_METHODS:
        # Log sensitive reads (e.g. invoice download) for staff accountability.
        if method == 'GET' and '/invoice' in path and '/api/admin/' in path:
            pass
        else:
            return False
    if '/api/admin/' not in path:
        return False
    for suffix in SKIP_PATH_SUFFIXES:
        if path.rstrip('/').endswith(suffix.rstrip('/')):
            return False
    if response.status_code >= 400:
        return False
    user = getattr(request, 'user', None)
    if not user or not getattr(user, 'is_authenticated', False) or not user.is_staff:
        return False
    return True


def record_staff_audit(request, response) -> None:
    """Persist one audit row; never raises."""
    if not should_audit_request(request, response):
        return
    try:
        from .models import StaffAuditLog

        user = request.user
        action, resource, object_id, subaction = _parse_admin_path(request.path, request.method)
        payload = _request_payload(request)
        response_data = _parse_response_json(response)
        label = _object_label(response_data, object_id)
        summary = _build_summary(user.username, action, resource, label, payload)

        metadata: dict[str, Any] = {}
        if payload:
            metadata['request'] = payload
        if isinstance(response_data, dict):
            metadata['response'] = _redact({
                k: response_data[k]
                for k in (
                    'id',
                    'status',
                    'payment_status',
                    'order_number',
                    'title',
                    'name',
                    'username',
                    'slug',
                    'tracking_code',
                )
                if k in response_data
            })
        if subaction:
            metadata['subaction'] = subaction

        StaffAuditLog.objects.create(
            actor=user,
            action=action[:32],
            resource=resource[:64],
            object_id=str(object_id)[:64] if object_id else '',
            object_label=label[:255],
            summary=summary[:500],
            metadata=metadata,
            method=request.method[:8],
            path=request.path[:255],
            status_code=response.status_code,
            ip_address=_client_ip(request),
        )
    except Exception:
        pass
