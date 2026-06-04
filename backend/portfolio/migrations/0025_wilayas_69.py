from django.db import migrations

from portfolio.data.algeria_wilayas import NEW_WILAYA_POSTAL, WILAYAS


def sync_wilayas(apps, schema_editor):
    StoreWilaya = apps.get_model('portfolio', 'StoreWilaya')
    for code, name in WILAYAS:
        row, created = StoreWilaya.objects.get_or_create(
            code=code,
            defaults={'name': name, 'is_active': True},
        )
        if not created and row.name != name:
            row.name = name
            row.is_active = True
            row.save(update_fields=['name', 'is_active'])


def seed_new_wilaya_postal(apps, schema_editor):
    StoreWilaya = apps.get_model('portfolio', 'StoreWilaya')
    StorePostalCode = apps.get_model('portfolio', 'StorePostalCode')
    wilaya_by_code = {w.code: w for w in StoreWilaya.objects.all()}

    for wilaya_code, postal_code, city in NEW_WILAYA_POSTAL:
        wilaya = wilaya_by_code.get(wilaya_code)
        if not wilaya:
            continue
        StorePostalCode.objects.get_or_create(
            wilaya=wilaya,
            postal_code=postal_code,
            defaults={'city': city, 'is_active': True},
        )


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0024_seed_algeria_postal_codes'),
    ]

    operations = [
        migrations.RunPython(sync_wilayas, migrations.RunPython.noop),
        migrations.RunPython(seed_new_wilaya_postal, migrations.RunPython.noop),
    ]
