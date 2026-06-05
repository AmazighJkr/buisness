"""Record staff actions on admin API endpoints for superuser review."""

from __future__ import annotations

import json
import re
from decimal import Decimal
from typing import Any

from django.contrib.auth import get_user_model
from django.http import QueryDict

User = get_user_model()

MUTATING_METHODS = frozenset({'POST', 'PUT', 'PATCH', 'DELETE'})
SKIP_PATH_SUFFIXES = (
    '/api/admin/me/',
    '/api/admin/dashboard/',
    '/api/admin/amazon/search/',
    '/api/admin/audit-log/',
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
    'content',
    'description',
    'idea_description',
    'staff_response',
    'text',
})

RESOURCE_LABELS = {
    'projects': 'project',
    'categories': 'project category',
    'commands': 'command',
    'contact/messages': 'contact message',
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

FIELD_LABELS = {
    'title': 'title',
    'name': 'name',
    'slug': 'slug',
    'status': 'status',
    'payment_status': 'payment',
    'quoted_price': 'quote USD',
    'quoted_price_dzd': 'quote DZD',
    'price_usd': 'USD',
    'price_dzd': 'DZD',
    'price': 'price',
    'stock_qty': 'stock',
    'quantity': 'qty',
    'price_bureau_dzd': 'bureau DZD',
    'price_home_dzd': 'home DZD',
    'price_domicile_dzd': 'domicile DZD',
    'is_active': 'active',
    'is_featured': 'featured',
    'is_free': 'free',
    'is_required': 'required',
    'sort_order': 'sort',
    'featured_order': 'featured order',
    'permissions': 'permissions',
    'layer_ids': 'layers',
    'materials': 'materials',
    'materials_json': 'materials',
    'materials_count': 'materials',
    'layer_ids_count': 'layers',
    'admin_notes': 'notes',
    'shipping_dzd': 'shipping DZD',
    'total_dzd': 'total DZD',
    'wilaya': 'wilaya',
    'postal_code': 'postal',
}

SNAPSHOT_ATTRS = tuple(FIELD_LABELS.keys()) + (
    'order_number',
    'tracking_code',
    'username',
    'client_email',
)

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
_GALLERY_UPLOAD_RE = re.compile(
    r'^/api/admin/store/products/(?P<object_id>[^/]+)/gallery/?$',
    re.IGNORECASE,
)
_ADMIN_PATH_RE = re.compile(
    r'^/api/admin/(?P<resource>command-layer-bundles|command-layers|contact/messages|projects|categories|commands|comments|users|customers|packs|legal|store/categories|store/products|store/orders|store/postal-codes)'
    r'(?:/(?P<object_id>[^/]+))?'
    r'(?:/(?P<subaction>respond|messages|gallery|invoice))?/?$',
    re.IGNORECASE,
)

_AUDIT_FLAG = '_staff_audit_logged'


def mark_audit_logged(request) -> None:
    setattr(request, _AUDIT_FLAG, True)


def is_audit_logged(request) -> bool:
    return bool(getattr(request, _AUDIT_FLAG, False))


def _normalize_snapshot_value(val: Any) -> Any:
    if isinstance(val, Decimal):
        return float(val)
    return val


def snapshot_instance(obj) -> dict[str, Any]:
    if obj is None:
        return {}
    out: dict[str, Any] = {}
    for attr in SNAPSHOT_ATTRS:
        if not hasattr(obj, attr):
            continue
        val = getattr(obj, attr)
        if val is None or val == '':
            continue
        if isinstance(val, (list, tuple)):
            if attr == 'permissions':
                out[attr] = list(val)[:20]
            elif attr == 'layer_ids':
                out['layer_ids_count'] = len(val)
            elif attr == 'materials':
                out['materials_count'] = len(val)
            else:
                out[attr] = val[:10] if len(val) > 10 else val
        else:
            out[attr] = _normalize_snapshot_value(val)
    return out


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


def _querydict_to_dict(qd: QueryDict) -> dict:
    return {k: qd.getlist(k)[0] if len(qd.getlist(k)) == 1 else qd.getlist(k) for k in qd}


def _extract_request_data(request) -> dict:
    data: dict[str, Any] = {}
    if request.POST:
        data.update(_redact(_querydict_to_dict(request.POST)))
    content_type = (request.META.get('CONTENT_TYPE') or '').lower()
    if request.body and 'application/json' in content_type:
        try:
            raw = json.loads(request.body.decode('utf-8'))
            if isinstance(raw, dict):
                data.update(_redact(raw))
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass
    # materials_json etc. from multipart
    for key in ('materials_json', 'wiring_json', 'code_files_json', 'pack_ids_json'):
        if key in data and isinstance(data[key], str):
            try:
                parsed = json.loads(data[key])
                if isinstance(parsed, list):
                    data[f'{key}_count'] = len(parsed)
            except json.JSONDecodeError:
                pass
    return data


def _parse_response_json(response) -> dict | list | None:
    try:
        if not hasattr(response, 'content') or not response.content:
            return None
        if len(response.content) > 64_000:
            return None
        data = json.loads(response.content.decode('utf-8'))
        if isinstance(data, (dict, list)):
            return data
    except (json.JSONDecodeError, UnicodeDecodeError, AttributeError):
        return None
    return None


def _format_value(val: Any) -> str:
    if val is None:
        return '—'
    if isinstance(val, bool):
        return 'yes' if val else 'no'
    if isinstance(val, list):
        return f'[{len(val)} items]'
    s = str(val)
    return s[:40] + '…' if len(s) > 40 else s


def _diff_fields(
    before: dict | None,
    after: dict | None,
    request_data: dict | None = None,
) -> list[str]:
    parts: list[str] = []
    before = before or {}
    after = after or {}
    request_data = request_data or {}

    keys = set(before) | set(after) | set(request_data)
    for key in sorted(keys):
        if key in SENSITIVE_KEYS or key.endswith('_json'):
            continue
        label = FIELD_LABELS.get(key, key)
        b = _normalize_snapshot_value(before.get(key))
        a = _normalize_snapshot_value(after.get(key))
        r = _normalize_snapshot_value(request_data.get(key))
        if b != a and (a is not None or b is not None):
            parts.append(f'{label} {_format_value(b)}→{_format_value(a)}')
        elif r is not None and not before and not after:
            parts.append(f'{label}={_format_value(r)}')
        elif r is not None and b == a and key in request_data:
            parts.append(f'{label}={_format_value(r)}')

    for key in ('materials_json', 'materials_json_count', 'materials_count'):
        if key in request_data or key in after:
            count = request_data.get('materials_json_count') or after.get('materials_count')
            if count is not None:
                parts.append(f'materials ({count} rows)')
                break

    return parts[:12]


def _build_summary(
    username: str,
    action: str,
    resource: str,
    object_label: str,
    change_parts: list[str],
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
    base = f'{username} {verb} {resource_name} {label}'
    if change_parts:
        return f'{base}: {", ".join(change_parts)}'[:500]
    return base[:500]


def _parse_admin_path(path: str, method: str) -> tuple[str, str, str, str]:
    normalized = path if path.endswith('/') else f'{path}/'
    gallery_match = _GALLERY_IMAGE_RE.match(normalized)
    if gallery_match:
        action = ACTION_BY_METHOD.get(method, method.lower())
        return action, 'store/products', gallery_match.group('object_id'), 'gallery-image'

    gallery_upload = _GALLERY_UPLOAD_RE.match(normalized)
    if gallery_upload and method == 'POST':
        return 'upload', 'store/products', gallery_upload.group('object_id'), 'gallery'

    match = _ADMIN_PATH_RE.match(normalized)
    if not match:
        parts = [p for p in path.replace('/api/admin/', '').split('/') if p]
        resource = '/'.join(parts[:2]) if len(parts) >= 2 and parts[0] == 'store' else (parts[0] if parts else 'admin')
        if len(parts) >= 2 and parts[0] == 'store':
            object_id = parts[2] if len(parts) > 2 else ''
            subaction = parts[3] if len(parts) > 3 else ''
        else:
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


def _object_label(
    response_data: dict | list | None,
    object_id: str,
    request_data: dict | None = None,
) -> str:
    if isinstance(response_data, dict):
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
    if request_data:
        for key in ('title', 'name', 'slug', 'order_number', 'tracking_code'):
            val = request_data.get(key)
            if val:
                return str(val)[:120]
    if object_id:
        return object_id[:120]
    if isinstance(response_data, dict):
        rid = response_data.get('id')
        return str(rid)[:120] if rid else ''
    return ''


def _persist_audit(
    request,
    *,
    action: str,
    resource: str,
    object_label: str,
    object_id: str,
    summary: str,
    metadata: dict,
    status_code: int = 200,
) -> None:
    from .models import StaffAuditLog

    StaffAuditLog.objects.create(
        actor=request.user,
        action=action[:32],
        resource=resource[:64],
        object_id=str(object_id)[:64] if object_id else '',
        object_label=object_label[:255],
        summary=summary[:500],
        metadata=metadata,
        method=request.method[:8],
        path=request.path[:255],
        status_code=status_code,
        ip_address=_client_ip(request),
    )


def log_staff_action(
    request,
    *,
    action: str,
    resource: str,
    object_label: str = '',
    object_id: str = '',
    before: dict | None = None,
    after: dict | None = None,
    request_data: dict | None = None,
    response_data: dict | None = None,
    subaction: str = '',
    status_code: int = 200,
) -> None:
    """Explicit audit entry (viewsets / custom actions). Skips middleware duplicate."""
    user = getattr(request, 'user', None)
    if not user or not getattr(user, 'is_authenticated', False) or not user.is_staff:
        return
    try:
        mark_audit_logged(request)
        req_data = _redact(request_data or {})
        change_parts = _diff_fields(before, after, req_data)
        label = object_label or _object_label(response_data, object_id, req_data)
        summary = _build_summary(user.username, action, resource, label, change_parts)
        metadata: dict[str, Any] = {}
        if before:
            metadata['before'] = _redact(before)
        if after:
            metadata['after'] = _redact(after)
        if req_data:
            metadata['request'] = req_data
        if response_data and isinstance(response_data, dict):
            metadata['response'] = _redact({
                k: response_data[k]
                for k in SNAPSHOT_ATTRS
                if k in response_data
            })
        if subaction:
            metadata['subaction'] = subaction
        _persist_audit(
            request,
            action=action,
            resource=resource,
            object_label=label,
            object_id=object_id,
            summary=summary,
            metadata=metadata,
            status_code=status_code,
        )
    except Exception:
        pass


def should_audit_request(request, response) -> bool:
    if is_audit_logged(request):
        return False
    method = request.method
    path = request.path
    if method not in MUTATING_METHODS:
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
    """Middleware fallback for admin routes not covered by explicit logging."""
    if not should_audit_request(request, response):
        return
    try:
        user = request.user
        action, resource, object_id, subaction = _parse_admin_path(request.path, request.method)
        request_data = _extract_request_data(request)
        response_data = _parse_response_json(response)
        label = _object_label(response_data, object_id, request_data)
        after = {}
        if isinstance(response_data, dict):
            after = {k: response_data[k] for k in SNAPSHOT_ATTRS if k in response_data}
        change_parts = _diff_fields(None, after, request_data)
        summary = _build_summary(user.username, action, resource, label, change_parts)
        metadata: dict[str, Any] = {}
        if request_data:
            metadata['request'] = request_data
        if after:
            metadata['after'] = after
        if subaction:
            metadata['subaction'] = subaction
        _persist_audit(
            request,
            action=action,
            resource=resource,
            object_label=label,
            object_id=object_id,
            summary=summary,
            metadata=metadata,
            status_code=response.status_code,
        )
    except Exception:
        pass
