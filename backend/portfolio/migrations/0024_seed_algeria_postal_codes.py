import json
from pathlib import Path

from django.db import migrations


def seed_postal_codes(apps, schema_editor):
    StoreWilaya = apps.get_model('portfolio', 'StoreWilaya')
    StorePostalCode = apps.get_model('portfolio', 'StorePostalCode')

    path = Path(__file__).resolve().parent.parent / 'data' / 'algeria_postal_seed.json'
    rows = json.loads(path.read_text(encoding='utf-8'))

    wilaya_by_code = {w.code: w for w in StoreWilaya.objects.all()}
    existing = set(
        StorePostalCode.objects.values_list('wilaya_id', 'postal_code'),
    )

    batch = []
    for row in rows:
        wilaya = wilaya_by_code.get(row['wilaya_code'])
        if not wilaya:
            continue
        key = (wilaya.id, row['postal_code'])
        if key in existing:
            continue
        existing.add(key)
        batch.append(
            StorePostalCode(
                wilaya=wilaya,
                postal_code=row['postal_code'],
                city=row.get('city') or '',
                is_active=True,
            ),
        )
        if len(batch) >= 500:
            StorePostalCode.objects.bulk_create(batch)
            batch.clear()

    if batch:
        StorePostalCode.objects.bulk_create(batch)


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0023_bundles_stock_reservations'),
    ]

    operations = [
        migrations.RunPython(seed_postal_codes, migrations.RunPython.noop),
    ]
