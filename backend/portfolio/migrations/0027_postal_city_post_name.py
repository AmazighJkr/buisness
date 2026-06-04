import json
from pathlib import Path

from django.db import migrations


def apply_post_names(apps, schema_editor):
    StoreWilaya = apps.get_model('portfolio', 'StoreWilaya')
    StorePostalCode = apps.get_model('portfolio', 'StorePostalCode')

    seed_path = Path(__file__).resolve().parent.parent / 'data' / 'algeria_postal_seed.json'
    seed_rows = json.loads(seed_path.read_text(encoding='utf-8'))
    wilaya_by_code = {w.code: w for w in StoreWilaya.objects.all()}

    for entry in seed_rows:
        wilaya = wilaya_by_code.get(entry['wilaya_code'])
        if not wilaya:
            continue
        label = (entry.get('city') or entry.get('post_name') or '').strip()
        if not label:
            continue
        StorePostalCode.objects.filter(
            wilaya=wilaya,
            postal_code=entry['postal_code'],
        ).update(city=label[:80])


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0026_resync_postal_from_sql_dataset'),
    ]

    operations = [
        migrations.RunPython(apply_post_names, migrations.RunPython.noop),
    ]
