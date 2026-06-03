"""Build priced layer snapshots for project commands."""

import json
from decimal import Decimal
from uuid import UUID

from django.db.models import Q

from .models import CommandLayer


def parse_layer_ids(raw):
    if raw is None or raw == '':
        return []
    if isinstance(raw, list):
        return [str(x).strip() for x in raw if str(x).strip()]
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError('Invalid layer_ids_json') from exc
        if not isinstance(parsed, list):
            raise ValueError('layer_ids_json must be a JSON array')
        return [str(x).strip() for x in parsed if str(x).strip()]
    raise ValueError('Invalid layer_ids_json')


def build_command_layers_snapshot(layer_ids):
    """
    Resolve layer UUIDs + required layers into a JSON snapshot and totals.
    Returns (rows, total_usd, total_dzd).
    """
    ids = []
    for raw in layer_ids or []:
        try:
            ids.append(str(UUID(str(raw))))
        except (ValueError, TypeError):
            continue

    id_filter = Q(is_required=True)
    if ids:
        id_filter |= Q(id__in=ids)

    layers = CommandLayer.objects.filter(is_active=True).filter(id_filter).order_by(
        'sort_order',
        'name',
    )
    return _snapshot_from_queryset(layers)


def _snapshot_from_queryset(layers_qs):
    rows = []
    total_usd = Decimal('0')
    total_dzd = Decimal('0')
    seen = set()
    for layer in layers_qs:
        lid = str(layer.id)
        if lid in seen:
            continue
        seen.add(lid)
        usd = Decimal(layer.price_usd or 0)
        dzd = Decimal(layer.price_dzd or 0)
        rows.append(
            {
                'id': lid,
                'slug': layer.slug,
                'name': layer.name,
                'group': layer.group,
                'price_usd': str(usd),
                'price_dzd': str(dzd),
            },
        )
        total_usd += usd
        total_dzd += dzd
    return rows, total_usd, total_dzd
