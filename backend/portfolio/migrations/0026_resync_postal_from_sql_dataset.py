import json
from pathlib import Path

from django.db import migrations

from portfolio.data.algeria_wilayas import WILAYAS


def resync_shipping_directory(apps, schema_editor):
    StoreWilaya = apps.get_model('portfolio', 'StoreWilaya')
    StorePostalCode = apps.get_model('portfolio', 'StorePostalCode')

    # Remove 2025 expansion wilayas (59–69) and their postal rows.
    StoreWilaya.objects.filter(code__gt='58').delete()

    for code, name in WILAYAS:
        row, _ = StoreWilaya.objects.update_or_create(
            code=code,
            defaults={'name': name, 'is_active': True},
        )

    wilaya_by_code = {w.code: w for w in StoreWilaya.objects.all()}

    # Keep admin-configured shipping prices when postal code still exists.
    saved: dict[tuple[str, str], dict] = {}
    for row in StorePostalCode.objects.select_related('wilaya').iterator():
        key = (row.wilaya.code, row.postal_code)
        saved[key] = {
            'price_home_dzd': row.price_home_dzd,
            'price_bureau_dzd': row.price_bureau_dzd,
            'is_active': row.is_active,
        }

    StorePostalCode.objects.all().delete()

    seed_path = Path(__file__).resolve().parent.parent / 'data' / 'algeria_postal_seed.json'
    seed_rows = json.loads(seed_path.read_text(encoding='utf-8'))

    batch = []
    for entry in seed_rows:
        wilaya = wilaya_by_code.get(entry['wilaya_code'])
        if not wilaya:
            continue
        key = (entry['wilaya_code'], entry['postal_code'])
        prev = saved.get(key, {})
        batch.append(
            StorePostalCode(
                wilaya=wilaya,
                postal_code=entry['postal_code'],
                city=entry.get('city') or '',
                price_home_dzd=prev.get('price_home_dzd'),
                price_bureau_dzd=prev.get('price_bureau_dzd'),
                is_active=prev.get('is_active', True),
            ),
        )
        if len(batch) >= 500:
            StorePostalCode.objects.bulk_create(batch)
            batch.clear()

    if batch:
        StorePostalCode.objects.bulk_create(batch)


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0025_wilayas_69'),
    ]

    operations = [
        migrations.RunPython(resync_shipping_directory, migrations.RunPython.noop),
    ]
